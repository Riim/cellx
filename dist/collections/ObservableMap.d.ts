import { EventEmitter, IEvent } from '../EventEmitter';
import { FreezableCollection } from './FreezableCollection';
import { ObservableCollection } from './ObservableCollection';
export declare type TObservableMapEntries<K, V> = Array<[K, V]> | {
    [key: string]: V;
} | Map<K, V> | ObservableMap<K, V>;
export interface IObservableMapOptions {
    adoptsValueChanges?: boolean;
}
export declare class ObservableMap<K = any, V = any> extends EventEmitter implements FreezableCollection, ObservableCollection<V> {
    _entries: Map<K, V>;
    _size: number;
    readonly size: number;
    constructor(entries?: TObservableMapEntries<K, V> | null, opts?: IObservableMapOptions | boolean);
    has(key: K): boolean;
    contains(value: V): boolean;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): this;
    forEach(callback: (value: V, key: K, map: this) => void, context?: any): void;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
    clone(): ObservableMap<K, V>;
    _isFrozen: boolean;
    readonly isFrozen: boolean;
    freeze(): this;
    unfreeze(): this;
    _throwIfFrozen(msg?: string): void;
    _adoptsValueChanges: boolean;
    readonly adoptsValueChanges: boolean;
    _valueCounts: Map<any, number>;
    _onItemChange(evt: IEvent): void;
    _registerValue(value: any): any;
    _unregisterValue(value: any): void;
}
