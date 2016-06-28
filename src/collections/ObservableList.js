var EventEmitter = require('../EventEmitter');
var ObservableCollectionMixin = require('./ObservableCollectionMixin');
var is = require('../js/is');
var Symbol = require('../js/Symbol');

var push = Array.prototype.push;
var splice = Array.prototype.splice;
var global = Function('return this;')();

/**
 * @typesign (a, b) -> -1|1|0;
 */
function defaultComparator(a, b) {
	if (a < b) { return -1; }
	if (a > b) { return 1; }
	return 0;
}

/**
 * @class cellx.ObservableList
 * @extends {cellx.EventEmitter}
 * @implements {ObservableCollectionMixin}
 *
 * @typesign new ObservableList(items?: Array|cellx.ObservableList, opts?: {
 *     adoptsItemChanges?: boolean,
 *     comparator?: (a, b) -> int,
 *     sorted?: boolean
 * }) -> cellx.ObservableList;
 */
var ObservableList = EventEmitter.extend({
	Implements: [ObservableCollectionMixin],

	constructor: function ObservableList(items, opts) {
		EventEmitter.call(this);
		ObservableCollectionMixin.call(this);

		if (!opts) {
			opts = {};
		}

		this._items = [];

		this.length = 0;

		/**
		 * @type {boolean}
		 */
		this.adoptsItemChanges = opts.adoptsItemChanges !== false;

		/**
		 * @type {?(a, b) -> int}
		 */
		this.comparator = null;

		this.sorted = false;

		if (opts.sorted || (opts.comparator && opts.sorted !== false)) {
			this.comparator = opts.comparator || defaultComparator;
			this.sorted = true;
		}

		if (items) {
			this._addRange(items instanceof ObservableList ? items._items : items);
		}
	},

	/**
	 * @typesign (index: ?int, allowedEndIndex?: boolean) -> ?uint;
	 */
	_validateIndex: function _validateIndex(index, allowedEndIndex) {
		if (index === void 0) {
			return index;
		}

		if (index < 0) {
			index += this.length;

			if (index < 0) {
				throw new RangeError('Index out of valid range');
			}
		} else if (index >= (this.length + (allowedEndIndex ? 1 : 0))) {
			throw new RangeError('Index out of valid range');
		}

		return index;
	},

	/**
	 * @typesign (value) -> boolean;
	 */
	contains: function contains(value) {
		return this._valueCounts.has(value);
	},

	/**
	 * @typesign (value, fromIndex?: int) -> int;
	 */
	indexOf: function indexOf(value, fromIndex) {
		return this._items.indexOf(value, this._validateIndex(fromIndex));
	},

	/**
	 * @typesign (value, fromIndex?: int) -> int;
	 */
	lastIndexOf: function lastIndexOf(value, fromIndex) {
		return this._items.lastIndexOf(value, fromIndex === void 0 ? -1 : this._validateIndex(fromIndex));
	},

	/**
	 * @typesign (index: int) -> *;
	 */
	get: function get(index) {
		return this._items[this._validateIndex(index)];
	},

	/**
	 * @typesign (index: int, count?: uint) -> Array;
	 */
	getRange: function getRange(index, count) {
		index = this._validateIndex(index, true);

		var items = this._items;

		if (count === void 0) {
			return items.slice(index);
		}

		if (index + count > items.length) {
			throw new RangeError('Sum of "index" and "count" out of valid range');
		}

		return items.slice(index, index + count);
	},

	/**
	 * @typesign (index: int, value) -> cellx.ObservableList;
	 */
	set: function set(index, value) {
		if (this.sorted) {
			throw new TypeError('Cannot set to sorted list');
		}

		index = this._validateIndex(index);

		var items = this._items;

		if (is(value, items[index])) {
			return this;
		}

		this._unregisterValue(items[index]);

		items[index] = value;
		this._registerValue(value);

		this.emit('change');

		return this;
	},

	/**
	 * @typesign (index: int, items: Array) -> cellx.ObservableList;
	 */
	setRange: function setRange(index, items) {
		if (this.sorted) {
			throw new TypeError('Cannot set to sorted list');
		}

		index = this._validateIndex(index);

		var itemCount = items.length;

		if (!itemCount) {
			return this;
		}

		if (index + itemCount > this.length) {
			throw new RangeError('Sum of "index" and "items.length" out of valid range');
		}

		var listItems = this._items;
		var changed = false;

		for (var i = index + itemCount; i > index;) {
			var item = items[--i - index];

			if (!is(item, listItems[i])) {
				this._unregisterValue(listItems[i]);

				listItems[i] = item;
				this._registerValue(item);

				changed = true;
			}
		}

		if (changed) {
			this.emit('change');
		}

		return this;
	},

	/**
	 * @typesign (item) -> cellx.ObservableList;
	 */
	add: function add(item) {
		this.addRange([item]);
		return this;
	},

	/**
	 * @typesign (items: Array) -> cellx.ObservableList;
	 */
	addRange: function addRange_(items) {
		if (!items.length) {
			return this;
		}

		this._addRange(items);
		this.emit('change');

		return this;
	},

	/**
	 * @typesign (items: Array);
	 */
	_addRange: function _addRange(items) {
		var listItems = this._items;

		if (this.sorted) {
			var comparator = this.comparator;

			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];
				var low = 0;
				var high = listItems.length;

				while (low != high) {
					var mid = (low + high) >> 1;

					if (comparator(item, listItems[mid]) < 0) {
						high = mid;
					} else {
						low = mid + 1;
					}
				}

				listItems.splice(low, 0, item);
				this._registerValue(item);
			}
		} else {
			push.apply(listItems, items);

			for (var j = items.length; j;) {
				this._registerValue(items[--j]);
			}
		}

		this.length = listItems.length;
	},

	/**
	 * @typesign (index: int, item) -> cellx.ObservableList;
	 */
	insert: function insert(index, item) {
		this.insertRange(index, [item]);
		return this;
	},

	/**
	 * @typesign (index: int, items: Array) -> cellx.ObservableList;
	 */
	insertRange: function insertRange(index, items) {
		if (this.sorted) {
			throw new TypeError('Cannot insert to sorted list');
		}

		index = this._validateIndex(index, true);

		var itemCount = items.length;

		if (!itemCount) {
			return this;
		}

		splice.apply(this._items, [index, 0].concat(items));

		for (var i = itemCount; i;) {
			this._registerValue(items[--i]);
		}

		this.length += itemCount;

		this.emit('change');

		return this;
	},

	/**
	 * @typesign (item, fromIndex?: int) -> boolean;
	 */
	remove: function remove(item, fromIndex) {
		var index = this._items.indexOf(item, this._validateIndex(fromIndex));

		if (index == -1) {
			return false;
		}

		this._items.splice(index, 1);
		this._unregisterValue(item);

		this.length--;

		this.emit('change');

		return true;
	},

	/**
	 * @typesign (item, fromIndex?: int) -> boolean;
	 */
	removeAll: function removeAll(item, fromIndex) {
		var index = this._validateIndex(fromIndex);
		var items = this._items;
		var changed = false;

		while ((index = items.indexOf(item, index)) != -1) {
			items.splice(index, 1);
			this._unregisterValue(item);

			changed = true;
		}

		if (!changed) {
			return false;
		}

		this.length = items.length;

		this.emit('change');

		return true;
	},

	/**
	 * @typesign (index: int) -> *;
	 */
	removeAt: function removeAt(index) {
		var removedItem = this._items.splice(this._validateIndex(index), 1)[0];

		this._unregisterValue(removedItem);
		this.length--;

		this.emit('change');

		return removedItem;
	},

	/**
	 * @typesign (index: int, count?: uint) -> Array;
	 */
	removeRange: function removeRange(index, count) {
		index = this._validateIndex(index, true);

		var items = this._items;

		if (count === void 0) {
			count = items.length - index;
		} else if (index + count > items.length) {
			throw new RangeError('Sum of "index" and "count" out of valid range');
		}

		if (!count) {
			return [];
		}

		for (var i = index + count; i > index;) {
			this._unregisterValue(items[--i]);
		}
		var removedItems = items.splice(index, count);

		this.length -= count;

		this.emit('change');

		return removedItems;
	},

	/**
	 * @typesign () -> cellx.ObservableList;
	 */
	clear: function clear() {
		if (this.length) {
			if (this.adoptsItemChanges) {
				this._valueCounts.forEach(function(value) {
					if (value instanceof EventEmitter) {
						value.off('change', this._onItemChange, this);
					}
				}, this);
			}

			this._items.length = 0;
			this._valueCounts.clear();

			this.length = 0;

			this.emit('change');
		}

		return this;
	},

	/**
	 * @typesign (separator?: string) -> string;
	 */
	join: function join(separator) {
		return this._items.join(separator);
	},

	/**
	 * @typesign (
	 *     cb: (item, index: uint, list: cellx.ObservableList),
	 *     context?
	 * );
	 */
	forEach: null,

	/**
	 * @typesign (
	 *     cb: (item, index: uint, list: cellx.ObservableList) -> *,
	 *     context?
	 * ) -> Array;
	 */
	map: null,

	/**
	 * @typesign (
	 *     cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean,
	 *     context?
	 * ) -> Array;
	 */
	filter: null,

	/**
	 * @typesign (
	 *     cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean,
	 *     context?
	 * ) -> *;
	 */
	find: function(cb, context) {
		context = arguments.length >= 2 ? context : global;

		var items = this._items;

		for (var i = 0, l = items.length; i < l; i++) {
			var item = items[i];

			if (cb.call(context, item, i, this)) {
				return item;
			}
		}
	},

	/**
	 * @typesign (
	 *     cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean,
	 *     context?
	 * ) -> int;
	 */
	findIndex: function(cb, context) {
		context = arguments.length >= 2 ? context : global;

		var items = this._items;

		for (var i = 0, l = items.length; i < l; i++) {
			if (cb.call(context, items[i], i, this)) {
				return i;
			}
		}

		return -1;
	},

	/**
	 * @typesign (
	 *     cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean,
	 *     context?
	 * ) -> boolean;
	 */
	every: null,

	/**
	 * @typesign (
	 *     cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean,
	 *     context?
	 * ) -> boolean;
	 */
	some: null,

	/**
	 * @typesign (
	 *     cb: (accumulator, item, index: uint, list: cellx.ObservableList) -> *,
	 *     initialValue?
	 * ) -> *;
	 */
	reduce: null,

	/**
	 * @typesign (
	 *     cb: (accumulator, item, index: uint, list: cellx.ObservableList) -> *,
	 *     initialValue?
	 * ) -> *;
	 */
	reduceRight: null,

	/**
	 * @typesign () -> cellx.ObservableList;
	 */
	clone: function clone() {
		return new this.constructor(this, {
			adoptsItemChanges: this.adoptsItemChanges,
			comparator: this.comparator,
			sorted: this.sorted
		});
	},

	/**
	 * @typesign () -> Array;
	 */
	toArray: function toArray() {
		return this._items.slice();
	},

	/**
	 * @typesign () -> string;
	 */
	toString: function toString() {
		return this._items.join();
	}
});

['forEach', 'map', 'filter', 'every', 'some'].forEach(function(name) {
	ObservableList.prototype[name] = function(cb, context) {
		context = arguments.length >= 2 ? context : global;

		return this._items[name](function(item, index) {
			return cb.call(context, item, index, this);
		}, this);
	};
});

['reduce', 'reduceRight'].forEach(function(name) {
	ObservableList.prototype[name] = function(cb, initialValue) {
		var items = this._items;
		var list = this;

		function wrapper(accumulator, item, index) {
			return cb(accumulator, item, index, list);
		}

		return arguments.length >= 2 ? items[name](wrapper, initialValue) : items[name](wrapper);
	};
});

[
	['keys', function keys(index) {
		return index;
	}],
	['values', function values(index, item) {
		return item;
	}],
	['entries', function entries(index, item) {
		return [index, item];
	}]
].forEach(function(settings) {
	var getStepValue = settings[1];

	ObservableList.prototype[settings[0]] = function() {
		var items = this._items;
		var index = 0;
		var done = false;

		return {
			next: function() {
				if (!done) {
					if (index < items.length) {
						return {
							value: getStepValue(index, items[index++]),
							done: false
						};
					}

					done = true;
				}

				return {
					value: void 0,
					done: true
				};
			}
		};
	};
});

ObservableList.prototype[Symbol.iterator] = ObservableList.prototype.values;

module.exports = ObservableList;
