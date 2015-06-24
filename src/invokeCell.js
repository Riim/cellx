(function() {
	var Map = cellx.Map;
	var Cell = cellx.Cell;

	var cellProto = Cell.prototype;

	invokeCell = function(wrap, initialValue, opts, owner, firstArg, otherArgs, argCount) {
		if (!owner || owner == global) {
			owner = wrap;
		}

		if (!hasOwn.call(owner, KEY_CELLS)) {
			Object.defineProperty(owner, KEY_CELLS, {
				value: new Map()
			});
		}

		var cell = owner[KEY_CELLS].get(wrap);

		if (!cell) {
			if (initialValue != null && typeof initialValue == 'object') {
				if (typeof initialValue.clone == 'function') {
					initialValue = initialValue.clone();
				} else if (isArray(initialValue)) {
					initialValue = initialValue.slice(0);
				} else if (initialValue.constructor === Object) {
					initialValue = assign({}, initialValue);
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

			opts = create(opts);
			opts.owner = owner;

			cell = new Cell(initialValue, opts);
			owner[KEY_CELLS].set(wrap, cell);
		}

		switch (argCount) {
			case 0: {
				return cell.read();
			}
			case 1: {
				return cell.write(firstArg);
			}
			default: {
				return cellProto[firstArg].apply(cell, otherArgs);
			}
		}
	};
})();
