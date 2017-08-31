/**
 * @typesign (a, b) -> boolean;
 */
var is = Object.is || /* istanbul ignore next */ function is(a, b) {
	if (a === 0 && b === 0) {
		return 1 / a == 1 / b;
	}
	return a === b || a != a && b != b;
};

export default is;
