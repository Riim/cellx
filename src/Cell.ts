import { is } from '@riim/is';
import { error } from '@riim/logger';
import { Map } from '@riim/map-set-polyfill';
import { nextTick } from '@riim/next-tick';
import { Symbol } from '@riim/symbol-polyfill';
import { EventEmitter, IEvent, TListener } from './EventEmitter';

export type TCellPull<T> = (cell: Cell<T>, next: any) => any;

export interface ICellOptions<T> {
	debugKey?: string;
	context?: object;
	get?: (value: any) => T;
	validate?: (next: T, value: any) => void;
	merge?: (next: T, value: any) => any;
	put?: (cell: Cell<T>, next: any, value: any) => void;
	reap?: () => void;
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

export type TCellEvent<T extends EventEmitter = EventEmitter> = ICellChangeEvent<T> | ICellErrorEvent<T>;

let MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 0x1fffffffffffff;
let KEY_WRAPPERS = Symbol('wrappers');

let releasePlan = new Map<number, Array<Cell>>();
let releasePlanIndex = MAX_SAFE_INTEGER;
let releasePlanToIndex = -1;

let releasePlanned = false;
let currentlyRelease = 0;

let currentCell: Cell | null = null;

let $error: { error: Error | null } = { error: null };

let pushingIndexCounter = 0;
let errorIndexCounter = 0;

let releaseVersion = 1;

let afterRelease: Array<Function | [Cell, any]> | null;

let STATE_INITED = 1;
let STATE_CURRENTLY_PULLING = 1 << 1;
let STATE_ACTIVE = 1 << 2;
let STATE_HAS_FOLLOWERS = 1 << 3;
let STATE_PENDING = 1 << 4;
let STATE_CAN_CANCEL_CHANGE = 1 << 5;

function release(force?: boolean) {
	if (!releasePlanned && !force) {
		return;
	}

	releasePlanned = false;
	currentlyRelease++;

	let queue = releasePlan.get(releasePlanIndex);

	for (; ; ) {
		let cell = queue && queue.shift();

		if (!cell) {
			if (releasePlanIndex == releasePlanToIndex) {
				break;
			}

			queue = releasePlan.get(++releasePlanIndex);
			continue;
		}

		let prevReleasePlanIndex = releasePlanIndex;

		let level = cell._level;
		let changeEvent = cell._changeEvent;

		if (!changeEvent) {
			if (level > releasePlanIndex || cell._levelInRelease == -1) {
				if (!queue!.length) {
					if (releasePlanIndex == releasePlanToIndex) {
						break;
					}

					queue = releasePlan.get(++releasePlanIndex);
				}

				continue;
			}

			cell.pull();

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
			let slaves = cell._slaves;

			for (let i = 0, l = slaves.length; i < l; i++) {
				let slave = slaves[i];

				if (slave._level <= level) {
					slave._level = level + 1;
				}

				if (pushingIndex > slave._pushingIndex) {
					slave._pushingIndex = pushingIndex;
					slave._changeEvent = null;

					slave._addToRelease();
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
			let after = afterRelease;

			afterRelease = null;

			for (let i = 0, l = after.length; i < l; i++) {
				let afterItem = after[i];

				if (typeof afterItem == 'function') {
					afterItem();
				} else {
					afterItem[0]._push(afterItem[1], true, false);
				}
			}
		}
	}
}

function defaultPut(cell: Cell, value: any) {
	cell.push(value);
}

export class Cell<T = any> extends EventEmitter {
	static get currentlyPulling(): boolean {
		return !!currentCell;
	}

	static autorun(callback: Function, context?: any): () => void {
		let disposer: (() => void) | undefined;

		new Cell(function() {
			if (!disposer) {
				disposer = () => {
					this.dispose();
				};
			}

			callback.call(context, disposer);
		}, {
			onChange() {}
		});

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

	_reap: (() => void) | null;

	_fixedValue: any;
	_value: any;

	_error: Error | null = null;

	_pushingIndex = 0;
	_errorIndex = 0;

	_version = 0;

	_masters: Array<Cell> | null | undefined = undefined;
	_slaves: Array<Cell> = [];
	_level = 0;
	_levelInRelease = -1;

	_selfPendingStatusCell: Cell<boolean> | null = null;
	_pendingStatusCell: Cell<boolean> | null = null;

	_selfErrorCell: Cell<Error | null> | null = null;
	_errorCell: Cell<Error | null> | null = null;

	_state = STATE_CAN_CANCEL_CHANGE;

	_changeEvent: IEvent | null = null;
	_lastErrorEvent: IEvent<this> | null = null;

	constructor(value: T, opts?: ICellOptions<T>);
	constructor(pull: TCellPull<T>, opts?: ICellOptions<T>);
	constructor(value: T | TCellPull<T>, opts?: ICellOptions<T>) {
		super();

		this.debugKey = opts && opts.debugKey;

		this.context = opts && opts.context || this;

		this._pull = typeof value == 'function' ? value : null;
		this._get = opts && opts.get || null;

		this._validate = opts && opts.validate || null;
		this._merge = opts && opts.merge || null;
		this._put = opts && opts.put || defaultPut;

		this._reap = opts && opts.reap || null;

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

		if (opts) {
			if (opts.onChange) {
				this.on('change', opts.onChange);
			}
			if (opts.onError) {
				this.on('error', opts.onError);
			}
		}
	}

	on(type: string, listener: TListener, context?: any): this;
	on(listeners: { [type: string]: TListener }, context?: any): this;
	on(type: string | { [type: string]: TListener }, listener?: any, context?: any) {
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
	off(listeners?: { [type: string]: TListener }, context?: any): this;
	off(type?: string | { [type: string]: TListener }, listener?: any, context?: any) {
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
			!this._slaves.length && !this._events.has('change') && !this._events.has('error') &&
				(this._state & STATE_HAS_FOLLOWERS)
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
		let wrappers: Map<Cell, TListener> = (listener as any)[KEY_WRAPPERS] ||
			((listener as any)[KEY_WRAPPERS] = new Map());

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

		return this
			.on('change', wrapper, context)
			.on('error', wrapper, context);
	}

	unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this {
		let wrappers: Map<Cell, TListener> | undefined = (listener as any)[KEY_WRAPPERS];
		let wrapper = wrappers && wrappers.get(this);

		if (!wrapper) {
			return this;
		}

		wrappers!.delete(this);

		if (context === undefined) {
			context = this.context;
		}

		return this
			.off('change', wrapper, context)
			.off('error', wrapper, context);
	}

	_registerSlave(slave: Cell) {
		this._activate();

		this._slaves.push(slave);
		this._state |= STATE_HAS_FOLLOWERS;
	}

	_unregisterSlave(slave: Cell) {
		this._slaves.splice(this._slaves.indexOf(slave), 1);

		if (!this._slaves.length && !this._events.has('change') && !this._events.has('error')) {
			this._state ^= STATE_HAS_FOLLOWERS;

			this._deactivate();

			if (this._reap) {
				this._reap.call(this.context);
			}
		}
	}

	_activate() {
		if (!this._pull || (this._state & STATE_ACTIVE)) {
			return;
		}

		let masters = this._masters;

		if (masters === null) {
			return;
		}

		if (this._version < releaseVersion) {
			let value = this._tryPull();

			if (masters || this._masters || !(this._state & STATE_INITED)) {
				if (value === $error) {
					this._fail($error.error, false);
				} else {
					this._push(value, false, false);
				}
			}

			masters = this._masters;
		}

		if (masters) {
			let i = masters.length;

			do {
				masters[--i]._registerSlave(this);
			} while (i);

			this._state |= STATE_ACTIVE;
		}
	}

	_deactivate() {
		if (!(this._state & STATE_ACTIVE)) {
			return;
		}

		let masters = this._masters!;
		let i = masters.length;

		do {
			masters[--i]._unregisterSlave(this);
		} while (i);

		if (this._levelInRelease != -1) {
			this._levelInRelease = -1;
			this._changeEvent = null;
		}

		this._state ^= STATE_ACTIVE;
	}

	_onValueChange(evt: IEvent) {
		if (this._state & STATE_HAS_FOLLOWERS) {
			if (currentCell) {
				(afterRelease || (afterRelease = [])).push(() => {
					this._onValueChange$(evt);
				});
			} else {
				this._onValueChange$(evt);
			}
		} else {
			this._pushingIndex = ++pushingIndexCounter;
			this._version = ++releaseVersion + +(currentlyRelease > 0);
		}
	}

	_onValueChange$(evt: IEvent) {
		this._pushingIndex = ++pushingIndexCounter;

		let changeEvent = (evt.data || (evt.data = {})).prevEvent = this._changeEvent;

		this._changeEvent = evt;

		if (changeEvent) {
			if (this._value === this._fixedValue) {
				this._state &= ~STATE_CAN_CANCEL_CHANGE;
			}
		} else {
			this._state &= ~STATE_CAN_CANCEL_CHANGE;
			this._addToRelease();
		}
	}

	get(): T {
		if (this._pull) {
			if (this._state & STATE_ACTIVE) {
				if (releasePlanned || currentlyRelease && !currentCell) {
					release(true);
				}
			} else if (this._version < releaseVersion + +(currentlyRelease > 0)) {
				let prevMasters = this._masters;

				if (prevMasters !== null) {
					let value = this._tryPull();
					let masters = this._masters;

					if (prevMasters || masters || !(this._state & STATE_INITED)) {
						if (masters && (this._state & STATE_HAS_FOLLOWERS)) {
							let i = masters.length;

							do {
								masters[--i]._registerSlave(this);
							} while (i);

							this._state |= STATE_ACTIVE;
						}

						if (value === $error) {
							this._fail($error.error, false);
						} else {
							this._push(value, false, false);
						}
					}
				}
			}
		}

		if (currentCell) {
			let currentCellMasters = currentCell._masters;
			let level = this._level;

			if (currentCellMasters) {
				if (currentCellMasters.indexOf(this) == -1) {
					currentCellMasters.push(this);

					if (currentCell._level <= level) {
						currentCell._level = level + 1;
					}
				}
			} else {
				currentCell._masters = [this];
				currentCell._level = level + 1;
			}
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

		let prevMasters;
		let prevLevel;

		let value;

		if (this._state & STATE_HAS_FOLLOWERS) {
			prevMasters = this._masters;
			prevLevel = this._level;

			value = this._tryPull();

			let masters = this._masters;
			let newMasterCount = 0;

			if (masters) {
				let i = masters.length;

				do {
					let master = masters[--i];

					if (!prevMasters || prevMasters.indexOf(master) == -1) {
						master._registerSlave(this);
						newMasterCount++;
					}
				} while (i);
			}

			if (prevMasters && (masters ? masters.length - newMasterCount : 0) < prevMasters.length) {
				for (let i = prevMasters.length; i; ) {
					let prevMaster = prevMasters[--i];

					if (!masters || masters.indexOf(prevMaster) == -1) {
						prevMaster._unregisterSlave(this);
					}
				}
			}

			if (masters) {
				this._state |= STATE_ACTIVE;
			} else {
				this._state &= ~STATE_ACTIVE;
			}

			if (currentlyRelease && this._level > (prevLevel as number)) {
				this._addToRelease();
				return false;
			}
		} else {
			value = this._tryPull();
		}

		if (value === $error) {
			this._fail($error.error, false);
			return true;
		}

		return this._push(value, false, true);
	}

	_tryPull(): any {
		if (this._state & STATE_CURRENTLY_PULLING) {
			throw new TypeError('Circular pulling detected');
		}

		let pull = this._pull!;

		if (pull.length) {
			if (this._selfPendingStatusCell) {
				this._selfPendingStatusCell.set(true);
			}
			this._state |= STATE_PENDING;
		}

		let prevCell = currentCell;
		currentCell = this;

		this._masters = null;
		this._level = 0;
		this._state |= STATE_CURRENTLY_PULLING;

		try {
			return pull.length ? pull.call(this.context, this, this._value) : pull.call(this.context);
		} catch (err) {
			$error.error = err;
			return $error;
		} finally {
			currentCell = prevCell;

			this._version = releaseVersion + +(currentlyRelease > 0);

			let pendingStatusCell = this._pendingStatusCell;

			if (pendingStatusCell && (pendingStatusCell._state & STATE_ACTIVE)) {
				pendingStatusCell.pull();
			}

			let errorCell = this._errorCell;

			if (errorCell && (errorCell._state & STATE_ACTIVE)) {
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

			errorCell = this._errorCell = new Cell<Error | null>(function(this: Cell) {
				this.get();

				let err = this._selfErrorCell!.get();
				let errorIndex;

				if (err) {
					errorIndex = this._errorIndex;

					if (errorIndex == errorIndexCounter) {
						return err;
					}
				}

				let masters = this._masters;

				if (masters) {
					let i = masters.length;

					do {
						let master = masters[--i];
						let masterError = master.getError();

						if (masterError) {
							let masterErrorIndex = master._errorIndex;

							if (masterErrorIndex == errorIndexCounter) {
								return masterError;
							}

							if (!err || errorIndex as number < masterErrorIndex) {
								err = masterError;
								errorIndex = masterErrorIndex;
							}
						}
					} while (i);
				}

				return err;
			}, debugKey ? { debugKey: debugKey + '._errorCell', context: this } : { context: this });
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

			pendingStatusCell = this._pendingStatusCell = new Cell<boolean>(function(this: Cell) {
				if (this._selfPendingStatusCell!.get()) {
					return true;
				}

				this.get();

				let masters = this._masters;

				if (masters) {
					let i = masters.length;

					do {
						if (masters[--i].isPending()) {
							return true;
						}
					} while (i);
				}

				return false;
			}, debugKey ? { debugKey: debugKey + '._pendingStatusCell', context: this } : { context: this });
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

	_push(value: any, external: boolean, pulling: boolean): boolean {
		this._state |= STATE_INITED;

		let prev = this._value;

		if (external && currentCell && (this._state & STATE_HAS_FOLLOWERS)) {
			if (is(value, prev)) {
				if (this._error) {
					this._setError(null);
				}

				this._resolvePending();

				return false;
			}

			(afterRelease || (afterRelease = [])).push([this, value]);

			return true;
		}

		if (external || !currentlyRelease && pulling) {
			this._pushingIndex = ++pushingIndexCounter;
		}

		if (this._error) {
			this._setError(null);
		}

		if (is(value, prev)) {
			if (external || currentlyRelease && pulling) {
				this._resolvePending();
			}

			return false;
		}

		this._value = value;

		if (prev instanceof EventEmitter) {
			prev.off('change', this._onValueChange, this);
		}
		if (value instanceof EventEmitter) {
			value.on('change', this._onValueChange, this);
		}

		if (this._state & STATE_HAS_FOLLOWERS) {
			if (this._changeEvent) {
				if (is(value, this._fixedValue) && (this._state & STATE_CAN_CANCEL_CHANGE)) {
					this._levelInRelease = -1;
					this._changeEvent = null;
				} else {
					this._changeEvent = {
						target: this,
						type: 'change',
						data: {
							prevEvent: this._changeEvent,
							prevValue: prev,
							value
						}
					};
				}
			} else {
				this._state |= STATE_CAN_CANCEL_CHANGE;
				this._changeEvent = {
					target: this,
					type: 'change',
					data: {
						prevEvent: null,
						prevValue: prev,
						value
					}
				};

				this._addToRelease();
			}
		} else {
			if (external || !currentlyRelease && pulling) {
				releaseVersion++;
			}

			this._fixedValue = value;
			this._version = releaseVersion + +(currentlyRelease > 0);
		}

		if (external || currentlyRelease && pulling) {
			this._resolvePending();
		}

		return true;
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

	fail(err: any): this {
		this._fail(err, true);
		return this;
	}

	_fail(err: any, external: boolean) {
		error('[' + this.debugKey + ']', err);

		if (!(err instanceof Error)) {
			err = new Error(String(err));
		}

		this._setError(err);

		if (external) {
			this._resolvePending();
		}
	}

	_setError(err: Error | null) {
		this._error = err;
		if (this._selfErrorCell) {
			this._selfErrorCell.set(err);
		}

		if (err) {
			this._errorIndex = ++errorIndexCounter;

			this._handleErrorEvent({
				target: this,
				type: 'error',
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

		let slaves = this._slaves;

		for (let i = 0, l = slaves.length; i < l; i++) {
			slaves[i]._handleErrorEvent(evt);
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

	reap(): this {
		let slaves = this._slaves;

		for (let i = 0, l = slaves.length; i < l; i++) {
			slaves[i].reap();
		}

		return this.off();
	}

	dispose(): this {
		return this.reap();
	}
}
