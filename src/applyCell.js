(function() {

	var cellProto = Cell.prototype;

	applyCell = function applyCell(cx, initialValue, opts, owner, firstArg, otherArgs, argCount) {
		if (!owner || owner == global) {
			owner = cx;
		}

		if (!hasOwn.call(owner, KEY_CELLS)) {
			Object.defineProperty(owner, KEY_CELLS, {
				value: new Map()
			});
		}

		var cell = owner[KEY_CELLS].get(cx);

		if (!cell) {
			if (argCount >= 2 && firstArg === 'dispose') {
				return;
			}

			opts = Object.create(opts);
			opts.owner = owner;

			cell = new Cell(initialValue, opts);

			owner[KEY_CELLS].set(cx, cell);
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
						cx = cx.bind(owner);
						cx.constructor = cellx;
						return cx;
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
