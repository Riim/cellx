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
			if (argCount >= 2 && firstArg === 'dispose') {
				return;
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
