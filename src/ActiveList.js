(function() {
	var arrayProto = Array.prototype;

	/**
	 * @typesign (a, b): enum[-1, 1, 0];
	 */
	function defaultComparator(a, b) {
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return 0;
	}

	/**
	 * @typesign (list: cellx.ActiveList, items: Array);
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
	 * @class cellx.ActiveList
	 * @extends {cellx.EventEmitter}
	 *
	 * @typesign new (items?: Array|cellx.ActiveList, opts?: {
	 *     adoptsItemChanges: boolean = true,
	 *     comparator?: (a, b): int,
	 *     sorted?: boolean
	 * }): cellx.ActiveList;
	 */
	function ActiveList(items, opts) {
		if (!opts) {
			opts = {};
		}

		this._items = [];
		this._valueCounts = new Map();

		if (opts.adoptsItemChanges === false) {
			this.adoptsItemChanges = false;
		}

		if (opts.sorted || (opts.comparator && opts.sorted !== false)) {
			this.comparator = opts.comparator || defaultComparator;
			this.sorted = true;
		}

		if (items) {
			addRange(this, items instanceof ActiveList ? items._items : items);
		}
	}
	extend(ActiveList, cellx.EventEmitter);

	assign(ActiveList.prototype, MActiveCollection);
	assign(ActiveList.prototype, {
		/**
		 * @type {Array}
		 */
		_items: null,

		length: 0,

		/**
		 * @type {?Function}
		 */
		comparator: null,

		sorted: false,

		/**
		 * @typesign (index: int, endIndex: boolean = false): uint|undefined;
		 */
		_validateIndex: function(index, endIndex) {
			if (index === undefined) {
				return index;
			}

			if (index < 0) {
				index += this.length;

				if (index < 0) {
					throw new RangeError('Index out of range');
				}
			} else if (index >= (this.length + (endIndex ? 1 : 0))) {
				throw new RangeError('Index out of range');
			}

			return index;
		},

		/**
		 * @typesign (value): boolean;
		 */
		contains: function(value) {
			return this._valueCounts.has(value);
		},

		/**
		 * @typesign (value, fromIndex: int = 0): int;
		 */
		indexOf: function(value, fromIndex) {
			return this._items.indexOf(value, this._validateIndex(fromIndex));
		},

		/**
		 * @typesign (value, fromIndex: int = -1): int;
		 */
		lastIndexOf: function(value, fromIndex) {
			return this._items.lastIndexOf(value, this._validateIndex(fromIndex));
		},

		/**
		 * @typesign (index: int): *;
		 */
		get: function(index) {
			return this._items[this._validateIndex(index)];
		},

		/**
		 * @typesign (index: int = 0, count?: uint): Array;
		 */
		getRange: function(index, count) {
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
		 * @typesign (index: int, value): cellx.ActiveList;
		 */
		set: function(index, value) {
			if (this.sorted) {
				throw new TypeError('Can\'t set to sorted list');
			}

			index = this._validateIndex(index);

			var items = this._items;

			if (svz(items[index], value)) {
				return this;
			}

			this._unregisterValue(items[index]);

			items[index] = value;
			this._registerValue(value);

			this.emit('change');

			return this;
		},

		/**
		 * @typesign (index: int, items: Array): cellx.ActiveList;
		 */
		setRange: function(index, items) {
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

			var thisItems = this._items;
			var changed = false;

			for (var i = index + itemCount; i > index;) {
				var item = items[--i];

				if (!svz(thisItems[i], item)) {
					this._unregisterValue(thisItems[i]);

					thisItems[i] = item;
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
		 * @typesign (item): cellx.ActiveList;
		 */
		add: function(item) {
			this.addRange([item]);
			return this;
		},

		/**
		 * @typesign (items: Array): cellx.ActiveList;
		 */
		addRange: function(items) {
			if (!items.length) {
				return this;
			}

			addRange(this, items);
			this.emit('change');

			return this;
		},

		/**
		 * @typesign (index: int, item): cellx.ActiveList;
		 */
		insert: function(index, item) {
			this.insertRange(index, [item]);
			return this;
		},

		/**
		 * @typesign (index: int, items: Array): cellx.ActiveList;
		 */
		insertRange: function(index, items) {
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
		 * @typesign (item, fromIndex: int = 0): cellx.ActiveList;
		 */
		remove: function(item, fromIndex) {
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
		 * @typesign (item, fromIndex: int = 0): cellx.ActiveList;
		 */
		removeAll: function(item, fromIndex) {
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
		 * @typesign (index: int): cellx.ActiveList;
		 */
		removeAt: function(index) {
			this._unregisterValue(this._items.splice(this._validateIndex(index), 1)[0]);
			this.length--;

			this.emit('change');

			return this;
		},

		/**
		 * @typesign (index: int = 0, count?: uint): cellx.ActiveList;
		 */
		removeRange: function(index, count) {
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
		 * @typesign (): cellx.ActiveList;
		 */
		clear: function() {
			if (this.length) {
				this._items.length = 0;
				this._valueCounts.clear();

				this.length = 0;

				this.emit('change');
			}

			return this;
		},

		/**
		 * @typesign (separator: string = ','): string;
		 */
		join: function(separator) {
			return this._items.join(separator);
		},

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ActiveList), context: Object = global);
		 */
		forEach: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ActiveList): *, context: Object = global): Array;
		 */
		map: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ActiveList): boolean, context: Object = global): Array;
		 */
		filter: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ActiveList): boolean, context: Object = global): boolean;
		 */
		every: null,

		/**
		 * @typesign (cb: (item, index: uint, arr: cellx.ActiveList): boolean, context: Object = global): boolean;
		 */
		some: null,

		/**
		 * @typesign (cb: (accumulator: *, item, index: uint, arr: cellx.ActiveList): *, initialValue?): *;
		 */
		reduce: null,

		/**
		 * @typesign (cb: (accumulator: *, item, index: uint, arr: cellx.ActiveList): *, initialValue?): *;
		 */
		reduceRight: null,

		/**
		 * @typesign (): cellx.ActiveList;
		 */
		clone: function() {
			return new this.constructor(this, {
				adoptsItemChanges: this.adoptsItemChanges,
				comparator: this.comparator,
				sorted: this.sorted
			});
		},

		/**
		 * @typesign (): Array;
		 */
		toArray: function() {
			return this._items.slice(0);
		},

		/**
		 * @typesign (): string;
		 */
		toString: function() {
			return this._items.join();
		}
	});

	var methods = ['forEach', 'map', 'filter', 'every', 'some', 'reduce', 'reduceRight'];

	for (var i = methods.length; i;) {
		(function(name) {
			ActiveList.prototype[name] = function() {
				return arrayProto[name].apply(this._items, arguments);
			};
		})(methods[--i]);
	}

	cellx.ActiveList = ActiveList;

	/**
	 * @memberOf cellx
	 *
	 * @typesign (items?: Array|cellx.ActiveList, opts?: {
	 *     adoptsItemChanges: boolean = true,
	 *     comparator?: (a, b): int,
	 *     sorted?: boolean
	 * }): cellx.ActiveList;
	 *
	 * @typesign (items?: Array|cellx.ActiveList, adoptsItemChanges: boolean = true): cellx.ActiveList;
	 */
	function list(items, opts) {
		return new ActiveList(items, typeof opts == 'boolean' ? { adoptsItemChanges: opts } : opts);
	}

	cellx.list = list;
})();
