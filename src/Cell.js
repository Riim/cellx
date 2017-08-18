import { Symbol } from '@riim/symbol-polyfill';
import { Map } from '@riim/map-set-polyfill';
import ErrorLogger from './ErrorLogger';
import EventEmitter from './EventEmitter';
import is from './Utils/is';
import mixin from './Utils/mixin';
import nextTick from './Utils/nextTick';
import noop from './Utils/noop';

var slice = Array.prototype.slice;
var EventEmitterProto = EventEmitter.prototype;

var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 0x1fffffffffffff;
var KEY_WRAPPERS = Symbol('wrappers');

var errorIndexCounter = 0;
var pushingIndexCounter = 0;

var releasePlan = new Map();
var releasePlanIndex = MAX_SAFE_INTEGER;
var releasePlanToIndex = -1;
var releasePlanned = false;
var currentlyRelease = false;
var currentCell = null;
var error = { original: null };
var releaseVersion = 1;

var transactionLevel = 0;
var transactionFailure = false;
var pendingReactions = [];

var afterReleaseCallbacks;

var STATE_INITED = 1 << 7;
var STATE_CURRENTLY_PULLING = 1 << 6;
var STATE_ACTIVE = 1 << 5;
var STATE_HAS_FOLLOWERS = 1 << 4;
var STATE_PENDING = 1 << 3;
var STATE_FULFILLED = 1 << 2;
var STATE_REJECTED = 1 << 1;
var STATE_CAN_CANCEL_CHANGE = 1;

function release() {
	if (!releasePlanned) {
		return;
	}

	releasePlanned = false;
	currentlyRelease = true;

	var queue = releasePlan.get(releasePlanIndex);

	for (;;) {
		var cell = queue && queue.shift();

		if (!cell) {
			if (releasePlanIndex == releasePlanToIndex) {
				break;
			}

			queue = releasePlan.get(++releasePlanIndex);
			continue;
		}

		var level = cell._level;
		var changeEvent = cell._changeEvent;

		if (!changeEvent) {
			if (level > releasePlanIndex || cell._levelInRelease == -1) {
				if (!queue.length) {
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
				if (!queue.length) {
					queue = releasePlan.get(++releasePlanIndex);
				}

				continue;
			}

			changeEvent = cell._changeEvent;
		}

		cell._levelInRelease = -1;

		if (changeEvent) {
			var oldReleasePlanIndex = releasePlanIndex;

			cell._fixedValue = cell._value;
			cell._changeEvent = null;

			cell._handleEvent(changeEvent);

			var pushingIndex = cell._pushingIndex;
			var slaves = cell._slaves;

			for (var i = 0, l = slaves.length; i < l; i++) {
				var slave = slaves[i];

				if (slave._level <= level) {
					slave._level = level + 1;
				}

				if (pushingIndex >= slave._pushingIndex) {
					slave._pushingIndex = pushingIndex;
					slave._changeEvent = null;

					slave._addToRelease();
				}
			}

			if (releasePlanIndex != oldReleasePlanIndex) {
				queue = releasePlan.get(releasePlanIndex);
				continue;
			}
		}

		if (!queue.length) {
			if (releasePlanIndex == releasePlanToIndex) {
				break;
			}

			queue = releasePlan.get(++releasePlanIndex);
		}
	}

	releasePlanIndex = MAX_SAFE_INTEGER;
	releasePlanToIndex = -1;
	currentlyRelease = false;
	releaseVersion++;

	if (afterReleaseCallbacks) {
		var callbacks = afterReleaseCallbacks;

		afterReleaseCallbacks = null;

		for (var j = 0, m = callbacks.length; j < m; j++) {
			callbacks[j]();
		}
	}
}

/**
 * @typesign (cell: Cell, value);
 */
function defaultPut(cell, value) {
	cell.push(value);
}

var config = {
	asynchronous: true
};

/**
 * @class cellx.Cell
 * @extends {cellx.EventEmitter}
 *
 * @example
 * var a = new Cell(1);
 * var b = new Cell(2);
 * var c = new Cell(function() {
 *     return a.get() + b.get();
 * });
 *
 * c.on('change', function() {
 *     console.log('c = ' + c.get());
 * });
 *
 * console.log(c.get());
 * // => 3
 *
 * a.set(5);
 * b.set(10);
 * // => 'c = 15'
 *
 * @typesign new Cell(value?, opts?: {
 *     debugKey?: string,
 *     context?: Object,
 *     get?: (value) -> *,
 *     validate?: (value, oldValue),
 *     merge: (value, oldValue) -> *,
 *     put?: (cell: Cell, value, oldValue),
 *     reap?: (),
 *     onChange?: (evt: cellx~Event) -> ?boolean,
 *     onError?: (evt: cellx~Event) -> ?boolean
 * }) -> cellx.Cell;
 *
 * @typesign new Cell(pull: (cell: Cell, next) -> *, opts?: {
 *     debugKey?: string,
 *     context?: Object,
 *     get?: (value) -> *,
 *     validate?: (value, oldValue),
 *     merge: (value, oldValue) -> *,
 *     put?: (cell: Cell, value, oldValue),
 *     reap?: (),
 *     onChange?: (evt: cellx~Event) -> ?boolean,
 *     onError?: (evt: cellx~Event) -> ?boolean
 * }) -> cellx.Cell;
 */
export default function Cell(value, opts) {
	EventEmitter.call(this);

	this.debugKey = opts && opts.debugKey;

	this.context = opts && (opts.context || opts.owner) || this;

	this._pull = typeof value == 'function' ? value : null;
	this._get = opts && opts.get || null;

	this._validate = opts && opts.validate || null;
	this._merge = opts && opts.merge || null;
	this._put = opts && opts.put || defaultPut;

	this._onFulfilled = this._onRejected = null;

	this._reap = opts && opts.reap || null;

	if (this._pull) {
		this._fixedValue = this._value = undefined;
	} else {
		if (this._validate) {
			this._validate(value, undefined);
		}
		if (this._merge) {
			value = this._merge(value, undefined);
		}

		this._fixedValue = this._value = value;

		if (value instanceof EventEmitter) {
			value.on('change', this._onValueChange, this);
		}
	}

	this._error = null;
	this._selfErrorCell = null;
	this._errorCell = null;

	this._errorIndex = 0;
	this._pushingIndex = 0;
	this._version = 0;

	/**
	 * Ведущие ячейки.
	 * @type {?Array<cellx.Cell>}
	 */
	this._masters = undefined;
	/**
	 * Ведомые ячейки.
	 * @type {Array<cellx.Cell>}
	 */
	this._slaves = [];

	this._level = 0;
	this._levelInRelease = -1;

	this._selfPendingStatusCell = null;
	this._pendingStatusCell = null;

	this._status = null;

	this._changeEvent = null;
	this._lastErrorEvent = null;

	this._state = STATE_CAN_CANCEL_CHANGE;

	if (opts) {
		if (opts.onChange) {
			this.on('change', opts.onChange);
		}
		if (opts.onError) {
			this.on('error', opts.onError);
		}
	}
}

mixin(Cell, {
	/**
	 * @typesign (cnfg: { asynchronous?: boolean });
	 */
	configure: function configure(cnfg) {
		if (cnfg.asynchronous !== undefined) {
			if (releasePlanned) {
				release();
			}

			config.asynchronous = cnfg.asynchronous;
		}
	},

	/**
	 * @type {boolean}
	 */
	get currentlyPulling() {
		return !!currentCell;
	},

	/**
	 * @typesign (callback: (), context?) -> ();
	 */
	autorun: function autorun(callback, context) {
		var disposer;

		new Cell(function() {
			var cell = this;

			if (!disposer) {
				disposer = function disposer() {
					cell.dispose();
				};
			}

			if (transactionLevel) {
				var index = pendingReactions.indexOf(this);

				if (index != -1) {
					pendingReactions.splice(index, 1);
				}

				pendingReactions.push(this);
			} else {
				callback.call(context, disposer);
			}
		}, { onChange: noop });

		return disposer;
	},

	/**
	 * @typesign ();
	 */
	forceRelease: function forceRelease() {
		if (releasePlanned) {
			release();
		}
	},

	/**
	 * @typesign (callback: ());
	 */
	transaction: function transaction(callback) {
		if (!transactionLevel++ && releasePlanned) {
			release();
		}

		try {
			callback();
		} catch (err) {
			ErrorLogger.log(err);
			transactionFailure = true;
		}

		if (transactionFailure) {
			for (var iterator = releasePlan.values(), step; !(step = iterator.next()).done;) {
				var queue = step.value;

				for (var i = queue.length; i;) {
					var cell = queue[--i];
					cell._value = cell._fixedValue;
					cell._levelInRelease = -1;
					cell._changeEvent = null;
				}
			}

			releasePlan.clear();
			releasePlanIndex = MAX_SAFE_INTEGER;
			releasePlanToIndex = -1;
			releasePlanned = false;
			pendingReactions.length = 0;
		}

		if (!--transactionLevel && !transactionFailure) {
			for (var i = 0, l = pendingReactions.length; i < l; i++) {
				var reaction = pendingReactions[i];

				if (reaction instanceof Cell) {
					reaction.pull();
				} else {
					EventEmitterProto._handleEvent.call(reaction[1], reaction[0]);
				}
			}

			transactionFailure = false;
			pendingReactions.length = 0;

			if (releasePlanned) {
				release();
			}
		}
	},

	/**
	 * @typesign (callback: ());
	 */
	afterRelease: function afterRelease(callback) {
		(afterReleaseCallbacks || (afterReleaseCallbacks = [])).push(callback);
	}
});

Cell.prototype = {
	__proto__: EventEmitter.prototype,

	constructor: Cell,

	_handleEvent: function _handleEvent(evt) {
		if (transactionLevel) {
			pendingReactions.push([evt, this]);
		} else {
			EventEmitterProto._handleEvent.call(this, evt);
		}
	},

	/**
	 * @override
	 */
	on: function on(type, listener, context) {
		if (releasePlanned) {
			release();
		}

		this._activate();

		if (typeof type == 'object') {
			EventEmitterProto.on.call(this, type, listener !== undefined ? listener : this.context);
		} else {
			EventEmitterProto.on.call(this, type, listener, context !== undefined ? context : this.context);
		}

		this._state |= STATE_HAS_FOLLOWERS;

		return this;
	},
	/**
	 * @override
	 */
	off: function off(type, listener, context) {
		if (releasePlanned) {
			release();
		}

		if (type) {
			if (typeof type == 'object') {
				EventEmitterProto.off.call(this, type, listener !== undefined ? listener : this.context);
			} else {
				EventEmitterProto.off.call(this, type, listener, context !== undefined ? context : this.context);
			}
		} else {
			EventEmitterProto.off.call(this);
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
	},

	/**
	 * @typesign (
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.Cell;
	 */
	addChangeListener: function addChangeListener(listener, context) {
		return this.on('change', listener, context !== undefined ? context : this.context);
	},
	/**
	 * @typesign (
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.Cell;
	 */
	removeChangeListener: function removeChangeListener(listener, context) {
		return this.off('change', listener, context !== undefined ? context : this.context);
	},

	/**
	 * @typesign (
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.Cell;
	 */
	addErrorListener: function addErrorListener(listener, context) {
		return this.on('error', listener, context !== undefined ? context : this.context);
	},
	/**
	 * @typesign (
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.Cell;
	 */
	removeErrorListener: function removeErrorListener(listener, context) {
		return this.off('error', listener, context !== undefined ? context : this.context);
	},

	/**
	 * @typesign (
	 *     listener: (err: ?Error, evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.Cell;
	 */
	subscribe: function subscribe(listener, context) {
		var wrappers = listener[KEY_WRAPPERS];

		if (wrappers && wrappers.has(listener)) {
			return this;
		}

		function wrapper(evt) {
			return listener.call(this, evt.error || null, evt);
		}
		(wrappers || (listener[KEY_WRAPPERS] = new Map())).set(this, wrapper);

		if (context === undefined) {
			context = this.context;
		}

		return this
			.on('change', wrapper, context)
			.on('error', wrapper, context);
	},
	/**
	 * @typesign (
	 *     listener: (err: ?Error, evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.Cell;
	 */
	unsubscribe: function unsubscribe(listener, context) {
		var wrappers = listener[KEY_WRAPPERS];
		var wrapper = wrappers && wrappers.get(this);

		if (!wrapper) {
			return this;
		}

		wrappers.delete(this);

		if (context === undefined) {
			context = this.context;
		}

		return this
			.off('change', wrapper, context)
			.off('error', wrapper, context);
	},

	/**
	 * @typesign (slave: cellx.Cell);
	 */
	_registerSlave: function _registerSlave(slave) {
		this._activate();

		this._slaves.push(slave);
		this._state |= STATE_HAS_FOLLOWERS;
	},
	/**
	 * @typesign (slave: cellx.Cell);
	 */
	_unregisterSlave: function _unregisterSlave(slave) {
		this._slaves.splice(this._slaves.indexOf(slave), 1);

		if (!this._slaves.length && !this._events.has('change') && !this._events.has('error')) {
			this._state ^= STATE_HAS_FOLLOWERS;

			this._deactivate();

			if (this._reap) {
				this._reap.call(this.context);
			}
		}
	},

	/**
	 * @typesign ();
	 */
	_activate: function _activate() {
		if (!this._pull || (this._state & STATE_ACTIVE) || this._masters === null) {
			return;
		}

		var masters = this._masters;

		if (this._version < releaseVersion) {
			var value = this._tryPull();

			if (masters || this._masters || !(this._state & STATE_INITED)) {
				if (value === error) {
					this._fail(error.original, false);
				} else {
					this._push(value, false, false);
				}
			}

			masters = this._masters;
		}

		if (masters) {
			var i = masters.length;

			do {
				masters[--i]._registerSlave(this);
			} while (i);

			this._state |= STATE_ACTIVE;
		}
	},
	/**
	 * @typesign ();
	 */
	_deactivate: function _deactivate() {
		if (!(this._state & STATE_ACTIVE)) {
			return;
		}

		var masters = this._masters;
		var i = masters.length;

		do {
			masters[--i]._unregisterSlave(this);
		} while (i);

		if (this._levelInRelease != -1 && !this._changeEvent) {
			this._levelInRelease = -1;
		}

		this._state ^= STATE_ACTIVE;
	},

	/**
	 * @typesign ();
	 */
	_addToRelease: function _addToRelease() {
		var level = this._level;

		if (level <= this._levelInRelease) {
			return;
		}

		var queue;

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

			if (!transactionLevel && !config.asynchronous) {
				release();
			} else {
				nextTick(release);
			}
		}
	},

	/**
	 * @typesign (evt: cellx~Event);
	 */
	_onValueChange: function _onValueChange(evt) {
		this._pushingIndex = ++pushingIndexCounter;

		if (this._changeEvent) {
			evt.prev = this._changeEvent;
			this._changeEvent = evt;

			if (this._value === this._fixedValue) {
				this._state &= ~STATE_CAN_CANCEL_CHANGE;
			}
		} else {
			evt.prev = null;
			this._changeEvent = evt;
			this._state &= ~STATE_CAN_CANCEL_CHANGE;

			this._addToRelease();
		}
	},

	/**
	 * @typesign () -> *;
	 */
	get: function get() {
		if (releasePlanned && this._pull) {
			release();
		}

		if (this._pull && !(this._state & STATE_ACTIVE) && this._version < releaseVersion && this._masters !== null) {
			var oldMasters = this._masters;
			var value = this._tryPull();
			var masters = this._masters;

			if (oldMasters || masters || !(this._state & STATE_INITED)) {
				if (masters && (this._state & STATE_HAS_FOLLOWERS)) {
					var i = masters.length;

					do {
						masters[--i]._registerSlave(this);
					} while (i);

					this._state |= STATE_ACTIVE;
				}

				if (value === error) {
					this._fail(error.original, false);
				} else {
					this._push(value, false, false);
				}
			}
		}

		if (currentCell) {
			var currentCellMasters = currentCell._masters;
			var level = this._level;

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

		return this._get ? this._get(this._value) : this._value;
	},

	/**
	 * @typesign () -> boolean;
	 */
	pull: function pull() {
		if (!this._pull) {
			return false;
		}

		if (releasePlanned) {
			release();
		}

		var hasFollowers = this._state & STATE_HAS_FOLLOWERS;

		var oldMasters;
		var oldLevel;

		if (hasFollowers) {
			oldMasters = this._masters;
			oldLevel = this._level;
		}

		var value = this._tryPull();

		if (hasFollowers) {
			var masters = this._masters;
			var newMasterCount = 0;

			if (masters) {
				var i = masters.length;

				do {
					var master = masters[--i];

					if (!oldMasters || oldMasters.indexOf(master) == -1) {
						master._registerSlave(this);
						newMasterCount++;
					}
				} while (i);
			}

			if (oldMasters && (masters ? masters.length - newMasterCount : 0) < oldMasters.length) {
				for (var j = oldMasters.length; j;) {
					var oldMaster = oldMasters[--j];

					if (!masters || masters.indexOf(oldMaster) == -1) {
						oldMaster._unregisterSlave(this);
					}
				}
			}

			if (masters && masters.length) {
				this._state |= STATE_ACTIVE;
			} else {
				this._state &= ~STATE_ACTIVE;
			}

			if (currentlyRelease && this._level > oldLevel) {
				this._addToRelease();
				return false;
			}
		}

		if (value === error) {
			this._fail(error.original, false);
			return true;
		}

		return this._push(value, false, true);
	},

	/**
	 * @typesign () -> *;
	 */
	_tryPull: function _tryPull() {
		if (this._state & STATE_CURRENTLY_PULLING) {
			throw new TypeError('Circular pulling detected');
		}

		var pull = this._pull;

		if (pull.length) {
			this._state |= STATE_PENDING;
			if (this._selfPendingStatusCell) {
				this._selfPendingStatusCell.set(true);
			}

			this._state &= ~(STATE_FULFILLED | STATE_REJECTED);
		}

		var prevCell = currentCell;
		currentCell = this;

		this._state |= STATE_CURRENTLY_PULLING;
		this._masters = null;
		this._level = 0;

		try {
			return pull.length ? pull.call(this.context, this, this._value) : pull.call(this.context);
		} catch (err) {
			error.original = err;
			return error;
		} finally {
			currentCell = prevCell;

			this._version = releaseVersion + currentlyRelease;

			var pendingStatusCell = this._pendingStatusCell;

			if (pendingStatusCell && (pendingStatusCell._state & STATE_ACTIVE)) {
				pendingStatusCell.pull();
			}

			var errorCell = this._errorCell;

			if (errorCell && (errorCell._state & STATE_ACTIVE)) {
				errorCell.pull();
			}

			this._state ^= STATE_CURRENTLY_PULLING;
		}
	},

	/**
	 * @typesign () -> ?Error;
	 */
	getError: function getError() {
		var errorCell = this._errorCell;

		if (!errorCell) {
			var debugKey = this.debugKey;

			this._selfErrorCell = new Cell(this._error, debugKey ? { debugKey: debugKey + '._selfErrorCell' } : null);

			errorCell = this._errorCell = new Cell(function() {
				this.get();

				var err = this._selfErrorCell.get();
				var index;

				if (err) {
					index = this._errorIndex;

					if (index == errorIndexCounter) {
						return err;
					}
				}

				var masters = this._masters;

				if (masters) {
					var i = masters.length;

					do {
						var master = masters[--i];
						var masterError = master.getError();

						if (masterError) {
							var masterErrorIndex = master._errorIndex;

							if (masterErrorIndex == errorIndexCounter) {
								return masterError;
							}

							if (!err || index < masterErrorIndex) {
								err = masterError;
								index = masterErrorIndex;
							}
						}
					} while (i);
				}

				return err;
			}, debugKey ? { debugKey: debugKey + '._errorCell', context: this } : { context: this });
		}

		return errorCell.get();
	},

	/**
	 * @typesign () -> boolean;
	 */
	isPending: function isPending() {
		var pendingStatusCell = this._pendingStatusCell;

		if (!pendingStatusCell) {
			var debugKey = this.debugKey;

			this._selfPendingStatusCell = new Cell(
				!!(this._state & STATE_PENDING),
				debugKey ? { debugKey: debugKey + '._selfPendingStatusCell' } : null
			);

			pendingStatusCell = this._pendingStatusCell = new Cell(function() {
				if (this._selfPendingStatusCell.get()) {
					return true;
				}

				this.get();

				var masters = this._masters;

				if (masters) {
					var i = masters.length;

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
	},

	getStatus: function getStatus() {
		var status = this._status;

		if (!status) {
			var cell = this;

			status = this._status = {
				get success() {
					return !cell.getError();
				},

				get pending() {
					return cell.isPending();
				}
			};
		}

		return status;
	},

	/**
	 * @typesign (value) -> cellx.Cell;
	 */
	set: function set(value) {
		if (this._validate) {
			this._validate(value, this._value);
		}
		if (this._merge) {
			value = this._merge(value, this._value);
		}

		this._state |= STATE_PENDING;
		if (this._selfPendingStatusCell) {
			this._selfPendingStatusCell.set(true);
		}

		this._state &= ~(STATE_FULFILLED | STATE_REJECTED);

		if (this._put.length >= 3) {
			this._put.call(this.context, this, value, this._value);
		} else {
			this._put.call(this.context, this, value);
		}

		return this;
	},

	/**
	 * @typesign (value) -> cellx.Cell;
	 */
	push: function push(value) {
		this._push(value, true, false);
		return this;
	},

	/**
	 * @typesign (value, external: boolean, pulling: boolean) -> boolean;
	 */
	_push: function _push(value, external, pulling) {
		this._state |= STATE_INITED;

		var oldValue = this._value;

		if (external && currentlyRelease && (this._state & STATE_HAS_FOLLOWERS)) {
			if (is(value, oldValue)) {
				this._setError(null);
				this._fulfill(value);
				return false;
			}

			var cell = this;

			(afterReleaseCallbacks || (afterReleaseCallbacks = [])).push(function() {
				cell._push(value, true, false);
			});

			return true;
		}

		if (external || !currentlyRelease && pulling) {
			this._pushingIndex = ++pushingIndexCounter;
		}

		this._setError(null);

		if (is(value, oldValue)) {
			if (external || currentlyRelease && pulling) {
				this._fulfill(value);
			}

			return false;
		}

		this._value = value;

		if (oldValue instanceof EventEmitter) {
			oldValue.off('change', this._onValueChange, this);
		}
		if (value instanceof EventEmitter) {
			value.on('change', this._onValueChange, this);
		}

		if ((this._state & STATE_HAS_FOLLOWERS) || transactionLevel) {
			if (this._changeEvent) {
				if (is(value, this._fixedValue) && (this._state & STATE_CAN_CANCEL_CHANGE)) {
					this._levelInRelease = -1;
					this._changeEvent = null;
				} else {
					this._changeEvent = {
						target: this,
						type: 'change',
						oldValue: oldValue,
						value: value,
						prev: this._changeEvent
					};
				}
			} else {
				this._changeEvent = {
					target: this,
					type: 'change',
					oldValue: oldValue,
					value: value,
					prev: null
				};
				this._state |= STATE_CAN_CANCEL_CHANGE;

				this._addToRelease();
			}
		} else {
			if (external || !currentlyRelease && pulling) {
				releaseVersion++;
			}

			this._fixedValue = value;
			this._version = releaseVersion + currentlyRelease;
		}

		if (external || currentlyRelease && pulling) {
			this._fulfill(value);
		}

		return true;
	},

	/**
	 * @typesign (value);
	 */
	_fulfill: function _fulfill(value) {
		this._resolvePending();

		if (!(this._state & STATE_FULFILLED)) {
			this._state |= STATE_FULFILLED;

			if (this._onFulfilled) {
				this._onFulfilled(value);
			}
		}
	},

	/**
	 * @typesign (err) -> cellx.Cell;
	 */
	fail: function fail(err) {
		this._fail(err, true);
		return this;
	},

	/**
	 * @typesign (err, external: boolean);
	 */
	_fail: function _fail(err, external) {
		if (transactionLevel) {
			transactionFailure = true;
		}

		this._logError(err);

		if (!(err instanceof Error)) {
			err = new Error(String(err));
		}

		this._setError(err);

		if (external) {
			this._reject(err);
		}
	},

	/**
	 * @typesign (err: ?Error);
	 */
	_setError: function _setError(err) {
		if (!err && !this._error) {
			return;
		}

		this._error = err;
		if (this._selfErrorCell) {
			this._selfErrorCell.set(err);
		}

		if (err) {
			this._errorIndex = ++errorIndexCounter;

			this._handleErrorEvent({
				type: 'error',
				error: err
			});
		}
	},

	/**
	 * @typesign (evt: cellx~Event{ error: Error });
	 */
	_handleErrorEvent: function _handleErrorEvent(evt) {
		if (this._lastErrorEvent === evt) {
			return;
		}

		this._lastErrorEvent = evt;
		this._handleEvent(evt);

		var slaves = this._slaves;

		for (var i = 0, l = slaves.length; i < l; i++) {
			slaves[i]._handleErrorEvent(evt);
		}
	},

	/**
	 * @typesign (err: Error);
	 */
	_reject: function _reject(err) {
		this._resolvePending();

		if (!(this._state & STATE_REJECTED)) {
			this._state |= STATE_REJECTED;

			if (this._onRejected) {
				this._onRejected(err);
			}
		}
	},

	/**
	 * @typesign ();
	 */
	_resolvePending: function _resolvePending() {
		if (this._state & STATE_PENDING) {
			this._state ^= STATE_PENDING;

			if (this._selfPendingStatusCell) {
				this._selfPendingStatusCell.set(false);
			}
		}
	},

	/**
	 * @typesign (onFulfilled: ?(value) -> *, onRejected?: (err) -> *) -> Promise;
	 */
	then: function then(onFulfilled, onRejected) {
		if (releasePlanned) {
			release();
		}

		if (!this._pull || (this._state & STATE_FULFILLED)) {
			return Promise.resolve(this._get ? this._get(this._value) : this._value).then(onFulfilled);
		}
		if (this._state & STATE_REJECTED) {
			return Promise.reject(this._error).catch(onRejected);
		}

		var cell = this;

		var promise = new Promise(function(resolve, reject) {
			cell._onFulfilled = function onFulfilled(value) {
				cell._onFulfilled = cell._onRejected = null;
				resolve(cell._get ? cell._get(value) : value);
			};

			cell._onRejected = function onRejected(err) {
				cell._onFulfilled = cell._onRejected = null;
				reject(err);
			};
		}).then(onFulfilled, onRejected);

		if (!(this._state & STATE_PENDING)) {
			this.pull();
		}

		if (cell.isPending()) {
			cell._pendingStatusCell.on('change', function onPendingStatusCellChange() {
				cell._pendingStatusCell.off('change', onPendingStatusCellChange);

				if (!(cell._state & STATE_FULFILLED) && !(cell._state & STATE_REJECTED)) {
					var err = cell.getError();

					if (err) {
						cell._reject(err);
					} else {
						cell._fulfill(cell._get ? cell._get(cell._value) : cell._value);
					}
				}
			});
		}

		return promise;
	},

	/**
	 * @typesign (onRejected: (err) -> *) -> Promise;
	 */
	catch: function catch_(onRejected) {
		return this.then(null, onRejected);
	},

	/**
	 * @override
	 */
	_logError: function _logError() {
		var msg = slice.call(arguments);

		if (this.debugKey) {
			msg.unshift('[' + this.debugKey + ']');
		}

		EventEmitterProto._logError.apply(this, msg);
	},

	/**
	 * @typesign () -> cellx.Cell;
	 */
	reap: function reap() {
		var slaves = this._slaves;

		for (var i = 0, l = slaves.length; i < l; i++) {
			slaves[i].reap();
		}

		return this.off();
	},

	/**
	 * @typesign () -> cellx.Cell;
	 */
	dispose: function dispose() {
		return this.reap();
	}
};

Cell.prototype[Symbol.iterator] = function() {
	return this._value[Symbol.iterator]();
};
