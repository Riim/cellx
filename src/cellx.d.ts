/// <reference path="../typings/es6-collections/es6-collections.d.ts"/>
/// <reference path="../typings/es6-promise/main.d.ts"/>

import { Map } from 'es6-collections';
import { Promise } from 'es6-promise';

interface IIterator<T> {
	next: () => { value: T, done: boolean }
}

interface IComparator<T> {
	(a: T, b: T): number;
}

export let KEY_UID: symbol;

export namespace ErrorLogger {
	function setHandler(handler: (...msg: Array<any>) => void): void;
	function log(...msg: Array<any>): void;
}

interface IEvent {
	target?: Object;
	type: string;
	bubbles?: boolean;
	isPropagationStopped?: boolean;
}

interface IEventEmitterListener {
	(evt: IEvent): boolean|void;
}

export class EventEmitter {
	static KEY_INNER: symbol;

	protected _events: { [key: string]: Array<{ listener: IEventEmitterListener, context: any }> };

	on(type: string, listener: IEventEmitterListener, context?: any): EventEmitter;
	on(listeners: { [key: string]: IEventEmitterListener }, context?: any): EventEmitter;

	off(type: string, listener: IEventEmitterListener, context?: any): EventEmitter;
	off(listeners: { [key: string]: IEventEmitterListener }, context?: any): EventEmitter;
	off(): EventEmitter;

	protected _on(type: string, listener: IEventEmitterListener, context: any): void;
	protected _off(type: string, listener: IEventEmitterListener, context: any): void;

	once(type: string, listener: IEventEmitterListener, context?: any): EventEmitter;

	emit(evt: IEvent): IEvent;
	emit(type: string): IEvent;

	protected _handleEvent(evt: IEvent): void;

	protected _logError(...msg: Array<any>): void;
}

interface IObservableCollection extends EventEmitter {
}

type ObservableMapEntries<K, V> = Array<[K, V]>|{ [key: string]: V }|Map<K, V>|ObservableMap<K, V>;

interface IObservableMapOptions {
	adoptsItemChanges?: boolean;
}

export class ObservableMap<K, V> extends EventEmitter implements IObservableCollection {
	size: number;
	adoptsItemChanges: boolean;

	constructor(entries?: ObservableMapEntries<K, V>, opts?: IObservableMapOptions);

	has(key: K): boolean;
	contains(value: V): boolean;
	get(key: K): V;
	set(key: K, value: V): ObservableMap<K, V>;
	delete(key: K): boolean;
	clear(): ObservableMap<K, V>;

	forEach(cb: (value: V, key: K, map: ObservableMap<K, V>) => void, context?: any): void;
	keys(): IIterator<K>;
	values(): IIterator<V>;
	entries(): IIterator<[K, V]>;

	clone(): ObservableMap<K, V>;
}

type ObservableListItems<T> = Array<T>|ObservableList<T>;

interface IObservableListOptions<T> {
	adoptsItemChanges?: boolean;
	comparator?: IComparator<T>;
	sorted?: boolean;
}

export class ObservableList<T> extends EventEmitter implements IObservableCollection {
	length: number;
	adoptsItemChanges: boolean;
	comparator: IComparator<T>;
	sorted: boolean;

	constructor(items?: ObservableListItems<T>, opts?: IObservableListOptions<T>);

	contains(value: T): boolean;
	indexOf(value: T, fromIndex?: number): number;
	lastIndexOf(value: T, fromIndex?: number): number;

	get(index: number): T;
	getRange(index: number, count?: number): Array<T>;
	set(index: number, value: T): ObservableList<T>;
	setRange(index: number, items: Array<T>): ObservableList<T>;
	add(item: T): ObservableList<T>;
	addRange(items: Array<T>): ObservableList<T>;
	insert(index: number, item: T): ObservableList<T>;
	insertRange(index: number, items: Array<T>): ObservableList<T>;
	remove(item: T, fromIndex?: number): boolean;
	removeAll(item: T, fromIndex?: number): boolean;
	removeAt(index: number): T;
	removeRange(index: number, count?: number): Array<T>;
	clear(): ObservableList<T>;

	join(separator?: string): string;

	forEach(cb: (item: T, index: number, list: ObservableList<T>) => void, context?: any): void;
	map(cb: (item: T, index: number, list: ObservableList<T>) => any, context?: any): Array<any>;
	filter(cb: (item: T, index: number, list: ObservableList<T>) => boolean|void, context?: any): Array<T>;
	find(cb: (item: T, index: number, list: ObservableList<T>) => boolean|void, context?: any): T;
	findIndex(cb: (item: T, index: number, list: ObservableList<T>) => boolean|void, context?: any): number;
	every(cb: (item: T, index: number, list: ObservableList<T>) => boolean|void, context?: any): boolean;
	some(cb: (item: T, index: number, list: ObservableList<T>) => boolean|void, context?: any): boolean;
	reduce(cb: (accumulator: any, item: T, index: number, list: ObservableList<T>) => any, initialValue?: any): any;
	reduceRight(cb: (accumulator: any, item: T, index: number, list: ObservableList<T>) => any,
		initialValue?: any): any;

	clone(): ObservableList<T>;

	toArray(): Array<T>;
	toString(): string;
}

interface ICellPull<T> {
	(push: (value: T) => void, fail: (err: any) => void, oldValue: T): T|void;
}

interface ICellOptions<T> {
	debugKey?: string;
	owner?: Object;
	validate?: (value: T, oldValue: T) => void;
	put?: (value: T, push: (value: T) => void, fail: (err: any) => void, oldValue: T) => void;
	reap?: () => void;
	onChange?: IEventEmitterListener;
	onError?: IEventEmitterListener;
}

interface ICellEvent<T> extends IEvent {
	oldValue: T;
	value: T;
	prev: ICellEvent<T>
}

export class Cell<T> extends EventEmitter {
	debugKey: string;
	owner: Object;

	initialValue: T;

	constructor(value?: T, opts?: ICellOptions<T>);
	constructor(pull: ICellPull<T>, opts?: ICellOptions<T>);

	addChangeListener(listener: IEventEmitterListener, context?: any): Cell<T>;
	removeChangeListener(listener: IEventEmitterListener, context?: any): Cell<T>;
	addErrorListener(listener: IEventEmitterListener, context?: any): Cell<T>;
	removeErrorListener(listener: IEventEmitterListener, context?: any): Cell<T>;
	subscribe(listener: (err: Error|void, evt: ICellEvent<T>) => boolean|void, context?: any): Cell<T>;
	unsubscribe(listener: (err: Error|void, evt: ICellEvent<T>) => boolean|void, context?: any): Cell<T>;

	pull(): Cell<T>;
	get(): T;
	set(value: T): Cell<T>;
	push(value: T): Cell<T>;
	fail(err: any): Cell<T>;
	getError(): Error;

	then(onFulfilled?: (value: T) => any, onRejected?: (err: any) => any): Promise<any>;
	catch(onRejected: (err: any) => any): Promise<any>;

	dispose(): Cell<T>;
}

export function map<K, V>(entries?: ObservableMapEntries<K, V>, opts?: IObservableMapOptions): ObservableMap<K, V>;
export function map<K, V>(entries?: ObservableMapEntries<K, V>, adoptsItemChanges?: boolean): ObservableMap<K, V>;

export function list<T>(items?: ObservableListItems<T>, opts?: IObservableListOptions<T>): ObservableList<T>;
export function list<T>(items?: ObservableListItems<T>, adoptsItemChanges?: boolean): ObservableList<T>;

export function define(obj: EventEmitter, name: string, value: any): EventEmitter;
export function define(obj: EventEmitter, props: { [key: string]: any }): EventEmitter;

export namespace js {
}

export namespace utils {
	function logError(...msg: Array<any>): void;
	function nextUID(): string;
	function mixin(target: Object, source: Object): Object;
	function nextTick(cb: () => void): void;
	function defineObservableProperty(obj: EventEmitter, name: string, value: any): EventEmitter;
	function defineObservableProperties(obj: EventEmitter, props: { [key: string]: any }): EventEmitter;
}

interface ICellx<T> {
	(value?: T): T;
	(method: string, arg1: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any): ICellx<T>|Error|Promise<any>|Cell<T>;
}

export function cellx<T>(value?: T, opts?: ICellOptions<T>): ICellx<T>;
export function cellx<T>(pull: ICellPull<T>, opts?: ICellOptions<T>): ICellx<T>;
