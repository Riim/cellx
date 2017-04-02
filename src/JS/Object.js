/**
 * @typesign (a, b) -> boolean;
 */
export var is = Object.is || function is(a, b) {
	if (a === 0 && b === 0) {
		return 1 / a == 1 / b;
	}
	return a === b || a != a && b != b;
};

export var hasOwn = Object.prototype.hasOwnProperty;
