import { nextTick } from '@riim/next-tick';
import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { logError } from './utils';
import { WaitError } from './WaitError';

export type TCellPull<T, R = T> = (cell: Cell<T>, next: any) => R;

export interface ICellOptions<T, M> {
	debugKey?: string;
	context?: object;
	pull?: TCellPull<T>;
	get?: (value: any) => T;
	validate?: (next: T, value: any) => void;
	merge?: (next: T, value: any) => any;
	put?: (cell: Cell<T>, next: any, value: any) => void;
	reap?: () => void;
	meta?: M;
	value?: T;
	onChange?: TListener;
	onError?: TListener;
}

export enum State {
	ACTUAL = 'actual',
	DIRTY = 'dirty',
	CHECK = 'check'
}

export interface ICellChangeEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
	type: typeof Cell.EVENT_CHANGE;
	data: {
		prevValue: any;
		value: any;
	};
}

export interface ICellErrorEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
	type: typeof Cell.EVENT_ERROR;
	data: {
		error: any;
	};
}

export type TCellEvent<T extends EventEmitter = EventEmitter> =
	| ICellChangeEvent<T>
	| ICellErrorEvent<T>;

const KEY_LISTENER_WRAPPERS = Symbol('listenerWrappers');

function defaultPut(cell: Cell, value: any) {
	cell.push(value);
}

const pendingCells: Array<Cell> = [];
let pendingCellsIndex = 0;

let afterRelease: Array<Function> | null;

let currentCell: Cell | null = null;

const $error: { error: Error | null } = { error: null };

let lastUpdationId = 0;

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

		for (let cb of afterRelease_) {
			cb();
		}
	}
}

export class Cell<T = any, M = any> extends EventEmitter {
	static EVENT_CHANGE = 'change';
	static EVENT_ERROR = 'error';

	static get currentlyPulling() {
		return currentCell != null;
	}

	static autorun<T = any, M = any>(
		cb: (next: T | undefined, disposer: () => void) => T,
		cellOptions?: ICellOptions<T, M>
	) {
		let disposer: (() => void) | undefined;

		new Cell(
			function (cell, next) {
				if (!disposer) {
					disposer = () => {
						cell.dispose();
					};
				}

				return cb.call(this, next, disposer);
			},
			cellOptions?.onChange
				? cellOptions
				: {
						...cellOptions,
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						onChange() {}
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

	debugKey: string | undefined;

	context: object;

	_pull: TCellPull<T> | null;
	_get: ((value: any) => T) | null;

	_validate: ((next: T, value: any) => void) | null;
	_merge: ((next: T, value: any) => any) | null;
	_put: (cell: Cell<T>, next: any, value: any) => void;

	_reap: (() => void) | null;

	meta: M | null;

	_dependencies: Array<Cell> | null | undefined;
	_reactions: Array<Cell> = [];

	_value: any;
	_error: Error | null = null;
	_lastErrorEvent: IEvent<this> | null = null;

	_state: State;
	_inited: boolean;
	_hasSubscribers = false;
	_active = false;
	_currentlyPulling = false;
	_updationId = -1;

	constructor(value: T | TCellPull<T>, options?: ICellOptions<T, M>) {
		super();

		this.debugKey = options?.debugKey;

		this.context = options && options.context !== undefined ? options.context : this;

		this._pull = options?.pull ?? (typeof value == 'function' ? (value as any) : null);
		this._get = options?.get ?? null;

		this._validate = options?.validate ?? null;
		this._merge = options?.merge ?? null;
		this._put = options?.put ?? defaultPut;

		this._reap = options?.reap ?? null;

		this.meta = options?.meta ?? null;

		if (this._pull) {
			this._dependencies = undefined;
			this._value = undefined;
			this._state = State.DIRTY;
			this._inited = false;
		} else {
			this._dependencies = null;

			if (options && options.value !== undefined) {
				value = options.value;
			}

			if (this._validate) {
				this._validate(value as T, undefined);
			}
			if (this._merge) {
				value = this._merge(value as T, undefined);
			}

			this._value = value;

			this._state = State.ACTUAL;
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
		listener: TListener,
		context?: any
	): this;
	override on(
		listeners: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>,
		context?: any
	): this;
	override on(type: string | Record<string, TListener>, listener?: any, context?: any) {
		if (this._dependencies !== null) {
			this.actualize();
		}

		if (typeof type == 'object') {
			super.on(type, listener !== undefined ? listener : this.context);
		} else {
			super.on(type, listener, context !== undefined ? context : this.context);
		}

		this._hasSubscribers = true;

		this._activate(true);

		return this;
	}

	override off(
		type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR,
		listener: TListener,
		context?: any
	): this;
	override off(
		listeners?: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>,
		context?: any
	): this;
	override off(type?: string | Record<string, TListener>, listener?: any, context?: any) {
		if (this._dependencies !== null) {
			this.actualize();
		}

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
			this._hasSubscribers &&
			this._reactions.length == 0 &&
			!this._events.has(Cell.EVENT_CHANGE) &&
			!this._events.has(Cell.EVENT_ERROR)
		) {
			this._hasSubscribers = false;
			this._deactivate();

			if (this._reap) {
				this._reap.call(this.context);
			}
		}

		return this;
	}

	onChange(listener: TListener, context?: any) {
		return this.on(Cell.EVENT_CHANGE, listener, context !== undefined ? context : this.context);
	}

	offChange(listener: TListener, context?: any) {
		return this.off(
			Cell.EVENT_CHANGE,
			listener,
			context !== undefined ? context : this.context
		);
	}

	onError(listener: TListener, context?: any) {
		return this.on(Cell.EVENT_ERROR, listener, context !== undefined ? context : this.context);
	}

	offError(listener: TListener, context?: any) {
		return this.off(Cell.EVENT_ERROR, listener, context !== undefined ? context : this.context);
	}

	subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any) {
		let wrappers: Map<Cell, TListener> =
			listener[KEY_LISTENER_WRAPPERS] || (listener[KEY_LISTENER_WRAPPERS] = new Map());

		if (wrappers.has(this)) {
			return this;
		}

		function wrapper(evt: IEvent): any {
			return listener.call(this, evt.data['error'] || null, evt);
		}
		wrappers.set(this, wrapper);

		if (context === undefined) {
			context = this.context;
		}

		return this.on(Cell.EVENT_CHANGE, wrapper, context).on(Cell.EVENT_ERROR, wrapper, context);
	}

	unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this {
		let wrappers: Map<Cell, TListener> | undefined = listener[KEY_LISTENER_WRAPPERS];
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

	_addReaction(reaction: Cell, actual: boolean) {
		this._reactions.push(reaction);
		this._hasSubscribers = true;

		this._activate(actual);
	}

	_deleteReaction(reaction: Cell) {
		this._reactions.splice(this._reactions.indexOf(reaction), 1);

		if (
			this._hasSubscribers &&
			this._reactions.length == 0 &&
			!this._events.has(Cell.EVENT_CHANGE) &&
			!this._events.has(Cell.EVENT_ERROR)
		) {
			this._hasSubscribers = false;
			this._deactivate();

			if (this._reap) {
				this._reap.call(this.context);
			}
		}
	}

	_activate(actual: boolean) {
		if (this._active || !this._pull) {
			return;
		}

		let deps = this._dependencies;

		if (deps) {
			let i = deps.length;

			do {
				deps[--i]._addReaction(this, actual);
			} while (i != 0);

			if (actual) {
				this._state = State.ACTUAL;
			}

			this._active = true;
		}
	}

	_deactivate() {
		if (!this._active) {
			return;
		}

		let deps = this._dependencies!;
		let i = deps.length;

		do {
			deps[--i]._deleteReaction(this);
		} while (i != 0);

		this._state = State.DIRTY;

		this._active = false;
	}

	_onValueChange(evt: IEvent) {
		this._inited = true;
		this._updationId = ++lastUpdationId;

		let reactions = this._reactions;

		for (let i = 0; i < reactions.length; i++) {
			reactions[i]._addToRelease(true);
		}

		this.handleEvent(evt);
	}

	_addToRelease(dirty: boolean) {
		this._state = dirty ? State.DIRTY : State.CHECK;

		let reactions = this._reactions;
		let i = reactions.length;

		if (i != 0) {
			do {
				if (reactions[--i]._state == State.ACTUAL) {
					reactions[i]._addToRelease(false);
				}
			} while (i != 0);
		} else if (pendingCells.push(this) == 1) {
			nextTick(release);
		}
	}

	actualize() {
		if (this._state == State.DIRTY) {
			this.pull();
		} else if (this._state == State.CHECK) {
			let deps = this._dependencies!;

			for (let i = 0; ; ) {
				deps[i].actualize();

				if ((this._state as State) == State.DIRTY) {
					this.pull();
					break;
				}

				if (++i == deps.length) {
					this._state = State.ACTUAL;
					break;
				}
			}
		}
	}

	get value() {
		return this.get();
	}
	set value(value: T) {
		this.set(value);
	}

	get(): T {
		if (this._state != State.ACTUAL && this._updationId != lastUpdationId) {
			this.actualize();
		}

		if (currentCell) {
			if (currentCell._dependencies) {
				if (currentCell._dependencies.indexOf(this) == -1) {
					currentCell._dependencies.push(this);
				}
			} else {
				currentCell._dependencies = [this];
			}

			if (this._error && this._error instanceof WaitError) {
				throw this._error;
			}
		}

		return this._get ? this._get(this._value) : this._value;
	}

	pull() {
		if (!this._pull) {
			return false;
		}

		if (this._currentlyPulling) {
			throw TypeError('Circular pulling detected');
		}

		this._currentlyPulling = true;

		let prevDeps = this._dependencies;
		this._dependencies = null;

		let prevCell = currentCell;
		currentCell = this;

		let value;

		try {
			value =
				this._pull.length != 0
					? this._pull.call(this.context, this, this._value)
					: this._pull.call(this.context);
		} catch (err) {
			$error.error = err;
			value = $error;
		}

		currentCell = prevCell;

		this._currentlyPulling = false;

		if (this._hasSubscribers) {
			let deps = this._dependencies as Array<Cell> | null;
			let newDepCount = 0;

			if (deps) {
				let i = deps.length;

				do {
					let dep: Cell = deps[--i];

					if (!prevDeps || prevDeps.indexOf(dep) == -1) {
						dep._addReaction(this, false);
						newDepCount++;
					}
				} while (i != 0);
			}

			if (prevDeps && (!deps || deps.length - newDepCount < prevDeps.length)) {
				for (let i = prevDeps.length; i != 0; ) {
					i--;

					if (!deps || deps.indexOf(prevDeps[i]) == -1) {
						prevDeps[i]._deleteReaction(this);
					}
				}
			}

			if (deps) {
				this._active = true;
			} else {
				this._state = State.ACTUAL;
				this._active = false;
			}
		} else {
			this._state = this._dependencies ? State.DIRTY : State.ACTUAL;
		}

		return value === $error ? this.fail($error.error) : this.push(value);
	}

	set(value: T) {
		if (!this._inited) {
			// Не инициализированная ячейка не может иметь _state == State.CHECK, поэтому вместо
			// actualize сразу pull.
			this.pull();
		}

		if (this._validate) {
			this._validate(value, this._value);
		}
		if (this._merge) {
			value = this._merge(value, this._value);
		}

		if (this._put.length >= 3) {
			this._put.call(this.context, this, value, this._value);
		} else {
			this._put.call(this.context, this, value);
		}

		return this;
	}

	push(value: any) {
		this._inited = true;

		let err = this._error;

		if (err) {
			this._setError(null);
		}

		let prevValue = this._value;
		let changed = !Object.is(value, prevValue);

		if (changed) {
			this._value = value;

			if (prevValue instanceof EventEmitter) {
				prevValue.off('change', this._onValueChange, this);
			}
			if (value instanceof EventEmitter) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (this._active) {
			this._state = State.ACTUAL;
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
				logError('[' + this.debugKey + ']', err);
			} else {
				logError(err);
			}

			if (!(err instanceof Error)) {
				err = new Error(String(err));
			}
		}

		this._setError(err);

		if (this._active) {
			this._state = State.ACTUAL;
		}

		return isWaitError;
	}

	_setError(err: Error | null) {
		this._error = err;

		this._updationId = ++lastUpdationId;

		if (err) {
			this._handleErrorEvent({
				target: this,
				type: Cell.EVENT_ERROR,
				data: {
					error: err
				}
			});
		}
	}

	_handleErrorEvent(evt: IEvent<this>) {
		if (this._lastErrorEvent === evt) {
			return;
		}

		this._lastErrorEvent = evt;
		this.handleEvent(evt);

		let reactions = this._reactions;

		for (let i = 0; i < reactions.length; i++) {
			reactions[i]._handleErrorEvent(evt);
		}
	}

	wait(): never {
		throw new WaitError();
	}

	reap() {
		this.off();

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
