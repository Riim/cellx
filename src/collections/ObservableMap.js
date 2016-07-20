var EventEmitter = require('../EventEmitter');
var ObservableCollectionMixin = require('./ObservableCollectionMixin');
var is = require('../js/is');
var Symbol = require('../js/Symbol');
var Map = require('../js/Map');

var hasOwn = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;
var global = Function('return this;')();

/**
 * @class cellx.ObservableMap
 * @extends {cellx.EventEmitter}
 * @implements {ObservableCollectionMixin}
 *
 * @typesign new ObservableMap(entries?: Object|cellx.ObservableMap|Map|Array<{ 0, 1 }>, opts?: {
 *     adoptsItemChanges?: boolean
 * }) -> cellx.ObservableMap;
 */
var ObservableMap = EventEmitter.extend({
	Implements: [ObservableCollectionMixin],

	constructor: function ObservableMap(entries, opts) {
		EventEmitter.call(this);
		ObservableCollectionMixin.call(this);

		this._entries = new Map();

		this.size = 0;

		/**
		 * @type {boolean}
		 */
		this.adoptsItemChanges = !opts || opts.adoptsItemChanges !== false;

		if (entries) {
			var mapEntries = this._entries;

			if (entries instanceof ObservableMap || entries instanceof Map) {
				entries._entries.forEach(function(value, key) {
					this._registerValue(value);
					mapEntries.set(key, value);
				}, this);
			} else if (isArray(entries)) {
				for (var i = 0, l = entries.length; i < l; i++) {
					var entry = entries[i];

					this._registerValue(entry[1]);
					mapEntries.set(entry[0], entry[1]);
				}
			} else {
				for (var key in entries) {
					if (hasOwn.call(entries, key)) {
						this._registerValue(entries[key]);
						mapEntries.set(key, entries[key]);
					}
				}
			}

			this.size = mapEntries.size;
		}
	},

	/**
	 * @typesign (key) -> boolean;
	 */
	has: function has(key) {
		return this._entries.has(key);
	},

	/**
	 * @typesign (value) -> boolean;
	 */
	contains: function contains(value) {
		return this._valueCounts.has(value);
	},

	/**
	 * @typesign (key) -> *;
	 */
	get: function get(key) {
		return this._entries.get(key);
	},

	/**
	 * @typesign (key, value) -> cellx.ObservableMap;
	 */
	set: function set(key, value) {
		var entries = this._entries;
		var hasKey = entries.has(key);
		var oldValue;

		if (hasKey) {
			oldValue = entries.get(key);

			if (is(value, oldValue)) {
				return this;
			}

			this._unregisterValue(oldValue);
		}

		this._registerValue(value);
		entries.set(key, value);

		if (!hasKey) {
			this.size++;
		}

		this.emit({
			type: 'change',
			subtype: hasKey ? 'update' : 'add',
			key: key,
			oldValue: oldValue,
			value: value
		});

		return this;
	},

	/**
	 * @typesign (key) -> boolean;
	 */
	delete: function _delete(key) {
		var entries = this._entries;

		if (!entries.has(key)) {
			return false;
		}

		var value = entries.get(key);

		this._unregisterValue(value);
		entries.delete(key);
		this.size--;

		this.emit({
			type: 'change',
			subtype: 'delete',
			key: key,
			oldValue: value,
			value: void 0
		});

		return true;
	},

	/**
	 * @typesign () -> cellx.ObservableMap;
	 */
	clear: function clear() {
		if (!this.size) {
			return this;
		}

		if (this.adoptsItemChanges) {
			this._valueCounts.forEach(function(value) {
				if (value instanceof EventEmitter) {
					value.off('change', this._onItemChange, this);
				}
			}, this);
		}

		this._entries.clear();
		this._valueCounts.clear();
		this.size = 0;

		this.emit({
			type: 'change',
			subtype: 'clear'
		});

		return this;
	},

	/**
	 * @typesign (
	 *     cb: (value, key, map: cellx.ObservableMap),
	 *     context?
	 * );
	 */
	forEach: function forEach(cb, context) {
		context = arguments.length >= 2 ? context : global;

		this._entries.forEach(function(value, key) {
			cb.call(context, value, key, this);
		}, this);
	},

	/**
	 * @typesign () -> { next: () -> { value, done: boolean } };
	 */
	keys: function keys() {
		return this._entries.keys();
	},

	/**
	 * @typesign () -> { next: () -> { value, done: boolean } };
	 */
	values: function values() {
		return this._entries.values();
	},

	/**
	 * @typesign () -> { next: () -> { value: { 0, 1 }, done: boolean } };
	 */
	entries: function entries() {
		return this._entries.entries();
	},

	/**
	 * @typesign () -> cellx.ObservableMap;
	 */
	clone: function clone() {
		return new this.constructor(this, {
			adoptsItemChanges: this.adoptsItemChanges
		});
	}
});

ObservableMap.prototype[Symbol.iterator] = ObservableMap.prototype.entries;

module.exports = ObservableMap;
