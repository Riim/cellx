import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { WaitError } from './WaitError';
import { afterRelease } from './afterRelease';
import { autorun } from './autorun';
import { config } from './config';
import { effect } from './effect';
import { KEY_LISTENER_WRAPPERS } from './keys';
import { release } from './release';
import { DependencyFilter } from './track';
import { transact } from './transact';
import { fastIndexOf } from './utils/fastIndexOf';
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
	next: Value,
	value: Value | undefined
) => void;

export interface ICellOptions<Value = any, Context = any, Meta = any> {
	context?: Context;
	meta?: Meta;
	pullFn?: TCellPull<Value, Context, Meta>;
	dependencyFilter?: (dep: Cell) => any;
	validate?: (next: Value, value: Value | undefined) => void;
	put?: TCellPut<Value, Context, Meta>;
	compareValues?: (next: Value, value: Value | undefined) => boolean;
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

const $error = { error: Error() };

export class Cell<Value = any, Context = any, Meta = any> extends EventEmitter {
	static readonly EVENT_CHANGE = 'change';
	static readonly EVENT_ERROR = 'error';

	static get currentlyPulling() {
		return Cell_CommonState.currentCell != null;
	}

	static readonly autorun = autorun;
	static readonly effect = effect;

	static readonly release = release;

	static readonly afterRelease = afterRelease;

	static override readonly transact = transact;

	readonly context: Context;

	readonly meta: Meta;

	protected _pullFn: TCellPull<Value, Context, Meta> | null;
	protected _dependencyFilter: (dep: Cell) => any;

	protected _validateValue: ((next: Value, value: Value | undefined) => void) | null;
	protected _putFn: TCellPut<Value, Context, Meta> | null;
	protected _compareValues: (next: Value, value: Value | undefined) => boolean;

	protected _reap: (() => void) | null;

	protected _dependencies: Array<Cell> | null | undefined;
	protected _reactions: Array<Cell> = [];

	protected _value: Value | undefined;
	protected _error$: Cell<Error | null> | null = null;
	protected _error: Error | null = null;
	protected _lastErrorEvent: IEvent | null = null;

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

	// active = deps && (reactions || listeners)
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

		this._pullFn = options.pullFn ?? null;
		this._dependencyFilter = options.dependencyFilter ?? DependencyFilter.allExceptUntracked;

		this._validateValue = options.validate ?? null;
		this._putFn = options.put ?? null;
		this._compareValues = options.compareValues ?? config.compareValues;

		this._reap = options.reap ?? null;

		if (this._pullFn) {
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

			if (value instanceof EventEmitter) {
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
			this._reactions.length == 0 &&
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

	protected _addReaction(reaction: Cell) {
		this._reactions.push(reaction);

		this._activate();
	}

	protected _deleteReaction(reaction: Cell) {
		this._reactions.splice(fastIndexOf(this._reactions, reaction), 1);

		if (
			this._reactions.length == 0 &&
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

		let deps = this._dependencies;

		if (deps) {
			for (let i = 0; ; i++) {
				deps[i]._addReaction(this);

				if (i + 1 == deps.length) {
					break;
				}
			}

			this._state = CellState.ACTUAL;

			this._active = true;
		}
	}

	protected _deactivate() {
		let deps = this._dependencies;

		if (deps) {
			for (let i = 0; ; i++) {
				deps[i]._deleteReaction(this);

				if (i + 1 == deps.length) {
					break;
				}
			}

			this._state = CellState.DIRTY;

			this._active = false;
		}
	}

	protected _onValueChange(evt: IEvent) {
		this._updateId = ++Cell_CommonState.lastUpdateId;

		let reactions = this._reactions;

		for (let i = 0; i < reactions.length; i++) {
			reactions[i]._addToRelease(true);
		}

		this.handleEvent(evt);
	}

	protected _addToRelease(dirty: boolean) {
		this._state = dirty ? CellState.DIRTY : CellState.CHECK;

		Cell_CommonState.transaction?.secondaryCells.add(this);

		let reactions = this._reactions;

		if (reactions.length != 0) {
			for (let i = 0; ; i++) {
				if (reactions[i]._state == CellState.ACTUAL) {
					reactions[i]._addToRelease(false);
				}

				if (i + 1 == reactions.length) {
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
			let deps = this._dependencies!;

			for (let i = 0; ; i++) {
				deps[i].actualize();

				// @ts-expect-error
				if (this._state == CellState.DIRTY) {
					this.pull();

					break;
				}

				if (i + 1 == deps.length) {
					this._state = CellState.ACTUAL;

					break;
				}
			}
		}
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

		return this._value as Value;
	}

	pull() {
		if (!this._pullFn) {
			return false;
		}

		if (this._currentlyPulling) {
			throw TypeError('Circular pulling');
		}

		this._currentlyPulling = true;

		let prevDeps = this._dependencies;
		this._dependencies = null;

		let prevCell = Cell_CommonState.currentCell;
		Cell_CommonState.currentCell = this;

		let value: any;

		try {
			if (this._pullFn.length == 0) {
				value = (this._pullFn as Function).call(this.context);
			} else {
				if (!this._bound) {
					this.push = this.push.bind(this);
					this.fail = this.fail.bind(this);

					this._bound = true;
				}

				value = this._pullFn.call(this.context, this, this._value);
			}

			if (value instanceof Promise) {
				value.then(
					(value) => this.push(value),
					(err) => this.fail(err)
				);

				$error.error = new WaitError();
				value = $error;
			}
		} catch (err) {
			$error.error = err;
			value = $error;
		}

		Cell_CommonState.currentCell = prevCell;

		this._currentlyPulling = false;

		if (
			this._reactions.length != 0 ||
			this._$listeners.has(Cell.EVENT_CHANGE) ||
			this._$listeners.has(Cell.EVENT_ERROR)
		) {
			let deps = this._dependencies as Array<Cell> | null;
			let newDepCount = 0;

			if (deps) {
				for (let i = 0; ; i++) {
					let dep = deps[i];

					if (!prevDeps || fastIndexOf(prevDeps, dep) == -1) {
						dep._addReaction(this);
						newDepCount++;
					}

					if (i + 1 == deps.length) {
						break;
					}
				}
			}

			if (prevDeps && (!deps || deps.length - newDepCount < prevDeps.length)) {
				for (let i = 0; ; i++) {
					if (!deps || fastIndexOf(deps, prevDeps[i]) == -1) {
						prevDeps[i]._deleteReaction(this);
					}

					if (i + 1 == prevDeps.length) {
						break;
					}
				}
			}

			if (deps) {
				if (!prevDeps) {
					this._active = true;
				}
			} else {
				this._state = CellState.ACTUAL;
				this._active = false;
			}
		} else {
			this._state = this._dependencies ? CellState.DIRTY : CellState.ACTUAL;
		}

		return value === $error ? this.fail($error.error, true) : this.push(value, true);
	}

	set(value: Value) {
		if (!this._inited) {
			// Не инициализированная ячейка не может иметь State.CHECK, поэтому сразу pull вместо
			// actualize.
			this.pull();
		}

		this._validateValue?.(value, this._value);

		if (this._putFn) {
			if (!this._bound) {
				this.push = this.push.bind(this);
				this.fail = this.fail.bind(this);

				this._bound = true;
			}

			if (this._putFn.length >= 3) {
				this._putFn.call(this.context, this, value, this._value);
			} else {
				(this._putFn as Function).call(this.context, this, value);
			}
		} else {
			this.push(value);
		}

		return this;
	}

	push(value: Value, _afterPull?: boolean) {
		this._inited = true;

		let err = this._error;

		if (err) {
			this._setError(null, !!_afterPull);
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

			if (prevValue instanceof EventEmitter) {
				prevValue.off('change', this._onValueChange, this);
			}
			if (value instanceof EventEmitter) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (this._active) {
			this._state = CellState.ACTUAL;
		}

		this._updateId = _afterPull
			? Cell_CommonState.lastUpdateId
			: ++Cell_CommonState.lastUpdateId;

		if (changed || err instanceof WaitError) {
			let reactions = this._reactions;

			for (let i = 0; i < reactions.length; i++) {
				reactions[i]._addToRelease(true);
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

	fail(err: any, _afterPull?: boolean) {
		this._inited = true;

		let isWaitError = err instanceof WaitError;

		if (!isWaitError) {
			if (this.meta?.['id'] !== undefined) {
				config.logError('[' + this.meta?.['id'] + ']', err);
			} else {
				config.logError(err);
			}

			if (!(err instanceof Error)) {
				err = Error(err);
			}
		}

		this._setError(
			{
				target: this,
				type: Cell.EVENT_ERROR,
				data: { error: err as Error }
			},
			!!_afterPull
		);

		if (this._active) {
			this._state = CellState.ACTUAL;
		}

		return isWaitError;
	}

	protected _setError(errorEvent: IEvent<{ error: Error }> | null, afterPull: boolean) {
		if (this._lastErrorEvent === errorEvent) {
			return;
		}

		let err = errorEvent && errorEvent.data.error;

		this._error$?.set(err);
		this._error = err;
		this._lastErrorEvent = errorEvent;

		this._updateId = afterPull
			? Cell_CommonState.lastUpdateId
			: ++Cell_CommonState.lastUpdateId;

		if (errorEvent) {
			this.handleEvent(errorEvent);
		}

		let reactions = this._reactions;

		for (let i = 0; i < reactions.length; i++) {
			reactions[i]._setError(errorEvent, afterPull);
		}
	}

	wait(): never {
		throw new WaitError();
	}

	reap() {
		this.off();

		this._error$?.reap();

		let reactions = this._reactions;

		for (let i = 0; i < reactions.length; i++) {
			reactions[i].reap();
		}

		return this;
	}

	dispose() {
		return this.reap();
	}
}
