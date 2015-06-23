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
			if (initialValue === Object(initialValue)) {
				if (typeof initialValue.clone == 'function') {
					if (typeof initialValue != 'function' || initialValue.constructor != Function) {
						initialValue = initialValue.clone();
					}
				} else if (typeof initialValue != 'function') {
					if (isArray(initialValue)) {
						initialValue = initialValue.slice(0);
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
							default: {
								initialValue = assign({}, initialValue);
								break;
							}
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
