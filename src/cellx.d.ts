declare namespace Cellx {
	interface IComparator<T> {
		(a: T, b: T): number;
	}

	export namespace ErrorLogger {
		function setHandler(handler: (...msg: Array<any>) => void): void;
		function log(...msg: Array<any>): void;
	}

	interface IEventData {
		target?: EventEmitter;
		type: string;
		bubbles?: boolean;
		isPropagationStopped?: boolean;
		[key: string]: any;
	}

	interface IEvent<T extends EventEmitter = EventEmitter> {
		target: T;
		type: string;
		bubbles?: boolean;
		isPropagationStopped?: boolean;
		[key: string]: any;
	}

	interface IEventEmitterListener {
		(evt: IEvent): boolean | void;
	}

	export class EventEmitter {
		static currentlySubscribing: boolean;

		_events: Map<string, Array<{ listener: IEventEmitterListener; context: any }>>;

		getEvents(): { [type: string]: Array<{ listener: (evt: IEvent) => boolean | void; context: any }> };
		getEvents(type: string): Array<{ listener: (evt: IEvent) => boolean | void; context: any }>;

		on(type: string, listener: IEventEmitterListener, context?: any): this;
		on(listeners: { [key: string]: IEventEmitterListener }, context?: any): this;

		off(type: string, listener: IEventEmitterListener, context?: any): this;
		off(listeners: { [key: string]: IEventEmitterListener }, context?: any): this;
		off(): this;

		protected _on(type: string, listener: IEventEmitterListener, context: any): void;
		protected _off(type: string, listener: IEventEmitterListener, context: any): void;

		once(type: string, listener: IEventEmitterListener, context?: any): IEventEmitterListener;

		emit(evt: IEventData): IEvent;
		emit(type: string): IEvent;

		protected _handleEvent(evt: IEvent): void;

		protected _logError(...msg: Array<any>): void;
	}

	interface IObservableCollection extends EventEmitter {
	}

	type ObservableMapEntries<K, V> = Array<[K, V]> | { [key: string]: V } | Map<K, V> | ObservableMap<K, V>;

	interface IObservableMapOptions {
		adoptsValueChanges?: boolean;
	}

	export class ObservableMap<K = any, V = any> extends EventEmitter implements IObservableCollection {
		size: number;
		adoptsValueChanges: boolean;
		get isFrozen(): boolean;

		constructor(entries?: ObservableMapEntries<K, V> | null, opts?: IObservableMapOptions);
		constructor(entries?: ObservableMapEntries<K, V> | null, adoptsValueChanges?: boolean);

		freeze(): this;
		unfreeze(): this;

		has(key: K): boolean;
		contains(value: V): boolean;
		get(key: K): V | undefined;
		set(key: K, value: V): this;
		delete(key: K): boolean;
		clear(): this;

		forEach(callback: (value: V, key: K, map: ObservableMap<K, V>) => void, context?: any): void;
		keys(): Iterator<K>;
		values(): Iterator<V>;
		entries(): Iterator<[K, V]>;

		clone(): this;
	}

	type ObservableListItems<T> = Array<T> | ObservableList<T>;

	interface IObservableListOptions<T> {
		adoptsValueChanges?: boolean;
		comparator?: IComparator<T>;
		sorted?: boolean;
	}

	export class ObservableList<T = any> extends EventEmitter implements IObservableCollection {
		length: number;
		adoptsValueChanges: boolean;
		comparator: IComparator<T>;
		sorted: boolean;
		get isFrozen(): boolean;

		constructor(items?: ObservableListItems<T> | null, opts?: IObservableListOptions<T>);
		constructor(items?: ObservableListItems<T> | null, adoptsValueChanges?: boolean);

		freeze(): this;
		unfreeze(): this;

		contains(value: T): boolean;
		indexOf(value: T, fromIndex?: number): number;
		lastIndexOf(value: T, fromIndex?: number): number;

		get(index: number): T | undefined;
		getRange(index: number, count?: number): Array<T>;
		set(index: number, value: T): this;
		setRange(index: number, values: Array<T> | ObservableList<T>): this;
		add(value: T): this;
		addRange(values: Array<T> | ObservableList<T>): this;
		protected _addRange(values: Array<T> | ObservableList<T>): void;
		insert(index: number, value: T): this;
		insertRange(index: number, values: Array<T> | ObservableList<T>): this;
		remove(value: T, fromIndex?: number): boolean;
		removeAll(value: T, fromIndex?: number): boolean;
		removeEach(values: Array<T> | ObservableList<T>, fromIndex?: number): boolean;
		removeAllEach(values: Array<T> | ObservableList<T>, fromIndex?: number): boolean;
		removeAt(index: number): T;
		removeRange(index: number, count?: number): Array<T>;
		clear(): this;

		join(separator?: string): string;

		forEach(callback: (item: T, index: number, list: ObservableList<T>) => void, context?: any): void;
		map<R = any>(callback: (item: T, index: number, list: ObservableList<T>) => any, context?: any): Array<R>;
		filter(callback: (item: T, index: number, list: ObservableList<T>) => boolean | void, context?: any): Array<T>;
		find(
			callback: (item: T, index: number, list: ObservableList<T>) => boolean | void,
			context?: any
		): T | undefined;
		findIndex(callback: (item: T, index: number, list: ObservableList<T>) => boolean | void, context?: any): number;
		every(callback: (item: T, index: number, list: ObservableList<T>) => boolean | void, context?: any): boolean;
		some(callback: (item: T, index: number, list: ObservableList<T>) => boolean | void, context?: any): boolean;
		reduce(
			callback: (accumulator: any, item: T, index: number, list: ObservableList<T>) => any,
			initialValue?: any
		): any;
		reduceRight(
			callback: (accumulator: any, item: T, index: number, list: ObservableList<T>) => any,
			initialValue?: any
		): any;

		clone(): this;

		toArray(): Array<T>;
		toString(): string;
	}

	interface ICellPull<T> {
		(cell: Cell<T>, next: any): any;
	}

	interface ICellOptions<T> {
		debugKey?: string;
		owner?: object;
		get?: (value: any) => T;
		validate?: (value: T, oldValue: any) => void;
		merge?: (value: T, oldValue: any) => any;
		put?: (cell: Cell<T>, value: any, oldValue: any) => void;
		reap?: () => void;
		onChange?: IEventEmitterListener;
		onError?: IEventEmitterListener;
	}

	interface ICellChangeEvent extends IEvent<Cell> {
		type: 'change';
		oldValue: any;
		value: any;
		prev: ICellChangeEvent;
	}

	interface ICellErrorEvent extends IEvent<Cell> {
		type: 'error';
		error: any;
	}

	type ICellEvent = ICellChangeEvent | ICellErrorEvent;

	export class Cell<T = any> extends EventEmitter {
		static configure(config: { asynchronous?: boolean }): void;
		static readonly currentlyPulling: boolean;
		static autorun(callback: () => void, context?: any): () => void;
		static forceRelease(): void;
		static transaction(callback: () => void): void;
		static afterRelease(callback: () => void): void;

		debugKey: string;
		owner: object;

		constructor(value?: T, opts?: ICellOptions<T>);
		constructor(pull: ICellPull<T>, opts?: ICellOptions<T>);

		addChangeListener(listener: IEventEmitterListener, context?: any): this;
		removeChangeListener(listener: IEventEmitterListener, context?: any): this;
		addErrorListener(listener: IEventEmitterListener, context?: any): this;
		removeErrorListener(listener: IEventEmitterListener, context?: any): this;
		subscribe(listener: (err: Error | void, evt: ICellEvent) => boolean | void, context?: any): this;
		unsubscribe(listener: (err: Error | void, evt: ICellEvent) => boolean | void, context?: any): this;

		get(): T;
		pull(): boolean;
		getError(): Error;
		set(value: T): this;
		push(value: any): this;
		fail(err: any): this;

		isPending(): boolean;
		then<R = any>(onFulfilled: (value: T) => any, onRejected?: (err: any) => any): Promise<R>;
		catch<R = any>(onRejected: (err: any) => any): Promise<R>;

		dispose(): this;
	}

	export function autorun(callback: () => void, context?: any): () => void;

	export let KEY_UID: symbol;
	export let KEY_CELLS: symbol;

	export function map<K = any, V = any>(
		entries?: ObservableMapEntries<K, V> | null,
		opts?: IObservableMapOptions
	): ObservableMap<K, V>;
	export function map<K = any, V = any>(
		entries?: ObservableMapEntries<K, V> | null,
		adoptsValueChanges?: boolean
	): ObservableMap<K, V>;

	export function list<T = any>(
		items?: ObservableListItems<T> | null,
		opts?: IObservableListOptions<T>
	): ObservableList<T>;
	export function list<T = any>(
		items?: ObservableListItems<T> | null,
		adoptsValueChanges?: boolean
	): ObservableList<T>;

	export function defineObservableProperty(obj: EventEmitter, name: string, value: any): EventEmitter;
	export function defineObservableProperties(obj: EventEmitter, props: { [key: string]: any }): EventEmitter;
	export function define(obj: EventEmitter, name: string, value: any): EventEmitter;
	export function define(obj: EventEmitter, props: { [key: string]: any }): EventEmitter;

	export namespace JS {
		function is(a: any, b: any): boolean;
		function Symbol(key: string): symbol;
		let Map: MapConstructor;
	}

	export namespace Utils {
		function logError(...msg: Array<any>): void;
		function nextUID(): string;
		function mixin(target: object, ...sources: Array<object>): object;
		function nextTick(callback: () => void): void;
	}

	interface ICellx<T> {
		(value?: T): T;

		(method: 'bind', zeroArg: any): ICellx<T>;
		(method: 'unwrap', zeroArg: any): Cell<T>;

		(method: 'addChangeListener', listener: IEventEmitterListener, context?: any): Cell<T>;
		(method: 'removeChangeListener', listener: IEventEmitterListener, context?: any): Cell<T>;
		(method: 'addErrorListener', listener: IEventEmitterListener, context?: any): Cell<T>;
		(method: 'removeErrorListener', listener: IEventEmitterListener, context?: any): Cell<T>;
		(method: 'subscribe', listener: (err: Error | void, evt: ICellEvent) => boolean | void, context?: any): Cell<T>;
		(method: 'unsubscribe', listener: (err: Error | void, evt: ICellEvent) => boolean | void, context?: any):
			Cell<T>;

		(method: 'pull', zeroArg: any): boolean;
		(method: 'getError', zeroArg: any): Error;
		(method: 'push', value: any): Cell<T>;
		(method: 'fail', err: any): Cell<T>;

		(method: 'isPending', zeroArg: any): boolean;
		(method: 'then', onFulfilled: (value: T) => any, onRejected?: (err: any) => any): Promise<any>;
		(method: 'catch', onRejected: (err: any) => any): Promise<any>;
		(method: 'dispose', zeroArg: any): Cell<T>;
	}

	export function cellx<T = any>(value?: T, opts?: ICellOptions<T>): ICellx<T>;
	export function cellx<T = any>(pull: ICellPull<T>, opts?: ICellOptions<T>): ICellx<T>;
}

declare function Cellx<T = any>(value?: T, opts?: Cellx.ICellOptions<T>): Cellx.ICellx<T>;
declare function Cellx<T = any>(pull: Cellx.ICellPull<T>, opts?: Cellx.ICellOptions<T>): Cellx.ICellx<T>;

export = Cellx;
