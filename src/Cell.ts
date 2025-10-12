import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { WaitError } from './WaitError';
import { afterRelease } from './afterRelease';
import { autorun } from './autorun';
import { config } from './config';
import { KEY_ERROR_EVENT, KEY_LISTENER_WRAPPERS } from './keys';
import { reaction } from './reaction';
import { release } from './release';
import { DependencyFilter } from './track';
import { isEventEmitterLike } from './utils/isEventEmitterLike';
import { isPromiseLike } from './utils/isPromiseLike';
import { nextTick } from './utils/nextTick';

export type CellValue<T> = T extends Cell<infer U> ? U : T;

export interface ICellChangeEvent<Target extends Cell = Cell>
	extends IEvent<
		{
			value: CellValue<Target>;
			prevValue: CellValue<Target>;
		},
		Target
	> {
	type: typeof Cell.EVENT_CHANGE;
}

export interface ICellErrorEvent<Target extends Cell = Cell>
	extends IEvent<{ error: Error }, Target> {
	type: typeof Cell.EVENT_ERROR;
}

export type TCellEvent<Target extends Cell = Cell> =
	| ICellChangeEvent<Target>
	| ICellErrorEvent<Target>;

export type TCellChangeEventListener<Target extends Cell = Cell, Context = any> = TListener<
	ICellChangeEvent<Target>,
	Context
>;

export type TCellErrorEventListener<Target extends Cell = Cell, Context = any> = TListener<
	ICellErrorEvent<Target>,
	Context
>;

export type TCellEventListener<Target extends Cell = Cell, Context = any> =
	| TCellChangeEventListener<Target, Context>
	| TCellErrorEventListener<Target, Context>;

export interface ICellListeners<Target extends Cell = Cell, Context = any> {
	[Cell.EVENT_CHANGE]?: TCellChangeEventListener<Target, Context>;
	[Cell.EVENT_ERROR]?: TCellErrorEventListener<Target, Context>;
}

export type TCellPull<Value = any, Context = any, Meta = any> = (
	this: Context,
	cell: Cell<Value, Context, Meta>,
	value: Value | undefined
) => Value;

export type TCellPut<Value = any, Context = any, Meta = any> = (
	this: Context,
	cell: Cell<Value, Context, Meta>,
	nextValue: Value,
	value: Value | undefined
) => void;

export interface ICellOptions<Value = any, Context = any, Meta = any> {
	context?: Context;
	meta?: Meta;
	writable?: boolean;
	pull?: TCellPull<Value, Context, Meta>;
	dependencyFilter?: (dep: Cell) => any;
	validate?: (nextValue: Value, value: Value | undefined) => void;
	put?: TCellPut<Value, Context, Meta>;
	compareValues?: (nextValue: Value, value: Value | undefined) => boolean;
	reap?: (this: Context) => void;
	value?: Value;
	onChange?: TCellChangeEventListener<Cell<Value, any, Meta>>;
	onError?: TCellErrorEventListener<Cell<Value, any, Meta>>;
}

export interface IDependencyList {
	cell: Cell;
	_nextDependency: IDependencyList | null;
	state: number;
}

export interface IDependentList {
	cell: Cell;
	_nextDependent: IDependentList | null;
	prevDependents: IDependentList | null;
}

export enum CellState {
	ACTUAL = 'actual',
	DIRTY = 'dirty',
	CHECK = 'check'
}

export const Cell_CommonState = {
	pendingCells: [] as Array<Cell>,
	pendingCellsIndex: 0,

	currentCell: null as Cell | null,

	lastUpdateId: 0,

	afterRelease: null as Array<Function> | null,

	transactionStates: null as Map<
		Cell,
		{
			value: any;
			error: Error | null;
			state: CellState;
			updateId: number;
		}
	> | null,

	inUntrackedCounter: 0,
	inTrackedCounter: 0
};

let $error: { error: any } | null = null;

export class Cell<Value = any, Context = any, Meta = any> extends EventEmitter {
	static readonly EVENT_CHANGE = 'change';
	static readonly EVENT_ERROR = 'error';

	static get currentlyPulling() {
		return Cell_CommonState.currentCell != null;
	}

	static readonly autorun = autorun;
	static readonly reaction = reaction;

	static readonly release = release;
	static readonly afterRelease = afterRelease;

	readonly context: Context;

	readonly meta: Meta;

	protected _writable: boolean;

	get writable() {
		return this._writable;
	}

	protected _pull: TCellPull<Value, Context, Meta> | null;
	protected _dependencyFilter: (dependency: Cell) => any;

	protected _validateValue: ((nextValue: Value, value: Value | undefined) => void) | null;
	protected _put: TCellPut<Value, Context, Meta> | null;
	protected _compareValues: (nextValue: Value, value: Value | undefined) => boolean;

	protected _reap: (() => void) | null;

	protected _nextDependency: IDependencyList | null | undefined;
	protected _currentDependency: IDependencyList | null = null;
	protected _nextDependent: IDependentList | null = null;
	protected _lastDependent: IDependentList | null = null;

	getDependencies() {
		let dependencies: Array<Cell> = [];

		for (
			let dependency = this._nextDependency;
			dependency;
			dependency = dependency._nextDependency
		) {
			dependencies.push(dependency.cell);
		}

		return dependencies;
	}

	getDependents() {
		let dependents: Array<Cell> = [];

		for (let dependent = this._nextDependent; dependent; dependent = dependent._nextDependent) {
			dependents.push(dependent.cell);
		}

		return dependents;
	}

	protected _value: Value | undefined;
	protected _error$: Cell<Error | null> | null = null;
	protected _error: Error | null = null;

	protected _bound = false;

	protected _initialized: boolean;

	get initialized() {
		return this._initialized;
	}

	// active = dependencies && (dependents || listeners)
	protected _active = false;

	get active() {
		return this._active;
	}

	protected _state: CellState;

	get state() {
		return this._state;
	}

	protected _currentlyPulling = false;

	protected _updateId = -1;

	constructor(options: ICellOptions<Value, Context, Meta>) {
		super();

		this.context = (options.context ?? null) as Context;

		this.meta = (options.meta ?? null) as Meta;

		this._pull = options.pull ?? null;
		this._dependencyFilter = options.dependencyFilter ?? DependencyFilter.allExceptUntracked;

		this._validateValue = options.validate ?? null;
		this._put = options.put ?? null;
		this._compareValues = options.compareValues ?? config.compareValues;

		this._reap = options.reap ?? null;

		let { value } = options;

		if (this._pull) {
			if (value !== undefined) {
				this._validateValue?.(value, undefined);

				if (isEventEmitterLike(value)) {
					value.on('change', this._onValueChange, this);
				}
			}

			this._writable = options.writable ?? !!this._put;
			this._nextDependency = undefined;
			this._initialized = false;
			this._state = CellState.DIRTY;

			if (this._pull.length != 0) {
				this.push = this.push.bind(this);
				this.fail = this.fail.bind(this);

				this._bound = true;
			}
		} else {
			this._validateValue?.(value!, undefined);

			if (isEventEmitterLike(value)) {
				value.on('change', this._onValueChange, this);
			}

			this._writable = options.writable ?? true;
			this._nextDependency = null;
			this._initialized = true;
			this._state = CellState.ACTUAL;
		}

		this._value = value;

		if (options.onChange) {
			this.on(Cell.EVENT_CHANGE, options.onChange);
		}
		if (options.onError) {
			this.on(Cell.EVENT_ERROR, options.onError);
		}
	}

	override on<C>(
		type: typeof Cell.EVENT_CHANGE,
		listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	): this;
	override on<C>(
		type: typeof Cell.EVENT_ERROR,
		listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	): this;
	override on<C>(
		listeners: ICellListeners<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	): this;
	override on(type: string | ICellListeners, listener?: any, context?: any) {
		if (this._nextDependency !== null) {
			this._actualize();
		}

		if (typeof type == 'object') {
			super.on(
				type as Record<any, TListener>,
				listener !== undefined ? listener : this.context
			);
		} else {
			super.on(type, listener, context !== undefined ? context : this.context);
		}

		this._activate();

		return this;
	}

	override off<C>(
		type: typeof Cell.EVENT_CHANGE,
		listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	): this;
	override off<C>(
		type: typeof Cell.EVENT_ERROR,
		listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	): this;
	override off<C>(
		listeners?: ICellListeners<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	): this;
	override off(type?: string | ICellListeners, listener?: any, context?: any) {
		if (this._nextDependency !== null) {
			this._actualize();
		}

		let hasListeners =
			this._listeners.has(Cell.EVENT_CHANGE) || this._listeners.has(Cell.EVENT_ERROR);

		if (type) {
			if (typeof type == 'object') {
				super.off(
					type as Record<any, TListener>,
					listener !== undefined ? listener : this.context
				);
			} else {
				super.off(type, listener, context !== undefined ? context : this.context);
			}
		} else {
			super.off();
		}

		if (
			hasListeners &&
			!this._nextDependent &&
			(this._listeners.size == 0 ||
				(!this._listeners.has(Cell.EVENT_CHANGE) && !this._listeners.has(Cell.EVENT_ERROR)))
		) {
			this._deactivate();

			this._reap?.call(this.context);
		}

		return this;
	}

	onChange<C>(
		listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	) {
		return this.on(Cell.EVENT_CHANGE, listener, context);
	}

	offChange<C>(
		listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	) {
		return this.off(Cell.EVENT_CHANGE, listener, context);
	}

	onError<C>(
		listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	) {
		return this.on(Cell.EVENT_ERROR, listener, context);
	}

	offError<C>(
		listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>,
		context?: C
	) {
		return this.off(Cell.EVENT_ERROR, listener, context);
	}

	subscribe<C>(
		listener: (
			this: C extends undefined ? (typeof this)['context'] : C,
			err: Error | null,
			evt: TCellEvent<this>
		) => any,
		context?: C
	) {
		let wrappers: Map<Cell, TListener> =
			listener[KEY_LISTENER_WRAPPERS] ?? (listener[KEY_LISTENER_WRAPPERS] = new Map());

		if (wrappers.has(this)) {
			return this;
		}

		function wrapper(this: any, evt: any) {
			return listener.call(this, evt.data['error'] ?? null, evt);
		}
		wrappers.set(this, wrapper);

		// eslint-disable-next-line
		if (context === undefined) {
			context = this.context as any;
		}

		return this.on(Cell.EVENT_CHANGE, wrapper, context).on(Cell.EVENT_ERROR, wrapper, context);
	}

	unsubscribe<C>(
		listener: (
			this: C extends undefined ? (typeof this)['context'] : C,
			err: Error | null,
			evt: TCellEvent<this>
		) => any,
		context?: C
	) {
		let wrappers: Map<Cell, TListener> | undefined = listener[KEY_LISTENER_WRAPPERS];
		let wrapper = wrappers?.get(this);

		if (!wrapper) {
			return this;
		}

		wrappers!.delete(this);

		// eslint-disable-next-line
		if (context === undefined) {
			context = this.context as any;
		}

		return this.off(Cell.EVENT_CHANGE, wrapper, context).off(
			Cell.EVENT_ERROR,
			wrapper,
			context
		);
	}

	protected _addDependent(dependent: Cell) {
		(this._lastDependent ?? (this as unknown as IDependentList))._nextDependent =
			this._lastDependent = {
				cell: dependent,
				_nextDependent: null,
				prevDependents: null
			};

		this._activate();
	}

	protected _deleteDependent(dependent: Cell) {
		let currentDependent = this._nextDependent;

		if (currentDependent!.cell == dependent) {
			if (!(this._nextDependent = currentDependent!._nextDependent)) {
				this._lastDependent = null;
			}
		} else {
			for (let prevDependent: IDependentList; ; ) {
				prevDependent = currentDependent!;
				currentDependent = currentDependent!._nextDependent;

				if (!currentDependent) {
					break;
				}

				if (currentDependent.cell == dependent) {
					if (!(prevDependent._nextDependent = currentDependent._nextDependent)) {
						this._lastDependent = prevDependent;
					}

					break;
				}
			}
		}

		if (
			!this._nextDependent &&
			(this._listeners.size == 0 ||
				(!this._listeners.has(Cell.EVENT_CHANGE) && !this._listeners.has(Cell.EVENT_ERROR)))
		) {
			this._deactivate();

			this._reap?.call(this.context);
		}
	}

	protected _activate() {
		if (this._active) {
			return;
		}

		let dependency = this._nextDependency;

		if (dependency) {
			do {
				dependency.cell._addDependent(this);
			} while ((dependency = dependency._nextDependency));

			this._active = true;
			this._state = CellState.ACTUAL;
		}
	}

	protected _deactivate() {
		let dependency = this._nextDependency;

		if (dependency) {
			do {
				dependency.cell._deleteDependent(this);
			} while ((dependency = dependency._nextDependency));

			this._active = false;
			this._state = CellState.DIRTY;
		}
	}

	protected _onValueChange(evt: IEvent) {
		this._updateId = ++Cell_CommonState.lastUpdateId;

		this._addToRelease();

		this.emit(Cell.EVENT_CHANGE, { sourceEvent: evt });
	}

	protected _addToRelease() {
		let directDependents = this._nextDependent;

		if (!directDependents) {
			return;
		}

		for (let stack: IDependentList | null = directDependents; ; ) {
			let dependents = stack;

			stack = stack.prevDependents;
			dependents.prevDependents = null;

			for (
				let dependent: IDependentList | null = dependents;
				dependent;
				dependent = dependent._nextDependent
			) {
				let dirty = dependents == directDependents;
				let { cell } = dependent;

				if (cell._state == CellState.ACTUAL) {
					cell._state = dirty ? CellState.DIRTY : CellState.CHECK;

					if (cell._nextDependent) {
						cell._nextDependent.prevDependents = stack;
						stack = cell._nextDependent;

						if (
							(cell._listeners.has(Cell.EVENT_CHANGE) ||
								cell._listeners.has(Cell.EVENT_ERROR)) &&
							Cell_CommonState.pendingCells.push(cell) == 1
						) {
							nextTick(release);
						}
					} else {
						if (Cell_CommonState.pendingCells.push(cell) == 1) {
							nextTick(release);
						}
					}
				} else if (dirty) {
					cell._state = CellState.DIRTY;
				}
			}

			if (!stack) {
				break;
			}
		}
	}

	actualize() {
		if (Cell_CommonState.transactionStates) {
			throw Error('Cannot actualize in a transaction');
		}

		return this._actualize();
	}

	_actualize() {
		if (this._state == CellState.CHECK) {
			// eslint-disable-next-line
			for (let dependency: IDependencyList | null | undefined = this._nextDependency!; ; ) {
				if (dependency.cell._actualize()._error) {
					this._fail(dependency.cell._error);

					break;
				}

				// @ts-expect-error
				if (this._state == CellState.DIRTY) {
					this.pull();

					break;
				}

				if (!(dependency = dependency._nextDependency)) {
					this._error$?.set(null);
					this._error = null;
					this._state = CellState.ACTUAL;

					break;
				}
			}
		} else if (this._state == CellState.DIRTY) {
			this.pull();
		}

		return this;
	}

	get value() {
		return this.get();
	}
	set value(value: Value) {
		this.set(value);
	}

	get error() {
		if (Cell_CommonState.transactionStates) {
			if (!this._initialized) {
				throw Error('Cannot read an uninitialized cell in a transaction');
			}

			return this._error;
		}

		if (this._state != CellState.ACTUAL && this._updateId != Cell_CommonState.lastUpdateId) {
			this._actualize();
		}

		return Cell_CommonState.currentCell
			? (this._error$ ?? (this._error$ = new Cell({ value: this._error }))).get()
			: this._error;
	}

	get(): Value {
		if (Cell_CommonState.transactionStates) {
			if (!this._initialized) {
				throw Error('Cannot read an uninitialized cell in a transaction');
			}

			return this._value!;
		}

		if (this._state != CellState.ACTUAL && this._updateId != Cell_CommonState.lastUpdateId) {
			this._actualize();
		}

		let { currentCell } = Cell_CommonState;

		if (currentCell?._dependencyFilter(this)) {
			let currentDependency = currentCell._currentDependency;

			if (currentDependency) {
				let dependency = currentDependency._nextDependency;

				if (dependency) {
					if (dependency.cell == this) {
						currentCell._currentDependency = dependency;
						dependency.state = 0;
					} else {
						if (currentDependency.cell != this) {
							for (let prevDependency: IDependencyList; ; ) {
								prevDependency = dependency;

								if ((dependency = dependency._nextDependency)) {
									if (dependency.cell == this) {
										prevDependency._nextDependency = dependency._nextDependency;
										dependency._nextDependency =
											currentDependency._nextDependency;
										currentDependency._nextDependency =
											currentCell._currentDependency = dependency;
										dependency.state = 0;

										break;
									}
								} else {
									for (
										dependency = currentCell._nextDependency!;
										;
										dependency = dependency._nextDependency!
									) {
										if (dependency == currentDependency) {
											currentDependency._nextDependency =
												currentCell._currentDependency = {
													cell: this,
													_nextDependency:
														currentDependency._nextDependency,
													state: 1
												};

											break;
										}

										if (dependency.cell == this) {
											break;
										}
									}

									break;
								}
							}
						}
					}
				} else {
					if (currentDependency.cell != this) {
						for (
							dependency = currentCell._nextDependency!;
							;
							dependency = dependency._nextDependency!
						) {
							if (dependency == currentDependency) {
								currentDependency._nextDependency = currentCell._currentDependency =
									{
										cell: this,
										_nextDependency: null,
										state: 1
									};

								break;
							}

							if (dependency.cell == this) {
								break;
							}
						}
					}
				}
			} else {
				let dependency = currentCell._nextDependency as IDependencyList | null;

				if (dependency) {
					if (dependency.cell == this) {
						currentCell._currentDependency = dependency;
						dependency.state = 0;
					} else {
						for (let prevDependency = dependency; ; ) {
							dependency = dependency._nextDependency;

							if (!dependency) {
								currentCell._nextDependency = currentCell._currentDependency = {
									cell: this,
									_nextDependency: currentCell._nextDependency!,
									state: 1
								};

								break;
							}

							if (dependency.cell == this) {
								prevDependency._nextDependency = dependency._nextDependency;
								dependency._nextDependency = currentCell._nextDependency!;
								currentCell._nextDependency = currentCell._currentDependency =
									dependency;
								dependency.state = 0;

								break;
							}

							prevDependency = dependency;
						}
					}
				} else {
					currentCell._nextDependency = currentCell._currentDependency = {
						cell: this,
						_nextDependency: null,
						state: 1
					};
				}
			}
		}

		if (this._error && currentCell) {
			throw this._error;
		}

		return this._value!;
	}

	pull() {
		if (!this._pull) {
			return false;
		}

		if (Cell_CommonState.transactionStates) {
			throw Error('Cannot call a pull in a transaction');
		}

		if (this._currentlyPulling) {
			throw Error('Circular pulling');
		}

		let dependency = this._nextDependency;

		if (dependency) {
			do {
				dependency.state = -1;
			} while ((dependency = dependency._nextDependency));
		} else if (dependency === undefined) {
			this._nextDependency = null;
		}

		this._currentlyPulling = true;

		let prevCell = Cell_CommonState.currentCell;
		Cell_CommonState.currentCell = this;

		let value: any;

		$error = null;

		try {
			value = this._bound
				? this._pull.call(this.context, this, this._value)
				: (this._pull as Function).call(this.context);

			if (isPromiseLike(value)) {
				value.then(
					(value) => this._push(value),
					(err) => this._fail(err)
				);

				$error = { error: new WaitError() };
			}
		} catch (err) {
			$error = { error: err };
		}

		Cell_CommonState.currentCell = prevCell;

		this._currentlyPulling = false;

		this._currentDependency = null;

		if (
			this._nextDependent ||
			this._listeners.has(Cell.EVENT_CHANGE) ||
			this._listeners.has(Cell.EVENT_ERROR)
		) {
			for (
				let holder = this as unknown as IDependencyList, dependency = this._nextDependency;
				dependency;

			) {
				if (dependency.state == -1) {
					dependency.cell._deleteDependent(this);

					dependency = holder._nextDependency = dependency._nextDependency;
				} else {
					if (dependency.state == 1) {
						// dependency.state = 0;
						dependency.cell._addDependent(this);
					}

					holder = dependency;
					dependency = dependency._nextDependency;
				}
			}

			if (this._nextDependency) {
				// state = ACTUAL проставится в push() или fail()
				this._active = true;
			} else {
				this._active = false;
				this._state = CellState.ACTUAL;
			}
		} else {
			this._state = this._nextDependency ? CellState.DIRTY : CellState.ACTUAL;
		}

		return $error ? this._fail($error.error, true) : this._push(value, true);
	}

	set(value: Value) {
		if (!this._writable) {
			throw Error('Cannot write to a non-writable cell');
		}

		if (!this._initialized) {
			// Не инициализированная ячейка не может иметь State.CHECK, поэтому сразу pull вместо
			// actualize.
			this.pull();
		}

		this._validateValue?.(value, this._value);

		if (this._put) {
			if (!this._bound) {
				this.push = this.push.bind(this);
				this.fail = this.fail.bind(this);

				this._bound = true;
			}

			if (this._put.length >= 3) {
				this._put.call(this.context, this, value, this._value);
			} else {
				(this._put as Function).call(this.context, this, value);
			}
		} else {
			this._push(value);
		}

		return this;
	}

	push(value: Value) {
		if (Cell_CommonState.transactionStates) {
			throw Error('Cannot call a push in a transaction');
		}

		return this._push(value);
	}

	_push(value: Value, fromPull?: boolean) {
		this._initialized = true;

		let prevValue = this._value;
		let err = this._error;

		if (Cell_CommonState.transactionStates && !Cell_CommonState.transactionStates.has(this)) {
			Cell_CommonState.transactionStates.set(this, {
				value: prevValue,
				error: err,
				state: this._state,
				updateId: this._updateId
			});
		}

		let changed = !this._compareValues(value, prevValue);

		if (changed) {
			this._value = value;

			if (isEventEmitterLike(prevValue)) {
				prevValue.off('change', this._onValueChange, this);
			}
			if (isEventEmitterLike(value)) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (err) {
			this._error$?.set(null);
			this._error = null;
		}

		if (this._active) {
			this._state = CellState.ACTUAL;
		}

		this._updateId = fromPull ? Cell_CommonState.lastUpdateId : ++Cell_CommonState.lastUpdateId;

		if (changed) {
			this._addToRelease();

			if (!Cell_CommonState.transactionStates) {
				this.emit(Cell.EVENT_CHANGE, {
					value,
					prevValue
				});
			}
		}

		return changed;
	}

	fail(err: any) {
		if (Cell_CommonState.transactionStates) {
			throw Error('Cannot call a fail in a transaction');
		}

		return this._fail(err);
	}

	_fail(err: any, fromPull?: boolean) {
		this._initialized = true;

		if (!(err instanceof Error)) {
			err = Error(err);
		}

		this._error$?.set(err);
		this._error = err;

		if (this._active) {
			this._state = CellState.ACTUAL;
		}

		this._updateId = fromPull ? Cell_CommonState.lastUpdateId : ++Cell_CommonState.lastUpdateId;

		let isWaitError = err instanceof WaitError;

		if (!isWaitError && $error) {
			$error = null;

			if (this.meta?.['id'] !== undefined) {
				config.logError(`[${this.meta?.['id']}]`, err);
			} else {
				config.logError(err);
			}
		}

		this.triggerEvent(
			err[KEY_ERROR_EVENT] ??
				(err[KEY_ERROR_EVENT] = {
					target: this,
					type: Cell.EVENT_ERROR,
					data: { error: err }
				})
		);

		return isWaitError;
	}

	wait(): never {
		throw new WaitError();
	}

	reap() {
		this.off();

		this._error$?.reap();

		for (let dependent = this._nextDependent; dependent; dependent = dependent._nextDependent) {
			dependent.cell.reap();
		}

		return this;
	}

	dispose() {
		return this.reap();
	}
}
