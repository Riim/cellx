import { EventEmitter } from '../EventEmitter';
export declare type TObservableMapEntries<K, V> = Array<[K, V]> | Record<string, V> | Map<K, V> | ObservableMap<K, V>;
export declare class ObservableMap<K = any, V = any> extends EventEmitter {
    _entries: Map<K, V>;
    readonly size: number;
    constructor(entries?: TObservableMapEntries<K, V> | null);
    has(key: K): boolean;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): this;
    forEach(cb: (value: V, key: K, map: this) => void, context?: any): void;
    keys(): Iterator<K>;
    values(): Iterator<V>;
    entries(): Iterator<[K, V]>;
    clone(deep?: boolean): ObservableMap<K, V>;
}
