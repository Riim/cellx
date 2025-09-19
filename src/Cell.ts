import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { WaitError } from './WaitError';
import { afterRelease } from './afterRelease';
import { autorun } from './autorun';
import { config } from './config';
import { KEY_LISTENER_WRAPPERS } from './keys';
import { reaction } from './reaction';
import { release } from './release';
import { DependencyFilter } from './track';
import { transact } from './transact';
import { fastIndexOf } from './utils/fastIndexOf';
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

export enum CellState {
	ACTUAL = 'actual',
	DIRTY = 'dirty',
	CHECK = 'check'
}

export const Cell_CommonState = {
	pendingCells: [] as Array<Cell>,
	pendingCellsIndex: 0,

	afterRelease: null as Array<Function> | null,

	currentCell: null as Cell | null,

	inUntrackedCounter: 0,
	inTrackedCounter: 0,

	lastUpdateId: 0,

	transaction: null as {
		primaryCells: Map<Cell, any>;
		secondaryCells: Set<Cell>;
	} | null
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

	static readonly transact = transact;

	readonly context: Context;

	readonly meta: Meta;

	protected _pull: TCellPull<Value, Context, Meta> | null;
	protected _dependencyFilter: (dependency: Cell) => any;

	protected _validateValue: ((nextValue: Value, value: Value | undefined) => void) | null;
	protected _put: TCellPut<Value, Context, Meta> | null;
	protected _compareValues: (nextValue: Value, value: Value | undefined) => boolean;

	protected _reap: (() => void) | null;

	protected _dependencies: Array<Cell> | null | undefined;
	protected _dependents: Array<Cell> = [];

	protected _value: Value | undefined;
	protected _error$: Cell<Error | null> | null = null;
	protected _error: Error | null = null;

	get error() {
		return Cell_CommonState.currentCell
			? (this._error$ ?? (this._error$ = new Cell({ value: this._error }))).get()
			: this._error;
	}

	protected _state: CellState;

	get state() {
		return this._state;
	}

	protected _inited: boolean;

	get inited() {
		return this._inited;
	}

	// active = dependencies && (dependents || listeners)
	protected _active = false;

	get active() {
		return this._active;
	}

	protected _currentlyPulling = false;

	get currentlyPulling() {
		return this._currentlyPulling;
	}

	protected _updateId = -1;

	protected _bound = false;

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

		if (this._pull) {
			this._dependencies = undefined;
			this._value = undefined;
			this._state = CellState.DIRTY;
			this._inited = false;
		} else {
			let value = options.value;

			this._validateValue?.(value!, undefined);

			this._dependencies = null;
			this._value = value;
			this._state = CellState.ACTUAL;
			this._inited = true;

			if (isEventEmitterLike(value)) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (options.onChange) {
			this.on('change', options.onChange);
		}
		if (options.onError) {
			this.on('error', options.onError);
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
		if (this._dependencies !== null) {
			this.actualize();
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
		if (this._dependencies !== null) {
			this.actualize();
		}

		let hasListeners =
			this._$listeners.has(Cell.EVENT_CHANGE) || this._$listeners.has(Cell.EVENT_ERROR);

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
			this._dependents.length == 0 &&
			(this._$listeners.size == 0 ||
				(!this._$listeners.has(Cell.EVENT_CHANGE) &&
					!this._$listeners.has(Cell.EVENT_ERROR)))
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
		this._dependents.push(dependent);

		this._activate();
	}

	protected _deleteDependent(dependent: Cell) {
		this._dependents.splice(fastIndexOf(this._dependents, dependent), 1);

		if (
			this._dependents.length == 0 &&
			(this._$listeners.size == 0 ||
				(!this._$listeners.has(Cell.EVENT_CHANGE) &&
					!this._$listeners.has(Cell.EVENT_ERROR)))
		) {
			this._deactivate();

			this._reap?.call(this.context);
		}
	}

	protected _activate() {
		if (this._active) {
			return;
		}

		let dependencies = this._dependencies;

		if (dependencies) {
			for (let i = 0; ; i++) {
				dependencies[i]._addDependent(this);

				if (i + 1 == dependencies.length) {
					break;
				}
			}

			this._state = CellState.ACTUAL;

			this._active = true;
		}
	}

	protected _deactivate() {
		let dependencies = this._dependencies;

		if (dependencies) {
			for (let i = 0; ; i++) {
				dependencies[i]._deleteDependent(this);

				if (i + 1 == dependencies.length) {
					break;
				}
			}

			this._state = CellState.DIRTY;

			this._active = false;
		}
	}

	protected _onValueChange(evt: IEvent) {
		this._updateId = ++Cell_CommonState.lastUpdateId;

		let dependents = this._dependents;

		for (let i = 0; i < dependents.length; i++) {
			dependents[i]._addToRelease(true);
		}

		this.emit('change', { sourceEvent: evt });
	}

	protected _addToRelease(dirty: boolean) {
		this._state = dirty ? CellState.DIRTY : CellState.CHECK;

		Cell_CommonState.transaction?.secondaryCells.add(this);

		let dependents = this._dependents;

		if (dependents.length != 0) {
			for (let i = 0; ; i++) {
				if (dependents[i]._state == CellState.ACTUAL) {
					dependents[i]._addToRelease(false);
				}

				if (i + 1 == dependents.length) {
					break;
				}
			}
		} else {
			if (Cell_CommonState.pendingCells.push(this) == 1) {
				nextTick(release);
			}
		}
	}

	actualize() {
		if (this._state == CellState.DIRTY) {
			this.pull();
		} else if (this._state == CellState.CHECK) {
			let dependencies = this._dependencies!;

			for (let i = 0; ; i++) {
				if (dependencies[i].actualize()._error) {
					this._fail(dependencies[i]._error);

					break;
				}

				// @ts-expect-error
				if (this._state == CellState.DIRTY) {
					this.pull();

					break;
				}

				if (i + 1 == dependencies.length) {
					this._state = CellState.ACTUAL;

					break;
				}
			}
		}

		return this;
	}

	get value() {
		return this.get();
	}
	set value(value: Value) {
		this.set(value);
	}

	get(): Value {
		if (this._state != CellState.ACTUAL && this._updateId != Cell_CommonState.lastUpdateId) {
			this.actualize();
		}

		let { currentCell } = Cell_CommonState;

		if (currentCell?._dependencyFilter(this)) {
			if (currentCell._dependencies) {
				if (fastIndexOf(currentCell._dependencies, this) == -1) {
					currentCell._dependencies.push(this);
				}
			} else {
				currentCell._dependencies = [this];
			}
		}

		if (this._error && (currentCell || !(this._error instanceof WaitError))) {
			throw this._error;
		}

		return this._value!;
	}

	pull() {
		if (!this._pull) {
			return false;
		}

		if (this._currentlyPulling) {
			throw TypeError('Circular pulling');
		}

		this._currentlyPulling = true;

		let prevDependencies = this._dependencies;
		this._dependencies = null;

		let prevCell = Cell_CommonState.currentCell;
		Cell_CommonState.currentCell = this;

		let value: any;

		try {
			if (this._pull.length == 0) {
				value = (this._pull as Function).call(this.context);
			} else {
				if (!this._bound) {
					this.push = this.push.bind(this);
					this.fail = this.fail.bind(this);

					this._bound = true;
				}

				value = this._pull.call(this.context, this, this._value);
			}

			if (isPromiseLike(value)) {
				value.then(
					(value) => this._push(value),
					(err) => this._fail(err)
				);

				$error = { error: new WaitError() };
				value = $error;
			}
		} catch (err) {
			$error = { error: err };
		}

		Cell_CommonState.currentCell = prevCell;

		this._currentlyPulling = false;

		if (
			this._dependents.length != 0 ||
			this._$listeners.has(Cell.EVENT_CHANGE) ||
			this._$listeners.has(Cell.EVENT_ERROR)
		) {
			let dependencies = this._dependencies as Array<Cell> | null;
			let newDependencyCount = 0;

			if (dependencies) {
				for (let i = 0; ; i++) {
					let dependency = dependencies[i];

					if (!prevDependencies || fastIndexOf(prevDependencies, dependency) == -1) {
						dependency._addDependent(this);
						newDependencyCount++;
					}

					if (i + 1 == dependencies.length) {
						break;
					}
				}
			}

			if (
				prevDependencies &&
				(!dependencies ||
					dependencies.length - newDependencyCount < prevDependencies.length)
			) {
				for (let i = 0; ; i++) {
					if (!dependencies || fastIndexOf(dependencies, prevDependencies[i]) == -1) {
						prevDependencies[i]._deleteDependent(this);
					}

					if (i + 1 == prevDependencies.length) {
						break;
					}
				}
			}

			if (dependencies) {
				if (!prevDependencies) {
					this._active = true;
				}
			} else {
				this._state = CellState.ACTUAL;
				this._active = false;
			}
		} else {
			this._state = this._dependencies ? CellState.DIRTY : CellState.ACTUAL;
		}

		return $error ? this._fail($error.error, true) : this._push(value, true);
	}

	set(value: Value) {
		if (!this._inited) {
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
		return this._push(value);
	}

	_push(value: Value, fromPull?: boolean) {
		this._inited = true;

		let err = this._error;

		if (err) {
			this._error$?.set(err);
			this._error = err;
		}

		let prevValue = this._value;
		let changed = !this._compareValues(value, prevValue);

		if (changed) {
			this._value = value;

			if (
				Cell_CommonState.transaction &&
				!Cell_CommonState.transaction.primaryCells.has(this)
			) {
				Cell_CommonState.transaction.primaryCells.set(this, prevValue);
			}

			if (isEventEmitterLike(prevValue)) {
				prevValue.off('change', this._onValueChange, this);
			}
			if (isEventEmitterLike(value)) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (this._active) {
			this._state = CellState.ACTUAL;
		}

		this._updateId = fromPull ? Cell_CommonState.lastUpdateId : ++Cell_CommonState.lastUpdateId;

		if (changed || err instanceof WaitError) {
			let dependents = this._dependents;

			for (let i = 0; i < dependents.length; i++) {
				dependents[i]._addToRelease(true);
			}

			if (changed) {
				this.emit(Cell.EVENT_CHANGE, {
					prevValue,
					value
				});
			}
		}

		return changed;
	}

	fail(err: any) {
		return this._fail(err);
	}

	_fail(err: any, fromPull?: boolean) {
		this._inited = true;

		let isWaitError = err instanceof WaitError;

		if (!isWaitError && !(err instanceof Error)) {
			err = Error(err);
		}

		this._error$?.set(err);
		this._error = err;

		if (this._active) {
			this._state = CellState.ACTUAL;
		}

		this._updateId = fromPull ? Cell_CommonState.lastUpdateId : ++Cell_CommonState.lastUpdateId;

		if (!isWaitError && $error) {
			$error = null;

			// try {
			if (this.meta?.['id'] !== undefined) {
				config.logError(`[${this.meta?.['id']}]`, err);
			} else {
				config.logError(err);
			}
			// } catch (err) {
			// 	nextTick(() => {
			// 		throw err;
			// 	});
			// }
		}

		this.emit(Cell.EVENT_ERROR, { error: err });

		return isWaitError;
	}

	wait(): never {
		throw new WaitError();
	}

	reap() {
		this.off();

		this._error$?.reap();

		let dependents = this._dependents;

		for (let i = 0; i < dependents.length; i++) {
			dependents[i].reap();
		}

		return this;
	}

	dispose() {
		return this.reap();
	}
}
