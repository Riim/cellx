import {
	Cell,
	ICellOptions,
	TCellEvent,
	TCellPull
	} from './Cell';
import { IObservableListOptions, ObservableList, TObservableListItems } from './collections/ObservableList';
import { ObservableMap, TObservableMapEntries } from './collections/ObservableMap';
import { TListener } from './EventEmitter';

export { IEvent, TListener, IRegisteredEvent, EventEmitter } from './EventEmitter';
export { TObservableMapEntries, ObservableMap } from './collections/ObservableMap';
export {
	TObservableListItemComparator,
	TObservableListItems,
	IObservableListOptions,
	ObservableList
} from './collections/ObservableList';
export {
	TCellPull,
	ICellOptions,
	ICellChangeEvent,
	ICellErrorEvent,
	TCellEvent,
	Cell
} from './Cell';
export { WaitError } from './WaitError';

const hasOwn = Object.prototype.hasOwnProperty;
const slice = Array.prototype.slice;

const global_ = Function('return this;')();

export function map<K = any, V = any>(
	entries?: TObservableMapEntries<K, V> | null
): ObservableMap<K, V> {
	return new ObservableMap(entries);
}

export function list<T = any>(
	items?: TObservableListItems<T> | null,
	options?: IObservableListOptions<T>
): ObservableList<T> {
	return new ObservableList(items, options);
}

export interface ICellx<T> {
	(value?: T): T;

	(method: 'cell', _: any): Cell<T>;
	(method: 'bind', _: any): ICellx<T>;

	(
		method:
			| 'addChangeListener'
			| 'removeChangeListener'
			| 'addErrorListener'
			| 'removeErrorListener',
		listener: TListener,
		context?: any
	): Cell<T>;
	(
		method: 'subscribe' | 'unsubscribe',
		listener: (err: Error | null, evt: TCellEvent) => any,
		context?: any
	): Cell<T>;

	(method: 'pull', _: any): boolean;
	(method: 'getError', _: any): Error | null;
	// tslint:disable-next-line
	(method: 'isPending', _: any): boolean;

	// tslint:disable-next-line
	(method: 'push', value: any): Cell<T>;
	// tslint:disable-next-line
	(method: 'fail', err: any): Cell<T>;

	<U = any>(
		method: 'then',
		onFulfilled: ((value: T) => U) | null,
		onRejected?: (err: Error) => U
	): Promise<U>;
	<U = any>(method: 'catch', onRejected: (err: Error) => U): Promise<U>;

	// tslint:disable-next-line
	(method: 'reap' | 'dispose', _: any): Cell<T>;
}

export const KEY_CELL_MAP = Symbol('cellx[cellMap]');

export function cellx<T = any, M = any>(
	value: T | TCellPull<T>,
	options?: ICellOptions<T, M>
): ICellx<T> {
	if (!options) {
		options = {};
	}

	let initialValue = value;

	let cx = function(value: any) {
		let context = this;

		if (!context || context == global_) {
			context = cx;
		}

		if (!hasOwn.call(context, KEY_CELL_MAP)) {
			context[KEY_CELL_MAP] = new Map();
		}

		let cell = context[KEY_CELL_MAP].get(cx);

		if (!cell) {
			if (value === 'dispose' && arguments.length >= 2) {
				return;
			}

			cell = new Cell(initialValue, {
				__proto__: options,
				context
			} as any);

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
		}

		let method = value;

		switch (method) {
			case 'cell': {
				return cell;
			}
			case 'bind': {
				cx = cx.bind(context);
				cx.constructor = cellx;
				return cx;
			}
		}

		let result = Cell.prototype[method].apply(cell, slice.call(arguments, 1));
		return result === cell ? cx : result;
	};
	cx.constructor = cellx;

	if (options.onChange || options.onError) {
		cx.call(options.context || global_);
	}

	return cx;
}

export function defineObservableProperty<T extends object = object>(
	obj: T,
	name: string,
	value: any
): T {
	let cellName = name + 'Cell';

	Object.defineProperty(obj, cellName, {
		configurable: true,
		enumerable: false,
		writable: true,
		value: value instanceof Cell ? value : new Cell(value, { context: obj })
	});

	Object.defineProperty(obj, name, {
		configurable: true,
		enumerable: true,

		get() {
			return this[cellName].get();
		},

		set(value) {
			this[cellName].set(value);
		}
	});

	return obj;
}

export function defineObservableProperties<T extends object = object>(
	obj: T,
	props: Record<string, any>
): T {
	Object.keys(props).forEach(name => {
		defineObservableProperty(obj, name, props[name]);
	});

	return obj;
}

export function define<T extends object = object>(obj: T, name: string, value: any): T;
export function define<T extends object = object>(obj: T, props: Record<string, any>): T;
export function define(obj: object, name: string | Record<string, any>, value?: any) {
	if (typeof name == 'string') {
		defineObservableProperty(obj, name, value);
	} else {
		defineObservableProperties(obj, name);
	}

	return obj;
}
