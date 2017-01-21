import { hasOwn } from '../JS/Object';
import mixin from './mixin';

var extend;

/**
 * @typesign (description: {
 *     Extends?: Function,
 *     Implements?: Array<Object | Function>,
 *     Static?: Object,
 *     constructor?: Function,
 *     [key: string]
 * }) -> Function;
 */
function createClass(description) {
	var parent;

	if (description.Extends) {
		parent = description.Extends;
		delete description.Extends;
	} else {
		parent = Object;
	}

	var constr;

	if (hasOwn.call(description, 'constructor')) {
		constr = description.constructor;
		delete description.constructor;
	} else {
		constr = parent == Object ?
			function() {} :
			function() {
				return parent.apply(this, arguments);
			};
	}

	var proto = constr.prototype = Object.create(parent.prototype);

	if (description.Implements) {
		description.Implements.forEach(function(implementation) {
			if (typeof implementation == 'function') {
				Object.keys(implementation).forEach(function(name) {
					Object.defineProperty(constr, name, Object.getOwnPropertyDescriptor(implementation, name));
				});

				mixin(proto, implementation.prototype);
			} else {
				mixin(proto, implementation);
			}
		});

		delete description.Implements;
	}

	Object.keys(parent).forEach(function(name) {
		Object.defineProperty(constr, name, Object.getOwnPropertyDescriptor(parent, name));
	});

	if (description.Static) {
		mixin(constr, description.Static);
		delete description.Static;
	}

	if (constr.extend === undefined) {
		constr.extend = extend;
	}

	mixin(proto, description);

	Object.defineProperty(proto, 'constructor', {
		configurable: true,
		writable: true,
		value: constr
	});

	return constr;
}

/**
 * @this {Function}
 *
 * @typesign (description: {
 *     Implements?: Array<Object | Function>,
 *     Static?: Object,
 *     constructor?: Function,
 *     [key: string]
 * }) -> Function;
 */
extend = function extend(description) {
	description.Extends = this;
	return createClass(description);
};

export default createClass;
