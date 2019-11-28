import { EventEmitter, TListener } from '../EventEmitter';
export declare type TObservableMapEntries<K, V> = Array<[K, V]> | Record<string, V> | Map<K, V> | ObservableMap<K, V>;
export declare class ObservableMap<K = any, V = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    _entries: Map<K, V>;
    get size(): number;
    constructor(entries?: TObservableMapEntries<K, V> | null);
    onChange(listener: TListener, context?: any): this;
    offChange(listener: TListener, context?: any): this;
    has(key: K): boolean;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): this;
    equals(that: any): boolean;
    forEach(cb: (value: V, key: K, map: this) => void, context?: any): void;
    keys(): Iterator<K>;
    values(): Iterator<V>;
    entries(): Iterator<[K, V]>;
    clone(deep?: boolean): ObservableMap<K, V>;
    absorbFrom(that: any): boolean;
    toData<I = any>(): Record<string, I>;
    [Symbol.iterator]: () => Iterator<[K, V], any, undefined>;
}
