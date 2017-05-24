/**
 * @typesign (target: Object, ...sources: Array<Object>) -> Object;
 */
function mixin(target, source) {
	var names = Object.getOwnPropertyNames(source);

	for (var i = 0, l = names.length; i < l; i++) {
		var name = names[i];
		Object.defineProperty(target, name, Object.getOwnPropertyDescriptor(source, name));
	}

	if (arguments.length > 2) {
		var i = 2;

		do {
			mixin(target, arguments[i]);
		} while (++i < arguments.length);
	}

	return target;
}

export default mixin;
