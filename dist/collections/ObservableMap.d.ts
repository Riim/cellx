import { EventEmitter, TListener } from '../EventEmitter';
export declare type TObservableMapEntries<K, V> = Array<[K, V]> | Record<string, V> | Map<K, V> | ObservableMap<K, V>;
export declare type TObservableMapValueEquals<V> = (a: V, b: V) => any;
export interface IObservableMapOptions<I> {
    valueEquals?: TObservableMapValueEquals<I>;
}
export declare class ObservableMap<K = any, V = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    _entries: Map<K, V>;
    get size(): number;
    _valueEquals: TObservableMapValueEquals<V> | null;
    get valueEquals(): TObservableMapValueEquals<V> | null;
    constructor(entries?: TObservableMapEntries<K, V> | null, options?: IObservableMapOptions<V>);
    onChange(listener: TListener, context?: any): this;
    offChange(listener: TListener, context?: any): this;
    has(key: K): boolean;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): this;
    equals(that: any): boolean;
    forEach(cb: (value: V, key: K, map: this) => void, context?: any): void;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
    clone(deep?: boolean): ObservableMap<K, V>;
    absorbFrom(that: any): boolean;
    toData<I = any>(): Record<string, I>;
    [Symbol.iterator]: () => Iterator<[K, V]>;
}
