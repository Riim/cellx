(function(undefined) {
	'use strict';

	var hasOwn = Object.prototype.hasOwnProperty;
	var toString = Object.prototype.toString;
	var push = Array.prototype.push;
	var slice = Array.prototype.slice;
	var splice = Array.prototype.splice;

	var global = Function('return this;')();

	var invokeCell;

	/**
	 * @typesign (value?, opts?: {
	 *     read?: (value): *,
	 *     validate?: (value): *,
	 *     computed?: false
	 * }): cellx;
	 *
	 * @typesign (formula: (): *, opts?: {
	 *     read?: (value): *,
	 *     write?: (value),
	 *     validate?: (value): *,
	 *     computed?: true,
	 *     pureComputed: boolean = false
	 * }): cellx;
	 */
	function cellx(value, opts) {
		if (!opts) {
			opts = {};
		}

		var initialValue = value;

		function cell(value) {
			return invokeCell(cell, initialValue, opts, this, value, slice.call(arguments, 1), arguments.length);
		}
		cell.constructor = cellx;

		return cell;
	}

	if (typeof exports != 'undefined') {
		if (typeof module != 'undefined') {
			module.exports = cellx;
		} else {
			exports.cellx = cellx;
		}
	} else {
		global.cellx = cellx;
	}

	/**
	 * @memberOf cellx
	 */
	var KEY_UID = '__cellx_uid__';
	/**
	 * @memberOf cellx
	 */
	var KEY_INNER = '__cellx_inner__';
	/**
	 * @memberOf cellx
	 */
	var KEY_USED = '__cellx_used__';
	/**
	 * @memberOf cellx
	 */
	var KEY_CELLS = '__cellx_cells__';

	if (global.Symbol && typeof Symbol.iterator == 'symbol') {
		KEY_UID = Symbol(KEY_UID);
		KEY_INNER = Symbol(KEY_INNER);
		KEY_USED = Symbol(KEY_USED);
		KEY_CELLS = Symbol(KEY_CELLS);
	}

	cellx.KEY_UID = KEY_UID;
	cellx.KEY_INNER = KEY_INNER;
	cellx.KEY_USED = KEY_USED;
	cellx.KEY_CELLS = KEY_CELLS;

	var uidCounter = 0;

	/**
	 * @typesign (fn: Function): boolean;
	 */
	function isNative(fn) {
		return fn.toString().indexOf('[native code]') != -1;
	}

	/**
	 * @memberOf cellx
	 * @typesign (err);
	 */
	var logError;

	if (global.console) {
		if (console.error) {
			logError = function(err) {
				console.error(err === Object(err) && err.stack || err);
			};
		} else {
			logError = function(err) {
				console.log('!!! ' + (err === Object(err) && err.stack || err));
			};
		}
	} else {
		logError = function() {};
	}

	cellx.logError = logError;

	/**
	 * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero
	 * @typesign (a, b): boolean;
	 */
	var is = Object.is || function(a, b) {
		return a === b || (a != a && b != b);
	};

	/**
	 * @typesign (child: Function, parent: Function): Function;
	 */
	function extend(child, parent) {
		function F() {
			this.constructor = child;
		}
		F.prototype = parent.prototype;

		child.prototype = new F();
		return child;
	}

	/**
	 * @typesign (proto: Object): Object;
	 */
	var create = Object.create || function(proto) {
		function F() {}
		F.prototype = proto;
		return new F();
	};

	/**
	 * @typesign (target: Object, source: Object);
	 */
	var assign = Object.assign || function assign(target, source) {
		for (var name in source) {
			if (hasOwn.call(source, name)) {
				target[name] = source[name];
			}
		}

		return target;
	};

	/**
	 * @typesign (value): boolean;
	 */
	var isArray = Array.isArray || function(value) {
		return toString.call(value) == '[object Array]';
	};

	/**
	 * @typesign (): uint;
	 */
	var now = Date.now || function() {
		return +new Date();
	};

	// gulp-include
	//= include ./Dictionary.js
	//= include ./Map.js
	//= include ./Set.js
	//= include ./nextTick.js
	//= include ./Event.js
	//= include ./EventEmitter.js
	//= include ./MActiveCollection.js
	//= include ./ActiveMap.js
	//= include ./ActiveList.js
	//= include ./Cell.js
	//= include ./invokeCell.js
})();
