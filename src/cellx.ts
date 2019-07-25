import { Cell, ICellOptions, TCellPull } from './Cell';
import { IEvent, TListener } from './EventEmitter';

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

export { configure } from './config';

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

	addChangeListener(listener: TListener, context?: any): Cell<T, M>;
	removeChangeListener(listener: TListener, context?: any): Cell<T, M>;

	addErrorListener(listener: TListener, context?: any): Cell<T, M>;
	removeErrorListener(listener: TListener, context?: any): Cell<T, M>;

	subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell<T, M>;
	unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell<T, M>;

	value: T;

	reap(): Cell<T, M>;
	dispose(): Cell<T, M>;
}

const cellxProto = {
	__proto__: Function.prototype,

	cell: null,

	on(type: string | Record<string, TListener>, listener?: any, context?: any): Cell {
		return (this as ICellx).cell.on(type as any, listener, context);
	},

	off(type?: string | Record<string, TListener>, listener?: any, context?: any): Cell {
		return (this as ICellx).cell.off(type as any, listener, context);
	},

	addChangeListener(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.addChangeListener(listener, context);
	},

	removeChangeListener(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.removeChangeListener(listener, context);
	},

	addErrorListener(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.addErrorListener(listener, context);
	},

	removeErrorListener(listener: TListener, context?: any): Cell {
		return (this as ICellx).cell.removeErrorListener(listener, context);
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
	// tslint:disable-next-line:only-arrow-functions
	let $cellx = function(value: any) {
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
