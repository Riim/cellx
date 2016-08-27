/**
 * @typesign (target: Object, source: Object) -> Object;
 */
function mixin(target, source) {
	var names = Object.getOwnPropertyNames(source);

	for (var i = 0, l = names.length; i < l; i++) {
		var name = names[i];
		Object.defineProperty(target, name, Object.getOwnPropertyDescriptor(source, name));
	}

	return target;
}

export default mixin;
