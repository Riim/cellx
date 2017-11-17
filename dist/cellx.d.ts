import { Cell, ICellOptions, TCellEvent, TCellPull } from './Cell';
import { IObservableListOptions, ObservableList, TObservableListItems } from './collections/ObservableList';
import { IObservableMapOptions, ObservableMap, TObservableMapEntries } from './collections/ObservableMap';
import { TListener } from './EventEmitter';
export { IEvent, TListener, IRegisteredEvent, EventEmitter } from './EventEmitter';
export { FreezableCollection } from './collections/FreezableCollection';
export { ObservableCollection } from './collections/ObservableCollection';
export { TObservableMapEntries, IObservableMapOptions, ObservableMap } from './collections/ObservableMap';
export { TComparator, TObservableListItems, IObservableListOptions, ObservableList } from './collections/ObservableList';
export { TCellPull, ICellOptions, ICellChangeEvent, ICellErrorEvent, TCellEvent, Cell } from './Cell';
export { WaitError } from './WaitError';
export declare function map<K = any, V = any>(entries?: TObservableMapEntries<K, V> | null, opts?: IObservableMapOptions | boolean): ObservableMap<K, V>;
export declare function list<T = any>(items?: TObservableListItems<T> | null, opts?: IObservableListOptions<T> | boolean): ObservableList<T>;
export interface ICellx<T> {
    (value?: T): T;
    (method: 'bind', $: any): ICellx<T>;
    (method: 'unwrap', $: any): Cell<T>;
    (method: 'addChangeListener' | 'removeChangeListener' | 'addErrorListener' | 'removeErrorListener', listener: TListener, context?: any): Cell<T>;
    (method: 'subscribe' | 'unsubscribe', listener: (err: Error | void, evt: TCellEvent) => boolean | void, context?: any): Cell<T>;
    (method: 'pull', $: any): boolean;
    (method: 'getError', $: any): Error;
    (method: 'push', value: any): Cell<T>;
    (method: 'fail', err: any): Cell<T>;
    (method: 'isPending', $: any): boolean;
    (method: 'then', onFulfilled: (value: T) => any, onRejected?: (err: any) => any): Promise<any>;
    (method: 'catch', onRejected: (err: any) => any): Promise<any>;
    (method: 'reap' | 'dispose', $: any): Cell<T>;
}
export declare let KEY_CELL_MAP: symbol;
export declare function cellx<T = any>(value: T | TCellPull<T>, opts?: ICellOptions<T>): ICellx<T>;
export declare function defineObservableProperty<T extends object = object>(obj: T, name: string, value: any): T;
export declare function defineObservableProperties<T extends object = object>(obj: T, props: {
    [name: string]: string;
}): T;
export declare function define<T extends object = object>(obj: T, name: string, value: any): T;
export declare function define<T extends object = object>(obj: T, props: {
    [name: string]: any;
}): T;
