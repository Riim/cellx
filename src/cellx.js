var Map = require('./js/Map');
var Symbol = require('./js/Symbol');
var logError = require('./utils/logError');
var nextUID = require('./utils/nextUID');
var mixin = require('./utils/mixin');
var createClass = require('./utils/createClass');
var nextTick = require('./utils/nextTick');
var keys = require('./keys');
var ErrorLogger = require('./ErrorLogger');
var EventEmitter = require('./EventEmitter');
var ObservableMap = require('./collections/ObservableMap');
var ObservableList = require('./collections/ObservableList');
var Cell = require('./Cell');

var KEY_UID = keys.UID;
var KEY_CELLS = keys.CELLS;

var hasOwn = Object.prototype.hasOwnProperty;
var slice = Array.prototype.slice;

var cellProto = Cell.prototype;

ErrorLogger.setHandler(logError);

/**
 * @typesign (value?, opts?: {
 *     debugKey?: string,
 *     owner?: Object,
 *     get?: (value) -> *,
 *     validate?: (value),
 *     onChange?: (evt: cellx~Event) -> boolean|undefined,
 *     onError?: (evt: cellx~Event) -> boolean|undefined,
 *     computed?: false
 * }) -> cellx;
 *
 * @typesign (formula: () -> *, opts?: {
 *     debugKey?: string
 *     owner?: Object,
 *     get?: (value) -> *,
 *     set?: (value),
 *     validate?: (value),
 *     onChange?: (evt: cellx~Event) -> boolean|undefined,
 *     onError?: (evt: cellx~Event) -> boolean|undefined,
 *     computed?: true
 * }) -> cellx;
 */
function cellx(value, opts) {
	if (!opts) {
		opts = {};
	}

	var initialValue = value;

	function cx(value) {
		var owner = this;

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
			if (value === 'dispose' && arguments.length >= 2) {
				return;
			}

			opts = Object.create(opts);
			opts.owner = owner;

			cell = new Cell(initialValue, opts);

			owner[KEY_CELLS].set(cx, cell);
		}

		switch (arguments.length) {
			case 0: {
				return cell.get();
			}
			case 1: {
				return cell.set(value);
			}
			default: {
				switch (value) {
					case 'bind': {
						cx = cx.bind(owner);
						cx.constructor = cellx;
						return cx;
					}
					case 'unwrap': {
						return cell;
					}
					default: {
						return cellProto[value].apply(cell, slice.call(arguments, 1));
					}
				}
			}
		}
	}
	cx.constructor = cellx;

	if (opts.onChange || opts.onError) {
		cx.call(opts.owner || global);
	}

	return cx;
}
cellx.cellx = cellx; // for destructuring

cellx.KEY_UID = KEY_UID;
cellx.ErrorLogger = ErrorLogger;
cellx.EventEmitter = EventEmitter;
cellx.ObservableMap = ObservableMap;
cellx.ObservableList = ObservableList;
cellx.Cell = Cell;

/**
 * @typesign (
 *     entries?: Object|Array<{ 0, 1 }>|cellx.ObservableMap,
 *     opts?: { adoptsItemChanges?: boolean }
 * ) -> cellx.ObservableMap;
 *
 * @typesign (
 *     entries?: Object|Array<{ 0, 1 }>|cellx.ObservableMap,
 *     adoptsItemChanges?: boolean
 * ) -> cellx.ObservableMap;
 */
function map(entries, opts) {
	return new ObservableMap(entries, typeof opts == 'boolean' ? { adoptsItemChanges: opts } : opts);
}

cellx.map = map;

/**
 * @typesign (items?: Array|cellx.ObservableList, opts?: {
 *     adoptsItemChanges?: boolean,
 *     comparator?: (a, b) -> int,
 *     sorted?: boolean
 * }) -> cellx.ObservableList;
 *
 * @typesign (items?: Array|cellx.ObservableList, adoptsItemChanges?: boolean) -> cellx.ObservableList;
 */
function list(items, opts) {
	return new ObservableList(items, typeof opts == 'boolean' ? { adoptsItemChanges: opts } : opts);
}

cellx.list = list;

/**
 * @typesign (obj: Object, name: string, value);
 */
function defineObservableProperty(obj, name, value) {
	var _name = '_' + name;

	obj[_name] = typeof value == 'function' && value.constructor == cellx ? value : cellx(value);

	Object.defineProperty(obj, name, {
		configurable: true,
		enumerable: true,

		get: function() {
			return this[_name]();
		},

		set: function(value) {
			this[_name](value);
		}
	});
}

/**
 * @typesign (obj: Object, props: Object);
 */
function defineObservableProperties(obj, props) {
	Object.keys(props).forEach(function(name) {
		defineObservableProperty(obj, name, props[name]);
	});
}

/**
 * @typesign (obj: Object, name: string, value) -> Object;
 * @typesign (obj: Object, props: Object) -> Object;
 */
function define(obj, name, value) {
	if (arguments.length == 3) {
		defineObservableProperty(obj, name, value);
	} else {
		defineObservableProperties(obj, name);
	}

	return obj;
}

cellx.define = define;

function observable(target, name, descr, opts) {
	if (arguments.length == 1) {
		opts = target;

		return function(target, name, descr) {
			return observable(target, name, descr, opts);
		};
	}

	if (!opts) {
		opts = {};
	}

	opts.computed = false;

	var _name = '_' + name;

	target[_name] = cellx(descr.initializer.call(target), opts);

	return {
		configurable: true,
		enumerable: descr.enumerable,

		get: function() {
			return this[_name]();
		},

		set: function(value) {
			this[_name](value);
		}
	};
}

function computed(target, name, descr, opts) {
	if (arguments.length == 1) {
		opts = target;

		return function(target, name, descr) {
			return computed(target, name, descr, opts);
		};
	}

	var value = descr.initializer();

	if (typeof value != 'function') {
		throw new TypeError('Property value must be a function');
	}

	if (!opts) {
		opts = {};
	}

	opts.computed = true;

	var _name = '_' + name;

	target[_name] = cellx(value, opts);

	var descriptor = {
		configurable: true,
		enumerable: descr.enumerable,

		get: function() {
			return this[_name]();
		}
	};

	if (opts.set) {
		descriptor.set = function(value) {
			this[_name](value);
		};
	}

	return descriptor;
}

cellx.d = {
	observable: observable,
	computed: computed
};

cellx.js = {
	Symbol: Symbol,
	Map: Map
};

cellx.utils = {
	logError: logError,
	nextUID: nextUID,
	mixin: mixin,
	createClass: createClass,
	nextTick: nextTick,
	defineObservableProperty: defineObservableProperty,
	defineObservableProperties: defineObservableProperties
};

module.exports = cellx;
