import { Cell, ICellOptions, TCellPull } from './Cell';
import { IEvent, TListener } from './EventEmitter';

export { configure } from './config';
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

export interface ICellx<T = any, M = any> {
	(value?: T): T;

	cell: Cell<T, M>;

	on(
		type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR,
		listener: TListener,
		context?: any
	): Cell<T, M>;
	on(
		listeners: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>,
		context?: any
	): Cell<T, M>;
	off(
		type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR,
		listener: TListener,
		context?: any
	): Cell<T, M>;
	off(
		listeners?: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>,
		context?: any
	): Cell<T, M>;

	onChange(listener: TListener, context?: any): Cell<T, M>;
	offChange(listener: TListener, context?: any): Cell<T, M>;

	onError(listener: TListener, context?: any): Cell<T, M>;
	offError(listener: TListener, context?: any): Cell<T, M>;

	subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell<T, M>;
	unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell<T, M>;

	value: T;

	pull(): boolean;

	reap(): Cell<T, M>;
	dispose(): Cell<T, M>;
}

export const KEY_VALUE_CELLS = Symbol('valueCells');

const cellxProto = {
	__proto__: Function.prototype,

	cell: null,

	on(type: string | Record<string, TListener>, listener?: any, context?: any): Cell {
		return (this as ICellx).cell.on(type as any, listener, context);
	},

	off(type?: string | Record<string, TListener>, listener?: any, context?: any): Cell {
		return (this as ICellx).cell.off(type as any, listener, context);
	},

	onChange(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.onChange(listener, context);
	},

	offChange(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.offChange(listener, context);
	},

	onError(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.onError(listener, context);
	},

	offError(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.offError(listener, context);
	},

	subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell {
		return (this as ICellx).cell.subscribe(listener, context);
	},

	unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell {
		return (this as ICellx).cell.unsubscribe(listener, context);
	},

	get value(): any {
		return (this as ICellx).cell.value;
	},
	set value(value: any) {
		(this as ICellx).cell.value = value;
	},

	pull(): boolean {
		return (this as ICellx).cell.pull();
	},

	reap(): Cell {
		return (this as ICellx).cell.reap();
	},

	dispose(): Cell {
		return (this as ICellx).cell.dispose();
	}
};

export function cellx<T = any, M = any>(
	value: T | TCellPull<T>,
	options?: ICellOptions<T, M>
): ICellx<T> {
	let $cellx = function (value: any) {
		if (arguments.length) {
			$cellx.cell.set(value);
			return value;
		}

		return $cellx.cell.get();
	} as ICellx;
	Object.setPrototypeOf($cellx, cellxProto);
	$cellx.constructor = cellx;
	$cellx.cell = new Cell(value, options);

	return $cellx;
}

export function defineObservableProperty<T extends object = object>(
	obj: T,
	name: string | symbol,
	value: any
): T {
	(
		(obj[KEY_VALUE_CELLS] as Map<string | symbol, Cell>) || (obj[KEY_VALUE_CELLS] = new Map())
	).set(name, value instanceof Cell ? value : new Cell(value, { context: obj }));

	Object.defineProperty(obj, name, {
		configurable: true,
		enumerable: true,

		get() {
			return (this[KEY_VALUE_CELLS] as Map<string | symbol, Cell>).get(name)!.get();
		},

		set(value) {
			(this[KEY_VALUE_CELLS] as Map<string | symbol, Cell>).get(name)!.set(value);
		}
	});

	return obj;
}

export function defineObservableProperties<T extends object = object>(
	obj: T,
	props: Record<string | symbol, any>
): T {
	Object.keys(props).forEach((name) => {
		defineObservableProperty(obj, name, props[name]);
	});

	return obj;
}

export function define<T extends object = object>(obj: T, name: string | symbol, value: any): T;
export function define<T extends object = object>(obj: T, props: Record<string | symbol, any>): T;
export function define(
	obj: object,
	nameOrProps: string | symbol | Record<string | symbol, any>,
	value?: any
): object {
	if (typeof nameOrProps == 'object') {
		defineObservableProperties(obj, nameOrProps);
	} else {
		defineObservableProperty(obj, nameOrProps, value);
	}

	return obj;
}
