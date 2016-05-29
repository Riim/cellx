var ErrorLogger = require('./ErrorLogger');
var EventEmitter = require('./EventEmitter');
var ObservableMap = require('./collections/ObservableMap');
var ObservableList = require('./collections/ObservableList');
var Cell = require('./Cell');
var keys = require('./keys');
var is = require('./js/is');
var Symbol = require('./js/Symbol');
var Map = require('./js/Map');
var logError = require('./utils/logError');
var nextUID = require('./utils/nextUID');
var mixin = require('./utils/mixin');
var createClass = require('./utils/createClass');
var nextTick = require('./utils/nextTick');

var KEY_UID = keys.UID;
var KEY_CELLS = keys.CELLS;

var hasOwn = Object.prototype.hasOwnProperty;
var slice = Array.prototype.slice;
var global = Function('return this;')();

ErrorLogger.setHandler(logError);

/**
 * @typesign (value?, opts?: {
 *     debugKey?: string,
 *     owner?: Object,
 *     validate?: (value, oldValue),
 *     onChange?: (evt: cellx~Event) -> ?boolean,
 *     onError?: (evt: cellx~Event) -> ?boolean
 * }) -> cellx;
 *
 * @typesign (pull: (push: (value), fail: (err), oldValue) -> *, opts?: {
 *     debugKey?: string
 *     owner?: Object,
 *     validate?: (value, oldValue),
 *     put?: (value, push: (value), fail: (err), oldValue),
 *     reap?: (),
 *     onChange?: (evt: cellx~Event) -> ?boolean,
 *     onError?: (evt: cellx~Event) -> ?boolean
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
				cell.set(value);
				return value;
			}
			default: {
				var method = value;

				switch (method) {
					case 'bind': {
						cx = cx.bind(owner);
						cx.constructor = cellx;
						return cx;
					}
					case 'unwrap': {
						return cell;
					}
					default: {
						var result = Cell.prototype[method].apply(cell, slice.call(arguments, 1));
						return result === cell ? cx : result;
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
 * @typesign (obj: cellx.EventEmitter, name: string, value) -> cellx.EventEmitter;
 */
function defineObservableProperty(obj, name, value) {
	var privateName = '_' + name;

	obj[privateName] = value instanceof Cell ? value : new Cell(value, { owner: obj });

	Object.defineProperty(obj, name, {
		configurable: true,
		enumerable: true,

		get: function() {
			return this[privateName].get();
		},

		set: function(value) {
			this[privateName].set(value);
		}
	});

	return obj;
}

/**
 * @typesign (obj: cellx.EventEmitter, props: Object) -> cellx.EventEmitter;
 */
function defineObservableProperties(obj, props) {
	Object.keys(props).forEach(function(name) {
		defineObservableProperty(obj, name, props[name]);
	});

	return obj;
}

/**
 * @typesign (obj: cellx.EventEmitter, name: string, value) -> cellx.EventEmitter;
 * @typesign (obj: cellx.EventEmitter, props: Object) -> cellx.EventEmitter;
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

cellx.js = {
	is: is,
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

cellx.cellx = cellx; // for destructuring

module.exports = cellx;
