import { Cell, ICellOptions, TCellPull } from './Cell';
import { IEvent, TListener } from './EventEmitter';
import { KEY_VALUE_CELLS } from './keys';

export { KEY_VALUE_CELLS } from './keys';
export { configure } from './config';
export { IEvent, TListener, IRegisteredEvent, EventEmitter } from './EventEmitter';
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

const cellxProto = {
	__proto__: Function.prototype,

	cell: null,

	on(this: ICellx, type: string | Record<string, TListener>, listener?: any, context?: any) {
		return this.cell.on(type as any, listener, context);
	},

	off(this: ICellx, type?: string | Record<string, TListener>, listener?: any, context?: any) {
		return this.cell.off(type as any, listener, context);
	},

	onChange(this: ICellx, listener: TListener, context?: any) {
		return this.cell.onChange(listener, context);
	},

	offChange(this: ICellx, listener: TListener, context?: any) {
		return this.cell.offChange(listener, context);
	},

	onError(this: ICellx, listener: TListener, context?: any) {
		return this.cell.onError(listener, context);
	},

	offError(this: ICellx, listener: TListener, context?: any) {
		return this.cell.offError(listener, context);
	},

	subscribe(this: ICellx, listener: (err: Error | null, evt: IEvent) => any, context?: any) {
		return this.cell.subscribe(listener, context);
	},

	unsubscribe(this: ICellx, listener: (err: Error | null, evt: IEvent) => any, context?: any) {
		return this.cell.unsubscribe(listener, context);
	},

	get value() {
		return (this as any as ICellx).cell.value;
	},
	set value(value: any) {
		(this as any as ICellx).cell.value = value;
	},

	pull(this: ICellx) {
		return this.cell.pull();
	},

	reap(this: ICellx) {
		return this.cell.reap();
	},

	dispose(this: ICellx) {
		return this.cell.dispose();
	}
};

export function cellx<T = any, M = any>(
	value: T | TCellPull<T>,
	options?: ICellOptions<T, M>
): ICellx<T> {
	let $cellx = function (value: any) {
		if (arguments.length != 0) {
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
	key: string | symbol,
	value: any
): T {
	(
		(obj[KEY_VALUE_CELLS] as Map<string | symbol, Cell>) || (obj[KEY_VALUE_CELLS] = new Map())
	).set(key, value instanceof Cell ? value : new Cell(value, { context: obj }));

	Object.defineProperty(obj, key, {
		configurable: true,
		enumerable: true,

		get() {
			return (this[KEY_VALUE_CELLS] as Map<string | symbol, Cell>).get(key)!.get();
		},

		set(value) {
			(this[KEY_VALUE_CELLS] as Map<string | symbol, Cell>).get(key)!.set(value);
		}
	});

	return obj;
}

export function defineObservableProperties<T extends object = object>(
	obj: T,
	props: Record<string | symbol, any>
): T {
	for (let key of Object.keys(props)) {
		defineObservableProperty(obj, key, props[key]);
	}

	return obj;
}

export function define<T extends object = object>(obj: T, key: string | symbol, value: any): T;
export function define<T extends object = object>(obj: T, props: Record<string | symbol, any>): T;
export function define(
	obj: object,
	keyOrProps: string | symbol | Record<string | symbol, any>,
	value?: any
) {
	if (typeof keyOrProps == 'object') {
		defineObservableProperties(obj, keyOrProps);
	} else {
		defineObservableProperty(obj, keyOrProps, value);
	}

	return obj;
}
