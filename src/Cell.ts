import { EventEmitter, IEvent } from './EventEmitter';
import { WaitError } from './WaitError';
import { config } from './config';
import { fastIndexOf } from './utils/fastIndexOf';
import { nextTick } from './utils/nextTick';

export type TCellPull<TValue = any, TContext = any, TMeta = any> = (
	this: TContext,
	cell: Cell<TValue, TContext, TMeta>,
	value: TValue | undefined
) => TValue;

export type TCellPut<TValue = any, TContext = any, TMeta = any> = (
	this: TContext,
	cell: Cell<TValue, TContext, TMeta>,
	next: TValue,
	value: TValue | undefined
) => void;

export interface ICellOptions<TValue = any, TContext = any, TMeta = any> {
	debugKey?: string;
	context?: TContext;
	meta?: TMeta;
	slippery?: boolean;
	sticky?: boolean;
	pull?: TCellPull<TValue, TContext, TMeta>;
	validate?: (next: TValue, value: TValue | undefined) => void;
	put?: TCellPut<TValue, TContext, TMeta>;
	compareValues?: (next: TValue, value: TValue | undefined) => boolean;
	reap?: (this: TContext) => void;
	value?: TValue;
	onChange?: Function;
	onError?: Function;
}

export enum CellState {
	ACTUAL = 'actual',
	DIRTY = 'dirty',
	CHECK = 'check'
}

export interface ICellChangeEvent<T extends Cell = Cell> extends IEvent<any, T> {
	type: typeof Cell.EVENT_CHANGE;
	data: {
		prevValue: any;
		value: any;
	};
}

export interface ICellErrorEvent<T extends Cell = Cell> extends IEvent<any, T> {
	type: typeof Cell.EVENT_ERROR;
	data: { error: any };
}

export type TCellEvent<T extends Cell = Cell> = ICellChangeEvent<T> | ICellErrorEvent<T>;

const KEY_LISTENER_WRAPPERS = Symbol('listenerWrappers');

const pendingCells: Array<Cell> = [];
let pendingCellsIndex = 0;

let afterRelease: Array<Function> | null;

let currentCell: Cell | null = null;

const $error: { error: Error | null } = { error: null };

let lastUpdationId = 0;

let transaction: {
	primaryCells: Map<Cell, any>;
	secondaryCells: Set<Cell>;
} | null = null;

function release() {
	while (pendingCellsIndex < pendingCells.length) {
		let cell = pendingCells[pendingCellsIndex++];

		if (cell._active) {
			cell.actualize();
		}
	}

	pendingCells.length = 0;
	pendingCellsIndex = 0;

	if (afterRelease) {
		let afterRelease_ = afterRelease;

		afterRelease = null;

		for (let i = 0; i < afterRelease_.length; i++) {
			afterRelease_[i]();
		}
	}
}

export class Cell<TValue = any, TContext = any, TMeta = any> extends EventEmitter {
	static EVENT_CHANGE = 'change';
	static EVENT_ERROR = 'error';

	static get currentlyPulling() {
		return currentCell != null;
	}

	static autorun<TValue = any, TContext = any, TMeta = any>(
		cb: (value: TValue | undefined, disposer: () => void) => TValue,
		cellOptions?: ICellOptions<TValue, TContext, TMeta>
	) {
		let disposer: (() => void) | undefined;

		new Cell(
			function (cell, value) {
				return cb.call(
					this,
					value,
					(disposer ??= () => {
						cell.dispose();
					})
				);
			},
			cellOptions?.onChange
				? cellOptions
				: {
						...cellOptions,
						onChange: () => {}
					}
		);

		return disposer!;
	}

	static release() {
		release();
	}

	static afterRelease(cb: Function) {
		(afterRelease ?? (afterRelease = [])).push(cb);
	}

	static override transact(cb: Function) {
		if (transaction) {
			cb();

			return;
		}

		if (pendingCells.length != 0) {
			release();
		}

		transaction = {
			primaryCells: new Map(),
			secondaryCells: new Set()
		};

		try {
			cb();
		} catch (err) {
			for (let [cell, value] of transaction.primaryCells) {
				cell._value = value;
			}
			for (let cell of transaction.secondaryCells) {
				cell._state = CellState.ACTUAL;
			}

			pendingCells.length = 0;
			pendingCellsIndex = 0;

			transaction = null;

			throw err;
		}

		transaction = null;

		if (pendingCells.length != 0) {
			release();
		}
	}

	debugKey: string | undefined;

	context: TContext;

	meta: TMeta | null;

	_slippery: boolean;
	_sticky: boolean;

	_pull: TCellPull<TValue, TContext, TMeta> | null;

	_validate: ((next: TValue, value: TValue | undefined) => void) | null;
	_put: TCellPut<TValue, TContext, TMeta> | null;
	_compareValues: (next: TValue, value: TValue | undefined) => boolean;

	_reap: (() => void) | null;

	_dependencies: Array<Cell> | null | undefined;
	_reactions: Array<Cell> = [];

	_value: TValue | undefined;
	_errorCell: Cell<Error | null> | null = null;
	_error: Error | null = null;
	_lastErrorEvent: IEvent | null = null;

	get error() {
		return currentCell
			? (this._errorCell ?? (this._errorCell = new Cell(this._error))).get()
			: this._error;
	}

	_state: CellState;

	get state() {
		return this._state;
	}

	_inited: boolean;
	// active = deps && (reactions || listeners)
	_active = false;
	_currentlyPulling = false;
	_updationId = -1;

	_bound = false;

	constructor(
		value: TCellPull<TValue, TContext, TMeta>,
		options?: ICellOptions<TValue, TContext, TMeta>
	);
	constructor(value: TValue, options?: ICellOptions<TValue, TContext, TMeta>);
	constructor(
		value: TValue | TCellPull<TValue, TContext, TMeta>,
		options?: ICellOptions<TValue, TContext, TMeta>
	) {
		super();

		this.debugKey = options?.debugKey;

		this.context = (options?.context ?? null) as TContext;

		this.meta = options?.meta ?? null;

		this._slippery = options?.slippery ?? false;
		this._sticky = options?.sticky ?? false;

		this._pull = options?.pull ?? (typeof value == 'function' ? (value as any) : null);

		this._validate = options?.validate ?? null;
		this._put = options?.put ?? null;
		this._compareValues = options?.compareValues ?? config.compareValues;

		this._reap = options?.reap ?? null;

		if (this._pull) {
			this._dependencies = undefined;
			this._value = undefined;
			this._state = CellState.DIRTY;
			this._inited = false;
		} else {
			this._dependencies = null;

			if (options?.value !== undefined) {
				value = options.value;
			}

			this._validate?.(value as TValue, undefined);

			this._value = value as TValue;

			this._state = CellState.ACTUAL;
			this._inited = true;

			if (value instanceof EventEmitter) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (options) {
			if (options.onChange) {
				this.on('change', options.onChange);
			}
			if (options.onError) {
				this.on(Cell.EVENT_ERROR, options.onError);
			}
		}
	}

	override on(
		type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR,
		listener: Function,
		context?: any
	): this;
	override on(
		listeners: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, Function>,
		context?: any
	): this;
	override on(type: string | Record<string, Function>, listener?: any, context?: any) {
		if (this._dependencies !== null) {
			this.actualize();
		}

		if (typeof type == 'object') {
			super.on(type, listener !== undefined ? listener : this.context);
		} else {
			super.on(type, listener, context !== undefined ? context : this.context);
		}

		this._activate();

		return this;
	}

	override off(
		type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR,
		listener: Function,
		context?: any
	): this;
	override off(
		listeners?: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, Function>,
		context?: any
	): this;
	override off(type?: string | Record<string, Function>, listener?: any, context?: any) {
		if (this._dependencies !== null) {
			this.actualize();
		}

		let hasListeners =
			this._$listeners.has(Cell.EVENT_CHANGE) || this._$listeners.has(Cell.EVENT_ERROR);

		if (type) {
			if (typeof type == 'object') {
				super.off(type, listener !== undefined ? listener : this.context);
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

	onChange(listener: Function, context?: any) {
		return this.on(Cell.EVENT_CHANGE, listener, context !== undefined ? context : this.context);
	}

	offChange(listener: Function, context?: any) {
		return this.off(
			Cell.EVENT_CHANGE,
			listener,
			context !== undefined ? context : this.context
		);
	}

	onError(listener: Function, context?: any) {
		return this.on(Cell.EVENT_ERROR, listener, context !== undefined ? context : this.context);
	}

	offError(listener: Function, context?: any) {
		return this.off(Cell.EVENT_ERROR, listener, context !== undefined ? context : this.context);
	}

	subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any) {
		let wrappers: Map<Cell, Function> =
			listener[KEY_LISTENER_WRAPPERS] ?? (listener[KEY_LISTENER_WRAPPERS] = new Map());

		if (wrappers.has(this)) {
			return this;
		}

		function wrapper(this: any, evt: IEvent): any {
			return listener.call(this, evt.data['error'] ?? null, evt);
		}
		wrappers.set(this, wrapper);

		if (context === undefined) {
			context = this.context;
		}

		return this.on(Cell.EVENT_CHANGE, wrapper, context).on(Cell.EVENT_ERROR, wrapper, context);
	}

	unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this {
		let wrappers: Map<Cell, Function> | undefined = listener[KEY_LISTENER_WRAPPERS];
		let wrapper = wrappers?.get(this);

		if (!wrapper) {
			return this;
		}

		wrappers!.delete(this);

		if (context === undefined) {
			context = this.context;
		}

		return this.off(Cell.EVENT_CHANGE, wrapper, context).off(
			Cell.EVENT_ERROR,
			wrapper,
			context
		);
	}

	_addReaction(reaction: Cell) {
		this._reactions.push(reaction);

		this._activate();
	}

	_deleteReaction(reaction: Cell) {
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

	_activate() {
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

	_deactivate() {
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

	_onValueChange(evt: IEvent) {
		this._updationId = ++lastUpdationId;

		let reactions = this._reactions;

		for (let i = 0; i < reactions.length; i++) {
			reactions[i]._addToRelease(true);
		}

		this.handleEvent(evt);
	}

	_addToRelease(dirty: boolean) {
		this._state = dirty ? CellState.DIRTY : CellState.CHECK;

		if (transaction) {
			transaction.secondaryCells.add(this);
		}

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
			if (pendingCells.push(this) == 1) {
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

				// @ts-ignore
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
	set value(value: TValue) {
		this.set(value);
	}

	get(sticky?: boolean): TValue {
		if (this._state != CellState.ACTUAL && this._updationId != lastUpdationId) {
			this.actualize();
		}

		if (
			currentCell &&
			(!currentCell._slippery || sticky || (this._sticky && sticky !== false))
		) {
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

		return this._value as TValue;
	}

	pull() {
		if (!this._pull) {
			return false;
		}

		if (this._currentlyPulling) {
			throw TypeError('Circular pulling');
		}

		this._currentlyPulling = true;

		let prevDeps = this._dependencies;
		this._dependencies = null;

		let prevCell = currentCell;
		currentCell = this;

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

		currentCell = prevCell;

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

		return value === $error ? this.fail($error.error) : this.push(value);
	}

	set(value: TValue) {
		if (!this._inited) {
			// Не инициализированная ячейка не может иметь State.CHECK, поэтому сразу pull вместо
			// actualize.
			this.pull();
		}

		this._validate?.(value, this._value);

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
			this.push(value as any);
		}

		return this;
	}

	push(value: TValue) {
		this._inited = true;

		let err = this._error;

		if (err) {
			this._setError(null);
		}

		let prevValue = this._value;
		let changed = !this._compareValues(value, prevValue);

		if (changed) {
			this._value = value;

			if (transaction && !transaction.primaryCells.has(this)) {
				transaction.primaryCells.set(this, prevValue);
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

		this._updationId = ++lastUpdationId;

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

	fail(err: any) {
		this._inited = true;

		let isWaitError = err instanceof WaitError;

		if (!isWaitError) {
			if (this.debugKey != undefined) {
				config.logError('[' + this.debugKey + ']', err);
			} else {
				config.logError(err);
			}

			if (!(err instanceof Error)) {
				err = Error(String(err));
			}
		}

		this._setError({
			target: this,
			type: Cell.EVENT_ERROR,
			data: { error: err }
		});

		if (this._active) {
			this._state = CellState.ACTUAL;
		}

		return isWaitError;
	}

	_setError(errorEvent: IEvent<{ error: Error }> | null) {
		if (this._lastErrorEvent === errorEvent) {
			return;
		}

		let err = errorEvent && errorEvent.data.error;

		this._errorCell?.set(err);
		this._error = err;
		this._lastErrorEvent = errorEvent;

		this._updationId = ++lastUpdationId;

		if (errorEvent) {
			this.handleEvent(errorEvent);
		}

		let reactions = this._reactions;

		for (let i = 0; i < reactions.length; i++) {
			reactions[i]._setError(errorEvent);
		}
	}

	wait(): never {
		throw new WaitError();
	}

	reap() {
		this.off();

		this._errorCell?.reap();

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
