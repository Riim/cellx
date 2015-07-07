(function() {
	var create = Object.create;

	/**
	 * @class cellx.Dictionary
	 * @typesign new (): cellx.Dictionary;
	 */
	var Dictionary;

	if (create && isNative(create)) {
		Dictionary = function() {
			return create(null);
		};
	} else {
		// IE8
		Dictionary = function() {
			var iframe = document.createElement('iframe');
			var container = document.body || document.documentElement;

			iframe.style.display = 'none';
			container.appendChild(iframe);
			iframe.src = 'javascript:';

			var empty = iframe.contentWindow.Object.prototype;

			container.removeChild(iframe);
			iframe = null;

			delete empty.constructor;
			delete empty.isPrototypeOf;
			delete empty.hasOwnProperty;
			delete empty.propertyIsEnumerable;
			delete empty.valueOf;
			delete empty.toString;
			delete empty.toLocaleString;

			Dictionary = function() {};
			Dictionary.prototype = empty;

			return new Dictionary();
		};
	}

	cellx.Dictionary = Dictionary;
})();
