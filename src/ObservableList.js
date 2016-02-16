var ObservableList;

(function() {

	/**
	 * @typesign (a, b) -> -1|1|0;
	 */
	function defaultComparator(a, b) {
		if (a < b) { return -1; }
		if (a > b) { return 1; }
		return 0;
	}

	/**
	 * @typesign (list: cellx.ObservableList, items: Array);
	 */
	function addRange(list, items) {
		var listItems = list._items;

		if (list.sorted) {
			var comparator = list.comparator;

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
				list._registerValue(item);
			}
		} else {
			push.apply(listItems, items);

			for (var j = items.length; j;) {
				list._registerValue(items[--j]);
			}
		}

		list.length = listItems.length;
	}

	/**
	 * @class cellx.ObservableList
	 * @extends {cellx.EventEmitter}
	 * @implements {ObservableCollection}
	 *
	 * @typesign new (items?: Array|cellx.ObservableList, opts?: {
	 *     adoptsItemChanges?: boolean,
	 *     comparator?: (a, b) -> int,
	 *     sorted?: boolean
	 * }) -> cellx.ObservableList;
	 */
	ObservableList = createClass({
		Extends: EventEmitter,
		Implements: [ObservableCollection],

		constructor: function ObservableList(items, opts) {
			EventEmitter.call(this);
			ObservableCollection.call(this);

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
				addRange(this, items instanceof ObservableList ? items._items : items);
			}
		},

		/**
		 * @typesign (index: int, allowEndIndex?: boolean) -> uint|undefined;
		 */
		_validateIndex: function _validateIndex(index, allowEndIndex) {
			if (index === undefined) {
				return index;
			}

			if (index < 0) {
				index += this.length;

				if (index < 0) {
					throw new RangeError('Index out of range');
				}
			} else if (index >= (this.length + (allowEndIndex ? 1 : 0))) {
				throw new RangeError('Index out of range');
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
			return this._items.lastIndexOf(value, this._validateIndex(fromIndex));
		},

		/**
		 * @typesign (index: int) -> *;
		 */
		get: function get(index) {
			return this._items[this._validateIndex(index)];
		},

		/**
		 * @typesign (index?: int, count?: uint) -> Array;
		 */
		getRange: function getRange(index, count) {
			index = this._validateIndex(index || 0, true);

			var items = this._items;

			if (count === undefined) {
				return items.slice(index);
			}

			if (index + count > items.length) {
				throw new RangeError('"index" and "count" do not denote a valid range');
			}

			return items.slice(index, index + count);
		},

		/**
		 * @typesign (index: int, value) -> cellx.ObservableList;
		 */
		set: function set(index, value) {
			if (this.sorted) {
				throw new TypeError('Can\'t set to sorted list');
			}

			index = this._validateIndex(index);

			var items = this._items;

			if (is(items[index], value)) {
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
				throw new TypeError('Can\'t set to sorted list');
			}

			index = this._validateIndex(index);

			var itemCount = items.length;

			if (!itemCount) {
				return this;
			}

			if (index + itemCount > this.length) {
				throw new RangeError('"index" and length of "items" do not denote a valid range');
			}

			var listItems = this._items;
			var changed = false;

			for (var i = index + itemCount; i > index;) {
				var item = items[--i];

				if (!is(listItems[i], item)) {
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
		addRange: function _addRange(items) {
			if (!items.length) {
				return this;
			}

			addRange(this, items);
			this.emit('change');

			return this;
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
				throw new TypeError('Can\'t insert to sorted list');
			}

			index = this._validateIndex(index, true);

			var itemCount = items.length;

			if (!itemCount) {
				return this;
			}

			splice.apply(this._items, [].concat(index, 0, items));

			for (var i = itemCount; i;) {
				this._registerValue(items[--i]);
			}

			this.length += itemCount;

			this.emit('change');

			return this;
		},

		/**
		 * @typesign (item, fromIndex?: int) -> cellx.ObservableList;
		 */
		remove: function remove(item, fromIndex) {
			var index = this._items.indexOf(item, this._validateIndex(fromIndex));

			if (index == -1) {
				return this;
			}

			this._items.splice(index, 1);
			this._unregisterValue(item);

			this.length--;

			this.emit('change');

			return this;
		},

		/**
		 * @typesign (item, fromIndex?: int) -> cellx.ObservableList;
		 */
		removeAll: function removeAll(item, fromIndex) {
			var items = this._items;
			var index = this._validateIndex(fromIndex);
			var changed = false;

			while ((index = items.indexOf(item, index)) != -1) {
				items.splice(index, 1);
				this._unregisterValue(item);

				changed = true;
			}

			if (changed) {
				this.length = items.length;
				this.emit('change');
			}

			return this;
		},

		/**
		 * @typesign (index: int) -> cellx.ObservableList;
		 */
		removeAt: function removeAt(index) {
			this._unregisterValue(this._items.splice(this._validateIndex(index), 1)[0]);
			this.length--;

			this.emit('change');

			return this;
		},

		/**
		 * @typesign (index?: int, count?: uint) -> cellx.ObservableList;
		 */
		removeRange: function removeRange(index, count) {
			index = this._validateIndex(index || 0, true);

			var items = this._items;

			if (count === undefined) {
				count = items.length - index;
			} else if (index + count > items.length) {
				throw new RangeError('"index" and "count" do not denote a valid range');
			}

			if (!count) {
				return this;
			}

			for (var i = index + count; i > index;) {
				this._unregisterValue(items[--i]);
			}
			items.splice(index, count);

			this.length -= count;

			this.emit('change');

			return this;
		},

		/**
		 * @typesign () -> cellx.ObservableList;
		 */
		clear: function clear() {
			if (this.length) {
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
		 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList), context?);
		 */
		forEach: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList) -> *, context?) -> Array;
		 */
		map: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> Array;
		 */
		filter: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> *;
		 */
		find: function(cb, context) {
			if (context == null) {
				context = this;
			}

			var items = this._items;

			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];

				if (cb.call(this, item, i, context)) {
					return item;
				}
			}
		},

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> int;
		 */
		findIndex: function(cb, context) {
			if (context == null) {
				context = this;
			}

			var items = this._items;

			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];

				if (cb.call(this, item, i, context)) {
					return i;
				}
			}

			return -1;
		},

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> boolean;
		 */
		every: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> boolean;
		 */
		some: null,

		/**
		 * @typesign (cb: (accumulator, item, index: uint, arr: cellx.ObservableList) -> *, initialValue?) -> *;
		 */
		reduce: null,

		/**
		 * @typesign (cb: (accumulator, item, index: uint, arr: cellx.ObservableList) -> *, initialValue?) -> *;
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

	['forEach', 'map', 'filter', 'every', 'some', 'reduce', 'reduceRight'].forEach(function(name) {
		ObservableList.prototype[name] = function() {
			return Array.prototype[name].apply(this._items, arguments);
		};
	});

	[
		['keys', function keys(index, item) {
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
			var index;
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
						value: undefined,
						done: true
					};
				}
			};
		};
	});

	if (global.Symbol && Symbol.iterator) {
		ObservableList.prototype[Symbol.iterator] = ObservableList.prototype.values;
	}

	cellx.ObservableList = ObservableList;

	/**
	 * @typesign (items?: Array|cellx.ObservableList, opts?: {
	 *     adoptsItemChanges?: boolean,
	 *     comparator?: (a, b) -> int,
	 *     sorted?: boolean
	 * }) -> cellx.ObservableList;
	 *
	 * @typesign (items?: Array|cellx.ObservableList, adoptsItemChanges?: boolean) -> cellx.ObservableList;
	 */
	function list(items, opts) {
		return new ObservableList(items, typeof opts == 'boolean' ? { adoptsItemChanges: opts } : opts);
	}

	cellx.list = list;

})();
