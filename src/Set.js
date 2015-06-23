(function() {
	var Set = global.Set;

	if (!Set) {
		var Map = cellx.Map;

		Set = function Set(arr) {
			this._entries = new Map();

			if (arr) {
				for (var i = 0, l = arr.length; i < l; i++) {
					this.add(arr[i]);
				}
			}
		};

		assign(Set.prototype, {
			_entries: null,

			size: 0,

			has: function(value) {
				return this._entries.has(value);
			},

			add: function(value) {
				this._entries.set(value, value);
				this.size = this._entries.size;
				return this;
			},

			'delete': function(value) {
				if (this._entries['delete'](value)) {
					this.size--;
					return true;
				}

				return false;
			},

			clear: function() {
				this._entries.clear();
				this.size = 0;
			},

			forEach: function(cb, context) {
				if (context == null) {
					context = global;
				}

				this._entries.forEach(function(value) {
					cb.call(context, value, value, this);
				}, this);
			},

			keys: function() {
				return this._entries.keys();
			},

			values: function() {
				return this._entries.values();
			},

			entries: function() {
				return this._entries.entries();
			},

			toString: function() {
				return '[object Set]';
			}
		});
	}

	cellx.Set = Set;
})();
