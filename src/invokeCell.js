(function() {
	var Map = cellx.Map;
	var Cell = cellx.Cell;

	var cellProto = Cell.prototype;

	invokeCell = function(wrapper, initialValue, opts, owner, firstArg, otherArgs, argCount) {
		if (!owner || owner == global) {
			owner = wrapper;
		}

		if (!hasOwn.call(owner, KEY_CELLS)) {
			Object.defineProperty(owner, KEY_CELLS, {
				value: new Map()
			});
		}

		var cell = owner[KEY_CELLS].get(wrapper);

		if (!cell) {
			if (initialValue != null && typeof initialValue == 'object') {
				if (typeof initialValue.clone == 'function') {
					initialValue = initialValue.clone();
				} else if (isArray(initialValue)) {
					initialValue = initialValue.slice();
				} else if (initialValue.constructor === Object) {
					initialValue = mixin({}, initialValue);
				} else {
					switch (toString.call(initialValue)) {
						case '[object Date]': {
							initialValue = new Date(initialValue);
							break;
						}
						case '[object RegExp]': {
							initialValue = new RegExp(initialValue);
							break;
						}
					}
				}
			}

			opts = Object.create(opts);
			opts.owner = owner;

			cell = new Cell(initialValue, opts);
			owner[KEY_CELLS].set(wrapper, cell);
		}

		switch (argCount) {
			case 0: {
				return cell.get();
			}
			case 1: {
				return cell.set(firstArg);
			}
			default: {
				switch (firstArg) {
					case 'bind': {
						wrapper = wrapper.bind(owner);
						wrapper.constructor = cellx;
						return wrapper;
					}
					case 'unwrap': {
						return cell;
					}
					default: {
						return cellProto[firstArg].apply(cell, otherArgs);
					}
				}
			}
		}
	};
})();
