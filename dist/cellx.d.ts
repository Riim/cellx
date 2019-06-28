import { Cell, ICellOptions, TCellPull } from './Cell';
import { IObservableListOptions, ObservableList, TObservableListItems } from './collections/ObservableList';
import { ObservableMap, TObservableMapEntries } from './collections/ObservableMap';
export { IEvent, TListener, IRegisteredEvent, EventEmitter } from './EventEmitter';
export { TObservableMapEntries, ObservableMap } from './collections/ObservableMap';
export { TObservableListItemComparator, TObservableListItems, IObservableListOptions, ObservableList } from './collections/ObservableList';
export { TCellPull, ICellOptions, ICellChangeEvent, ICellErrorEvent, TCellEvent, Cell } from './Cell';
export { WaitError } from './WaitError';
export declare function map<K = any, V = any>(entries?: TObservableMapEntries<K, V> | null): ObservableMap<K, V>;
export declare function list<T = any>(items?: TObservableListItems<T> | null, options?: IObservableListOptions<T>): ObservableList<T>;
export interface ICellx<T> {
    (value?: T): T;
    (method: 'cell', _: any): Cell<T>;
    (method: 'bind', _: any): ICellx<T>;
    (method: 'pull', _: any): boolean;
    (method: 'push', value: any): Cell<T>;
    (method: 'fail', err: any): Cell<T>;
    (method: 'reap' | 'dispose', _: any): Cell<T>;
}
export declare const KEY_CELL_MAP: unique symbol;
export declare function cellx<T = any, M = any>(value: T | TCellPull<T>, options?: ICellOptions<T, M>): ICellx<T>;
export declare function defineObservableProperty<T extends object = object>(obj: T, name: string, value: any): T;
export declare function defineObservableProperties<T extends object = object>(obj: T, props: Record<string, any>): T;
export declare function define<T extends object = object>(obj: T, name: string, value: any): T;
export declare function define<T extends object = object>(obj: T, props: Record<string, any>): T;
