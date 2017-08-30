import { Map } from '@riim/map-set-polyfill';
import Cell from './Cell';
import ObservableCollectionMixin from './Collections/ObservableCollectionMixin';
import ObservableList from './Collections/ObservableList';
import ObservableMap from './Collections/ObservableMap';
import EventEmitter from './EventEmitter';
import global from './global';
import { KEY_CELL_MAP } from './keys';
import is from './Utils/is';
import mixin from './Utils/mixin';
import nextTick from './Utils/nextTick';
import nextUID from './Utils/nextUID';

var hasOwn = Object.prototype.hasOwnProperty;
var slice = Array.prototype.slice;

var assign = Object.assign || function(target, source) {
	for (var name in source) {
		target[name] = source[name];
	}

	return target;
};

/**
 * @typesign (value?, opts?: {
 *     debugKey?: string,
 *     context?: Object,
 *     validate?: (value, oldValue),
 *     merge: (value, oldValue) -> *,
 *     put?: (cell: Cell, value, oldValue),
 *     reap?: (),
 *     onChange?: (evt: cellx~Event) -> ?boolean,
 *     onError?: (evt: cellx~Event) -> ?boolean
 * }) -> cellx;
 *
 * @typesign (pull: (cell: Cell, next) -> *, opts?: {
 *     debugKey?: string,
 *     context?: Object,
 *     validate?: (value, oldValue),
 *     merge: (value, oldValue) -> *,
 *     put?: (cell: Cell, value, oldValue),
 *     reap?: (),
 *     onChange?: (evt: cellx~Event) -> ?boolean,
 *     onError?: (evt: cellx~Event) -> ?boolean
 * }) -> cellx;
 */
export default function cellx(value, opts) {
	if (!opts) {
		opts = {};
	}

	var initialValue = value;

	function cx(value) {
		var context = this;

		if (!context || context == global) {
			context = cx;
		}

		if (!hasOwn.call(context, KEY_CELL_MAP)) {
			Object.defineProperty(context, KEY_CELL_MAP, { value: new Map() });
		}

		var cell = context[KEY_CELL_MAP].get(cx);

		if (!cell) {
			if (value === 'dispose' && arguments.length >= 2) {
				return;
			}

			cell = new Cell(initialValue, assign({ context }, opts));

			context[KEY_CELL_MAP].set(cx, cell);
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
						cx = cx.bind(context);
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
		cx.call(opts.context || global);
	}

	return cx;
}

cellx.configure = function(config) {
	Cell.configure(config);
};

cellx.EventEmitter = EventEmitter;
cellx.ObservableCollectionMixin = ObservableCollectionMixin;
cellx.ObservableMap = ObservableMap;
cellx.ObservableList = ObservableList;
cellx.Cell = Cell;
cellx.autorun = Cell.autorun;
cellx.transact = cellx.transaction = Cell.transaction;
cellx.KEY_CELL_MAP = KEY_CELL_MAP;

/**
 * @typesign (
 *     entries?: Object | Array<{ 0, 1 }> | cellx.ObservableMap,
 *     opts?: { adoptsValueChanges?: boolean }
 * ) -> cellx.ObservableMap;
 *
 * @typesign (
 *     entries?: Object | Array<{ 0, 1 }> | cellx.ObservableMap,
 *     adoptsValueChanges?: boolean
 * ) -> cellx.ObservableMap;
 */
function map(entries, opts) {
	return new ObservableMap(entries, opts);
}

cellx.map = map;

/**
 * @typesign (items?: Array | cellx.ObservableList, opts?: {
 *     adoptsValueChanges?: boolean,
 *     comparator?: (a, b) -> int,
 *     sorted?: boolean
 * }) -> cellx.ObservableList;
 *
 * @typesign (items?: Array | cellx.ObservableList, adoptsValueChanges?: boolean) -> cellx.ObservableList;
 */
function list(items, opts) {
	return new ObservableList(items, opts);
}

cellx.list = list;

/**
 * @typesign (obj: cellx.EventEmitter, name: string, value) -> cellx.EventEmitter;
 */
function defineObservableProperty(obj, name, value) {
	var cellName = name + 'Cell';

	Object.defineProperty(obj, cellName, {
		configurable: true,
		enumerable: false,
		writable: true,
		value: value instanceof Cell ? value : new Cell(value, { context: obj })
	});

	Object.defineProperty(obj, name, {
		configurable: true,
		enumerable: true,

		get: function() {
			return this[cellName].get();
		},

		set: function(value) {
			this[cellName].set(value);
		}
	});

	return obj;
}

cellx.defineObservableProperty = defineObservableProperty;

/**
 * @typesign (obj: cellx.EventEmitter, props: Object) -> cellx.EventEmitter;
 */
function defineObservableProperties(obj, props) {
	Object.keys(props).forEach(function(name) {
		defineObservableProperty(obj, name, props[name]);
	});

	return obj;
}

cellx.defineObservableProperties = defineObservableProperties;

/**
 * @typesign (obj: cellx.EventEmitter, name: string, value) -> cellx.EventEmitter;
 * @typesign (obj: cellx.EventEmitter, props: Object) -> cellx.EventEmitter;
 */
function define(obj, name, value) {
	if (typeof name == 'string') {
		defineObservableProperty(obj, name, value);
	} else {
		defineObservableProperties(obj, name);
	}

	return obj;
}

cellx.define = define;

cellx.Utils = {
	nextUID,
	is,
	mixin,
	nextTick
};

cellx.cellx = cellx;

cellx.default = cellx;
cellx.__esModule = true;
