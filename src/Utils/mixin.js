/**
 * @typesign (target: Object, sources: Array<Object> | Object, skipProperties?: Array<string>) -> Object;
 */
export default function mixin(target, sources, skipProperties) {
	if (!Array.isArray(sources)) {
		sources = [sources];
	}

	for (var i = 0, l = sources.length; i < l; i++) {
		var source = sources[i];
		var names = Object.getOwnPropertyNames(source);

		for (var j = 0, m = names.length; j < m; j++) {
			var name = names[j];

			if (skipProperties && skipProperties.indexOf(name) != -1) {
				continue;
			}

			Object.defineProperty(target, name, Object.getOwnPropertyDescriptor(source, name));
		}
	}

	return target;
}
