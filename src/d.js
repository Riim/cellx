(function() {
	function observable(target, name, descr, opts) {
		if (arguments.length == 1) {
			opts = target;

			return function(target, name, descr) {
				return observable(target, name, descr, opts);
			};
		}

		if (!opts) {
			opts = {};
		}

		opts.computed = false;

		var _name = '_' + name;

		target[_name] = cellx(descr.initializer.call(target), opts);

		return {
			configurable: descr.configurable,
			enumerable: descr.enumerable,

			get: function() {
				return this[_name]();
			},

			set: function(value) {
				this[_name](value);
			}
		};
	}

	function computed(target, name, descr, opts) {
		if (arguments.length == 1) {
			opts = target;

			return function(target, name, descr) {
				return computed(target, name, descr, opts);
			};
		}

		var value = descr.initializer();

		if (typeof value != 'function') {
			throw new TypeError('Property value must be a function');
		}

		if (!opts) {
			opts = {};
		}

		opts.computed = true;

		var _name = '_' + name;

		target[_name] = cellx(value, opts);

		var descriptor = {
			configurable: descr.configurable,
			enumerable: descr.enumerable,

			get: function() {
				return this[_name]();
			}
		};

		if (opts.set) {
			descriptor.set = function(value) {
				this[_name](value);
			};
		}

		return descriptor;
	}

	cellx.d = {
		observable: observable,
		computed: computed
	};
})();
