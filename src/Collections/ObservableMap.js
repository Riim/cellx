import EventEmitter from '../EventEmitter';
import Map from '../JS/Map';
import { is } from '../JS/Object';
import Symbol from '../JS/Symbol';
import mixin from '../Utils/mixin';
import ObservableCollectionMixin from './ObservableCollectionMixin';

/**
 * @class cellx.ObservableMap
 * @extends {cellx.EventEmitter}
 * @implements {cellx.ObservableCollectionMixin}
 *
 * @typesign new ObservableMap(entries?: Object | cellx.ObservableMap | Map | Array<{ 0, 1 }>, opts?: {
 *     adoptsValueChanges?: boolean
 * }) -> cellx.ObservableMap;
 *
 * @typesign new ObservableMap(
 *     entries?: Object | cellx.ObservableMap | Map | Array<{ 0, 1 }>,
 *     adoptsValueChanges?: boolean
 * ) -> cellx.ObservableMap;
 */
export default function ObservableMap(entries, opts) {
	EventEmitter.call(this);
	ObservableCollectionMixin.call(this);

	if (typeof opts == 'boolean') {
		opts = { adoptsValueChanges: opts };
	}

	this._entries = new Map();

	this.size = 0;

	/**
	 * @type {boolean}
	 */
	this.adoptsValueChanges = !!(opts && opts.adoptsValueChanges);

	if (entries) {
		var mapEntries = this._entries;

		if (entries instanceof ObservableMap || entries instanceof Map) {
			entries._entries.forEach(function(value, key) {
				this._registerValue(value);
				mapEntries.set(key, value);
			}, this);
		} else if (Array.isArray(entries)) {
			for (var i = 0, l = entries.length; i < l; i++) {
				var entry = entries[i];

				this._registerValue(entry[1]);
				mapEntries.set(entry[0], entry[1]);
			}
		} else {
			for (var key in entries) {
				this._registerValue(entries[key]);
				mapEntries.set(key, entries[key]);
			}
		}

		this.size = mapEntries.size;
	}
}

ObservableMap.prototype = mixin({ __proto__: EventEmitter.prototype }, ObservableCollectionMixin.prototype, {
	constructor: ObservableMap,

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
	delete: function delete_(key) {
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
			value: undefined
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

		if (this.adoptsValueChanges) {
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
	 *     callback: (value, key, map: cellx.ObservableMap),
	 *     context?
	 * );
	 */
	forEach: function forEach(callback, context) {
		this._entries.forEach(function(value, key) {
			callback.call(context, value, key, this);
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
			adoptsValueChanges: this.adoptsValueChanges
		});
	}
});

ObservableMap.prototype[Symbol.iterator] = ObservableMap.prototype.entries;
