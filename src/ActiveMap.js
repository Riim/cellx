(function() {
	var Map = cellx.Map;

	/**
	 * @class cellx.ActiveMap
	 * @extends {cellx.EventEmitter}
	 *
	 * @typesign new (entries?: Object|Array<{ 0, 1 }>|cellx.ActiveMap, opts?: {
	 *     adoptsItemChanges: boolean = true
	 * }): cellx.ActiveMap;
	 */
	function ActiveMap(entries, opts) {
		this._entries = new Map();
		/**
		 * @type {Map<*, uint>}
		 */
		this._valueCounts = new Map();

		this.size = 0;

		/**
		 * @type {boolean}
		 */
		this.adoptsItemChanges = !opts || opts.adoptsItemChanges !== false;

		if (entries) {
			var thisEntries = this._entries;

			if (entries instanceof ActiveMap) {
				entries._entries.forEach(function(value, key) {
					thisEntries.set(key, value);
					this._registerValue(value);
				}, this);
			} else if (isArray(entries)) {
				for (var i = 0, l = entries.length; i < l; i++) {
					var entry = entries[i];

					thisEntries.set(entry[0], entry[1]);
					this._registerValue(entry[1]);
				}
			} else {
				for (var key in entries) {
					thisEntries.set(key, entries[key]);
					this._registerValue(entries[key]);
				}
			}

			this.size = thisEntries.size;
		}
	}
	extend(ActiveMap, cellx.EventEmitter);

	assign(ActiveMap.prototype, MActiveCollection);
	assign(ActiveMap.prototype, {
		/**
		 * @typesign (key): boolean;
		 */
		has: function(key) {
			return this._entries.has(key);
		},

		/**
		 * @typesign (value): boolean;
		 */
		contains: function(value) {
			return this._valueCounts.has(value);
		},

		/**
		 * @typesign (key): *;
		 */
		get: function(key) {
			return this._entries.get(key);
		},

		/**
		 * @typesign (key, value): cellx.ActiveMap;
		 */
		set: function(key, value) {
			var entries = this._entries;
			var hasKey = entries.has(key);
			var oldValue;

			if (hasKey) {
				oldValue = entries.get(key);

				if (is(oldValue, value)) {
					return this;
				}

				this._unregisterValue(oldValue);
			}

			entries.set(key, value);
			this._registerValue(value);

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
		 * @typesign (key): boolean;
		 */
		'delete': function(key) {
			var entries = this._entries;

			if (!entries.has(key)) {
				return false;
			}

			var value = entries.get(key);

			entries['delete'](key);
			this._unregisterValue(value);

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
		 * @typesign (): cellx.ActiveMap;
		 */
		clear: function() {
			if (!this.size) {
				return this;
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
		 * @typesign (cb: (value, key, map: cellx.ActiveMap), context?: Object);
		 */
		forEach: function(cb, context) {
			if (context == null) {
				context = global;
			}

			this._entries.forEach(function(value, key) {
				cb.call(context, value, key, this);
			}, this);
		},

		/**
		 * @typesign (): { next: (): { value, done: boolean } };
		 */
		keys: function() {
			return this._entries.keys();
		},

		/**
		 * @typesign (): { next: (): { value, done: boolean } };
		 */
		values: function() {
			return this._entries.values();
		},

		/**
		 * @typesign (): { next: (): { value: { 0, 1 }, done: boolean } };
		 */
		entries: function() {
			return this._entries.entries();
		},

		/**
		 * @typesign (): cellx.ActiveMap;
		 */
		clone: function() {
			return new this.constructor(this, {
				adoptsItemChanges: this.adoptsItemChanges
			});
		}
	});

	cellx.ActiveMap = ActiveMap;

	/**
	 * @typesign (entries?: Object|Array<{ 0, 1 }>|cellx.ActiveMap, opts?: {
	 *     adoptsItemChanges: boolean = true
	 * }): cellx.ActiveMap;
	 *
	 * @typesign (entries?: Object|Array<{ 0, 1 }>|cellx.ActiveMap, adoptsItemChanges: boolean = true): cellx.ActiveMap;
	 */
	function map(entries, opts) {
		return new ActiveMap(entries, typeof opts == 'boolean' ? { adoptsItemChanges: opts } : opts);
	}

	cellx.map = map;
})();
