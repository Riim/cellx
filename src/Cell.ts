import { is } from '@riim/is';
import { error } from '@riim/logger';
import { Map } from '@riim/map-set-polyfill';
import { nextTick } from '@riim/next-tick';
import { Symbol } from '@riim/symbol-polyfill';
import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { WaitError } from './WaitError';

export type TCellPull<T> = (cell: Cell<T>, next: any) => any;

export interface ICellOptions<T, M> {
	debugKey?: string;
	context?: object;
	get?: (value: any) => T;
	validate?: (next: T, value: any) => void;
	merge?: (next: T, value: any) => any;
	put?: (cell: Cell<T>, next: any, value: any) => void;
	reap?: () => void;
	meta?: M;
	onChange?: TListener;
	onError?: TListener;
}

export interface ICellChangeEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
	type: 'change';
	data: {
		prevEvent: ICellChangeEvent | null;
		prevValue: any;
		value: any;
	};
}

export interface ICellErrorEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
	type: 'error';
	data: {
		error: any;
	};
}

export type TCellEvent<T extends EventEmitter = EventEmitter> =
	| ICellChangeEvent<T>
	| ICellErrorEvent<T>;

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 0x1fffffffffffff;
const KEY_WRAPPERS = Symbol('cellx[wrappers]');

const releasePlan = new Map<number, Array<Cell>>();
let releasePlanIndex = MAX_SAFE_INTEGER;
let releasePlanToIndex = -1;

let releasePlanned = false;
let currentlyRelease = 0;

let currentCell: Cell | null = null;

const $error: { error: Error | null } = { error: null };

let pushingIndexCounter = 0;
let errorIndexCounter = 0;

let releaseVersion = 1;

let afterRelease: Array<Function | [Cell, any]> | null;

const STATE_INITED = 1;
const STATE_ACTIVE = 1 << 1;
const STATE_HAS_FOLLOWERS = 1 << 2;
const STATE_CURRENTLY_PULLING = 1 << 3;
const STATE_PENDING = 1 << 4;
const STATE_FULFILLED = 1 << 5;
const STATE_REJECTED = 1 << 6;
const STATE_CAN_CANCEL_CHANGE = 1 << 7;

function release(force?: boolean) {
	if (!releasePlanned && !force) {
		return;
	}

	releasePlanned = false;
	currentlyRelease++;

	let queue = releasePlan.get(releasePlanIndex);

	for (;;) {
		let cell = queue && queue.shift();

		if (!cell) {
			if (releasePlanIndex == releasePlanToIndex) {
				break;
			}

			queue = releasePlan.get(++releasePlanIndex);
			continue;
		}

		let prevReleasePlanIndex: number;

		let level = cell._level;
		let changeEvent = cell._changeEvent;

		if (changeEvent) {
			prevReleasePlanIndex = releasePlanIndex;
		} else {
			if (level > releasePlanIndex || cell._levelInRelease == -1) {
				if (!queue!.length) {
					if (releasePlanIndex == releasePlanToIndex) {
						break;
					}

					queue = releasePlan.get(++releasePlanIndex);
				}

				continue;
			}

			prevReleasePlanIndex = releasePlanIndex;

			cell.pull();

			if (releasePlanIndex < prevReleasePlanIndex) {
				queue!.unshift(cell);

				queue = releasePlan.get(releasePlanIndex);
				continue;
			}

			level = cell._level;

			if (level > releasePlanIndex) {
				if (!queue!.length) {
					queue = releasePlan.get(++releasePlanIndex);
				}

				continue;
			}

			changeEvent = cell._changeEvent;
		}

		cell._levelInRelease = -1;

		if (changeEvent) {
			cell._fixedValue = cell._value;
			cell._changeEvent = null;

			let pushingIndex = cell._pushingIndex;
			let reactions = cell._reactions;

			for (let i = 0, l = reactions.length; i < l; i++) {
				let reaction = reactions[i];

				if (reaction._level <= level) {
					reaction._level = level + 1;
				}

				if (pushingIndex > reaction._pushingIndex) {
					reaction._pushingIndex = pushingIndex;
					reaction._prevChangeEvent = reaction._changeEvent;
					reaction._changeEvent = null;

					reaction._addToRelease();
				}
			}

			cell.handleEvent(changeEvent);

			if (releasePlanIndex == MAX_SAFE_INTEGER) {
				break;
			}

			if (releasePlanIndex != prevReleasePlanIndex) {
				queue = releasePlan.get(releasePlanIndex);
				continue;
			}
		}

		if (!queue!.length) {
			if (releasePlanIndex == releasePlanToIndex) {
				break;
			}

			queue = releasePlan.get(++releasePlanIndex);
		}
	}

	if (!--currentlyRelease) {
		releasePlanIndex = MAX_SAFE_INTEGER;
		releasePlanToIndex = -1;
		releaseVersion++;

		if (afterRelease) {
			let afterRelease_ = afterRelease;

			afterRelease = null;

			for (let i = 0, l = afterRelease_.length; i < l; i++) {
				let callback = afterRelease_[i];

				if (typeof callback == 'function') {
					callback();
				} else {
					callback[0]._push(callback[1], true, false);
				}
			}
		}
	}
}

function defaultPut(cell: Cell, value: any) {
	cell.push(value);
}

export class Cell<T = any, M = any> extends EventEmitter {
	static get currentlyPulling(): boolean {
		return !!currentCell;
	}

	static autorun(callback: Function, context?: any): () => void {
		let disposer: (() => void) | undefined;

		new Cell(
			function() {
				if (!disposer) {
					disposer = () => {
						this.dispose();
					};
				}

				callback.call(context, disposer);
			},
			{
				onChange() {}
			}
		);

		return disposer!;
	}

	static forceRelease() {
		if (releasePlanned || currentlyRelease) {
			release(true);
		}
	}

	static afterRelease(callback: Function) {
		(afterRelease || (afterRelease = [])).push(callback);
	}

	debugKey: string | undefined;

	context: object;

	_pull: TCellPull<T> | null;
	_get: ((value: any) => T) | null;

	_validate: ((next: T, value: any) => void) | null;
	_merge: ((next: T, value: any) => any) | null;
	_put: (cell: Cell<T>, next: any, value: any) => void;

	_onFulfilled: ((value: any) => void) | null;
	_onRejected: ((err: Error) => void) | null;

	_reap: (() => void) | null;

	meta: M | null;

	_value: any;
	_fixedValue: any;

	_error: Error | null = null;

	_pushingIndex = 0;
	_errorIndex = 0;

	_version = 0;

	_dependencies: Array<Cell> | null | undefined = undefined;
	_reactions: Array<Cell> = [];
	_level = 0;
	_levelInRelease = -1;

	_selfPendingStatusCell: Cell<boolean> | null = null;
	_pendingStatusCell: Cell<boolean> | null = null;

	_selfErrorCell: Cell<Error | null> | null = null;
	_errorCell: Cell<Error | null> | null = null;

	_state = STATE_CAN_CANCEL_CHANGE;

	_prevChangeEvent: IEvent | null = null;
	_changeEvent: IEvent | null = null;

	_lastErrorEvent: IEvent<this> | null = null;

	constructor(value: T | TCellPull<T>, options?: ICellOptions<T, M>) {
		super();

		this.debugKey = options && options.debugKey;

		this.context = options && options.context !== undefined ? options.context : this;

		this._pull = typeof value == 'function' ? (value as any) : null;
		this._get = (options && options.get) || null;

		this._validate = (options && options.validate) || null;
		this._merge = (options && options.merge) || null;
		this._put = (options && options.put) || defaultPut;

		this._onFulfilled = this._onRejected = null;

		this._reap = (options && options.reap) || null;

		this.meta = (options && options.meta) || null;

		if (this._pull) {
			this._fixedValue = this._value = undefined;
		} else {
			if (this._validate) {
				this._validate(value as T, undefined);
			}
			if (this._merge) {
				value = this._merge(value as T, undefined);
			}

			this._fixedValue = this._value = value as T;

			if (value instanceof EventEmitter) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (options) {
			if (options.onChange) {
				this.on('change', options.onChange);
			}
			if (options.onError) {
				this.on('error', options.onError);
			}
		}
	}

	on(type: string, listener: TListener, context?: any): this;
	on(listeners: Record<string, TListener>, context?: any): this;
	on(type: string | Record<string, TListener>, listener?: any, context?: any) {
		if (releasePlanned || currentlyRelease) {
			release(true);
		}

		this._activate();

		if (typeof type == 'object') {
			super.on(type, listener !== undefined ? listener : this.context);
		} else {
			super.on(type, listener, context !== undefined ? context : this.context);
		}

		this._state |= STATE_HAS_FOLLOWERS;

		return this;
	}

	off(type: string, listener: TListener, context?: any): this;
	off(listeners?: Record<string, TListener>, context?: any): this;
	off(type?: string | Record<string, TListener>, listener?: any, context?: any) {
		if (releasePlanned || currentlyRelease) {
			release(true);
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
			!this._reactions.length &&
			!this._events.has('change') &&
			!this._events.has('error') &&
			this._state & STATE_HAS_FOLLOWERS
		) {
			this._state ^= STATE_HAS_FOLLOWERS;

			this._deactivate();

			if (this._reap) {
				this._reap.call(this.context);
			}
		}

		return this;
	}

	addChangeListener(listener: TListener, context?: any): this {
		return this.on('change', listener, context !== undefined ? context : this.context);
	}

	removeChangeListener(listener: TListener, context?: any): this {
		return this.off('change', listener, context !== undefined ? context : this.context);
	}

	addErrorListener(listener: TListener, context?: any): this {
		return this.on('error', listener, context !== undefined ? context : this.context);
	}

	removeErrorListener(listener: TListener, context?: any): this {
		return this.off('error', listener, context !== undefined ? context : this.context);
	}

	subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this {
		let wrappers: Map<Cell, TListener> =
			listener[KEY_WRAPPERS] || (listener[KEY_WRAPPERS] = new Map());

		if (wrappers.has(this)) {
			return this;
		}

		function wrapper(evt: IEvent): any {
			return listener.call(this, evt.data.error || null, evt);
		}
		wrappers.set(this, wrapper);

		if (context === undefined) {
			context = this.context;
		}

		return this.on('change', wrapper, context).on('error', wrapper, context);
	}

	unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this {
		let wrappers: Map<Cell, TListener> | undefined = listener[KEY_WRAPPERS];
		let wrapper = wrappers && wrappers.get(this);

		if (!wrapper) {
			return this;
		}

		wrappers!.delete(this);

		if (context === undefined) {
			context = this.context;
		}

		return this.off('change', wrapper, context).off('error', wrapper, context);
	}

	_addReaction(reaction: Cell) {
		this._activate();

		this._reactions.push(reaction);
		this._state |= STATE_HAS_FOLLOWERS;
	}

	_deleteReaction(reaction: Cell) {
		this._reactions.splice(this._reactions.indexOf(reaction), 1);

		if (!this._reactions.length && !this._events.has('change') && !this._events.has('error')) {
			this._state ^= STATE_HAS_FOLLOWERS;

			this._deactivate();

			if (this._reap) {
				this._reap.call(this.context);
			}
		}
	}

	_activate() {
		if (!this._pull || this._state & STATE_ACTIVE) {
			return;
		}

		let deps = this._dependencies;

		if (deps === null) {
			return;
		}

		if (this._version < releaseVersion) {
			let value = this._pull$();

			if (deps || this._dependencies || !(this._state & STATE_INITED)) {
				if (value === $error) {
					this._fail($error.error, false, false);
				} else {
					this._push(value, false, false);
				}
			}

			deps = this._dependencies;
		}

		if (deps) {
			let i = deps.length;

			do {
				deps[--i]._addReaction(this);
			} while (i);

			this._state |= STATE_ACTIVE;
		}
	}

	_deactivate() {
		if (!(this._state & STATE_ACTIVE)) {
			return;
		}

		let deps = this._dependencies!;
		let i = deps.length;

		do {
			deps[--i]._deleteReaction(this);
		} while (i);

		if (this._levelInRelease != -1) {
			this._levelInRelease = -1;
			this._changeEvent = null;
		}

		this._state ^= STATE_ACTIVE;
	}

	_onValueChange(evt: IEvent) {
		this._pushingIndex = ++pushingIndexCounter;

		if (this._state & STATE_HAS_FOLLOWERS) {
			let changeEvent = ((evt.data || (evt.data = {})).prevEvent = this._changeEvent);

			this._changeEvent = evt;

			if (changeEvent) {
				if (this._value === this._fixedValue) {
					this._state &= ~STATE_CAN_CANCEL_CHANGE;
				}
			} else {
				this._state &= ~STATE_CAN_CANCEL_CHANGE;
				this._addToRelease();
			}
		} else {
			this._version = ++releaseVersion + +(currentlyRelease != 0);
		}
	}

	get(): T {
		if (this._pull) {
			if (this._state & STATE_ACTIVE) {
				if (releasePlanned || (currentlyRelease && !currentCell)) {
					release(true);
				}
			} else if (
				this._version <
				releaseVersion + +releasePlanned + +(currentlyRelease != 0)
			) {
				let prevDeps = this._dependencies;

				if (prevDeps !== null) {
					let value = this._pull$();
					let deps = this._dependencies;

					if (prevDeps || deps || !(this._state & STATE_INITED)) {
						if (deps && this._state & STATE_HAS_FOLLOWERS) {
							let i = deps.length;

							do {
								deps[--i]._addReaction(this);
							} while (i);

							this._state |= STATE_ACTIVE;
						}

						if (value === $error) {
							this._fail($error.error, false, false);
						} else {
							this._push(value, false, false);
						}
					}
				}
			}
		}

		if (currentCell) {
			let currentCellDeps = currentCell._dependencies;
			let level = this._level;

			if (currentCellDeps) {
				if (currentCellDeps.indexOf(this) == -1) {
					currentCellDeps.push(this);

					if (currentCell._level <= level) {
						currentCell._level = level + 1;
					}
				}
			} else {
				currentCell._dependencies = [this];
				currentCell._level = level + 1;
			}
		}

		if (currentCell && this._error && this._error instanceof WaitError) {
			throw this._error;
		}

		return this._get ? this._get(this._value) : this._value!;
	}

	pull(): boolean {
		if (!this._pull) {
			return false;
		}

		if (releasePlanned) {
			release();
		}

		let prevDeps: Array<Cell> | null | undefined;
		let prevLevel: number;

		let value;

		if (this._state & STATE_HAS_FOLLOWERS) {
			prevDeps = this._dependencies;
			prevLevel = this._level;

			value = this._pull$();

			let deps = this._dependencies;
			let newDepCount = 0;

			if (deps) {
				let i = deps.length;

				do {
					let dep = deps[--i];

					if (!prevDeps || prevDeps.indexOf(dep) == -1) {
						dep._addReaction(this);
						newDepCount++;
					}
				} while (i);
			}

			if (prevDeps && (deps ? deps.length - newDepCount : 0) < prevDeps.length) {
				for (let i = prevDeps.length; i; ) {
					let prevDep = prevDeps[--i];

					if (!deps || deps.indexOf(prevDep) == -1) {
						prevDep._deleteReaction(this);
					}
				}
			}

			if (deps) {
				this._state |= STATE_ACTIVE;
			} else {
				this._state &= ~STATE_ACTIVE;
			}

			if (currentlyRelease && this._level > (prevLevel as number)) {
				this._addToRelease();
				return false;
			}
		} else {
			value = this._pull$();
		}

		if (value === $error) {
			this._fail($error.error, false, true);
			return true;
		}

		return this._push(value, false, true);
	}

	_pull$(): any {
		if (this._state & STATE_CURRENTLY_PULLING) {
			throw new TypeError('Circular pulling detected');
		}

		let pull = this._pull!;

		if (pull.length) {
			if (this._selfPendingStatusCell) {
				this._selfPendingStatusCell.set(true);
			}
			this._state |= STATE_PENDING;

			this._state &= ~(STATE_FULFILLED | STATE_REJECTED);
		}

		let prevCell = currentCell;
		currentCell = this;

		this._dependencies = null;
		this._level = 0;
		this._state |= STATE_CURRENTLY_PULLING;

		try {
			return pull.length
				? pull.call(this.context, this, this._value)
				: pull.call(this.context);
		} catch (err) {
			$error.error = err;
			return $error;
		} finally {
			currentCell = prevCell;

			this._version = releaseVersion + +(currentlyRelease != 0);

			let pendingStatusCell = this._pendingStatusCell;

			if (pendingStatusCell && pendingStatusCell._state & STATE_ACTIVE) {
				pendingStatusCell.pull();
			}

			let errorCell = this._errorCell;

			if (errorCell && errorCell._state & STATE_ACTIVE) {
				errorCell.pull();
			}

			this._state ^= STATE_CURRENTLY_PULLING;
		}
	}

	getError(): Error | null {
		let errorCell = this._errorCell;

		if (!errorCell) {
			let debugKey = this.debugKey;

			this._selfErrorCell = new Cell(
				this._error,
				debugKey ? { debugKey: debugKey + '._selfErrorCell' } : undefined
			);

			errorCell = this._errorCell = new Cell<Error | null>(
				function(this: Cell) {
					this.get();

					let err = this._selfErrorCell!.get();
					let errorIndex: number;

					if (err) {
						errorIndex = this._errorIndex;

						if (errorIndex == errorIndexCounter) {
							return err;
						}
					}

					let deps = this._dependencies;

					if (deps) {
						let i = deps.length;

						do {
							let dep = deps[--i];
							let depError = dep.getError();

							if (depError) {
								let depErrorIndex = dep._errorIndex;

								if (depErrorIndex == errorIndexCounter) {
									return depError;
								}

								if (!err || errorIndex! < depErrorIndex) {
									err = depError;
									errorIndex = depErrorIndex;
								}
							}
						} while (i);
					}

					return err;
				},
				debugKey ? { debugKey: debugKey + '._errorCell', context: this } : { context: this }
			);
		}

		return errorCell.get();
	}

	isPending(): boolean {
		let pendingStatusCell = this._pendingStatusCell;

		if (!pendingStatusCell) {
			let debugKey = this.debugKey;

			this._selfPendingStatusCell = new Cell(
				!!(this._state & STATE_PENDING),
				debugKey ? { debugKey: debugKey + '._selfPendingStatusCell' } : undefined
			);

			pendingStatusCell = this._pendingStatusCell = new Cell<boolean>(
				function(this: Cell) {
					if (this._selfPendingStatusCell!.get()) {
						return true;
					}

					try {
						this.get();
					} catch {}

					let deps = this._dependencies;

					if (deps) {
						let i = deps.length;

						do {
							if (deps[--i].isPending()) {
								return true;
							}
						} while (i);
					}

					return false;
				},
				debugKey
					? { debugKey: debugKey + '._pendingStatusCell', context: this }
					: { context: this }
			);
		}

		return pendingStatusCell.get();
	}

	set(value: T): this {
		if (this._validate) {
			this._validate(value, this._value);
		}
		if (this._merge) {
			value = this._merge(value, this._value);
		}

		if (this._selfPendingStatusCell) {
			this._selfPendingStatusCell.set(true);
		}
		this._state |= STATE_PENDING;

		this._state &= ~(STATE_FULFILLED | STATE_REJECTED);

		if (this._put.length >= 3) {
			this._put.call(this.context, this, value, this._value);
		} else {
			this._put.call(this.context, this, value);
		}

		return this;
	}

	push(value: any): this {
		this._push(value, true, false);
		return this;
	}

	_push(value: any, public$: boolean, pulling: boolean): boolean {
		if (public$ || (!currentlyRelease && pulling)) {
			this._pushingIndex = ++pushingIndexCounter;
		}

		this._state |= STATE_INITED;

		if (this._error) {
			this._setError(null, false);
		}

		let prevValue = this._value;

		if (is(value, prevValue)) {
			if (public$ || (currentlyRelease && pulling)) {
				this._fulfill(value);
			}

			return false;
		}

		this._value = value;

		if (prevValue instanceof EventEmitter) {
			prevValue.off('change', this._onValueChange, this);
		}
		if (value instanceof EventEmitter) {
			value.on('change', this._onValueChange, this);
		}

		if (this._state & STATE_HAS_FOLLOWERS) {
			let changeEvent = this._changeEvent || this._prevChangeEvent;

			if (changeEvent) {
				if (is(value, this._fixedValue) && this._state & STATE_CAN_CANCEL_CHANGE) {
					this._levelInRelease = -1;
					this._changeEvent = null;
				} else {
					this._changeEvent = {
						target: this,
						type: 'change',
						data: {
							prevEvent: changeEvent,
							prevValue,
							value
						}
					};
				}

				this._prevChangeEvent = null;
			} else {
				this._state |= STATE_CAN_CANCEL_CHANGE;
				this._changeEvent = {
					target: this,
					type: 'change',
					data: {
						prevEvent: null,
						prevValue,
						value
					}
				};

				this._addToRelease();
			}
		} else {
			if (public$ || (!currentlyRelease && pulling)) {
				releaseVersion++;
			}

			this._fixedValue = value;
			this._version = releaseVersion + +(currentlyRelease != 0);
		}

		if (public$ || (currentlyRelease && pulling)) {
			this._fulfill(value);
		}

		return true;
	}

	_fulfill(value: any) {
		this._resolvePending();

		if (!(this._state & STATE_FULFILLED)) {
			this._state |= STATE_FULFILLED;

			if (this._onFulfilled) {
				this._onFulfilled(value);
			}
		}
	}

	fail(err: any): this {
		this._fail(err, true, false);
		return this;
	}

	_fail(err: any, public$: boolean, pulling: boolean) {
		if (!(err instanceof WaitError)) {
			if (this.debugKey) {
				error('[' + this.debugKey + ']', err);
			} else {
				error(err);
			}

			if (!(err instanceof Error)) {
				err = new Error(String(err));
			}
		}

		this._setError(err, public$ || (currentlyRelease != 0 && pulling));
	}

	_setError(err: Error | null, reject: boolean) {
		this._error = err;
		if (this._selfErrorCell) {
			this._selfErrorCell.set(err);
		}

		if (err) {
			this._errorIndex = ++errorIndexCounter;

			this._handleErrorEvent(
				{
					target: this,
					type: 'error',
					data: {
						error: err
					}
				},
				reject ? err : null
			);
		}
	}

	_handleErrorEvent(evt: IEvent<this>, err: Error | null) {
		if (this._lastErrorEvent === evt) {
			return;
		}

		this._lastErrorEvent = evt;
		this.handleEvent(evt);

		if (err) {
			this._reject(err);
		}

		let reactions = this._reactions;

		for (let i = reactions.length; i; ) {
			reactions[--i]._handleErrorEvent(evt, err);
		}
	}

	_reject(err: Error) {
		this._resolvePending();

		if (!(err instanceof WaitError) && !(this._state & STATE_REJECTED)) {
			this._state |= STATE_REJECTED;

			if (this._onRejected) {
				this._onRejected(err);
			}
		}
	}

	wait() {
		throw new (WaitError as any)();
	}

	_addToRelease() {
		let level = this._level;

		if (level <= this._levelInRelease) {
			return;
		}

		let queue: Array<Cell>;

		(releasePlan.get(level) || (releasePlan.set(level, (queue = [])), queue)).push(this);

		if (releasePlanIndex > level) {
			releasePlanIndex = level;
		}
		if (releasePlanToIndex < level) {
			releasePlanToIndex = level;
		}

		this._levelInRelease = level;

		if (!releasePlanned && !currentlyRelease) {
			releasePlanned = true;
			nextTick(release);
		}
	}

	_resolvePending() {
		if (this._state & STATE_PENDING) {
			if (this._selfPendingStatusCell) {
				this._selfPendingStatusCell.set(false);
			}
			this._state ^= STATE_PENDING;
		}
	}

	then<U = any>(
		onFulfilled: ((value: T) => U) | null,
		onRejected?: (err: Error) => U
	): Promise<U> {
		let listener = () => {};
		this.on('change', listener);

		if (!this._pull || this._state & STATE_FULFILLED) {
			this.off('change', listener);
			return Promise.resolve(this._get ? this._get(this._value) : this._value).then(
				onFulfilled
			);
		}
		if (this._state & STATE_REJECTED) {
			this.off('change', listener);
			return Promise.reject(this._error).catch(onRejected);
		}

		let cell = this;

		let promise = new Promise((resolve, reject) => {
			cell._onFulfilled = value => {
				cell._onFulfilled = cell._onRejected = null;
				this.off('change', listener);
				resolve(cell._get ? cell._get(value) : value);
			};

			cell._onRejected = err => {
				cell._onFulfilled = cell._onRejected = null;
				this.off('change', listener);
				reject(err);
			};
		}).then(onFulfilled, onRejected);

		return promise;
	}

	catch<U = any>(onRejected: (err: Error) => U): Promise<U> {
		return this.then(null, onRejected);
	}

	reap(): this {
		this.off();

		let reactions = this._reactions;

		for (let i = reactions.length; i; ) {
			reactions[--i].reap();
		}

		return this;
	}

	dispose(): this {
		return this.reap();
	}
}
