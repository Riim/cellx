import { EventEmitter } from '../EventEmitter';
export declare type TObservableListItems<T> = Array<T> | ObservableList<T>;
export declare type TObservableListItemComparator<T> = (a: T, b: T) => number;
export interface IObservableListOptions<T> {
    comparator?: TObservableListItemComparator<T>;
    sorted?: boolean;
}
export declare class ObservableList<T = any> extends EventEmitter {
    _items: Array<T>;
    readonly length: number;
    _comparator: TObservableListItemComparator<T> | null;
    _sorted: boolean;
    constructor(items?: TObservableListItems<T> | null, options?: IObservableListOptions<T>);
    _validateIndex(index: number | undefined, allowEndIndex?: boolean): number | undefined;
    contains(value: T): boolean;
    indexOf(value: T, fromIndex?: number): number;
    lastIndexOf(value: T, fromIndex?: number): number;
    get(index: number): T | undefined;
    getRange(index: number, count?: number): Array<T>;
    set(index: number, value: T): this;
    setRange(index: number, values: TObservableListItems<T>): this;
    add(value: T, unique?: boolean): this;
    addRange(values: TObservableListItems<T>, unique?: boolean): this;
    insert(index: number, value: T): this;
    insertRange(index: number, values: TObservableListItems<T>): this;
    remove(value: T, fromIndex?: number): boolean;
    removeAll(value: T, fromIndex?: number): boolean;
    removeEach(values: TObservableListItems<T>, fromIndex?: number): boolean;
    removeAt(index: number): T;
    removeRange(index: number, count?: number): Array<T>;
    clear(): this;
    join(separator?: string): string;
    find(cb: (item: T, index: number, list: this) => any, context?: any): T | undefined;
    findIndex(cb: (item: T, index: number, list: this) => any, context?: any): number;
    clone(deep?: boolean): ObservableList<T>;
    toArray(): Array<T>;
    toString(): string;
    _insertSortedValue(value: T): void;
}
declare module './ObservableList' {
    interface ObservableList<T = any> {
        forEach(cb: (item: T, index: number, list: this) => void, context?: any): void;
        map<R>(cb: (item: T, index: number, list: this) => R, context?: any): Array<R>;
        filter<R extends T>(cb: (item: T, index: number, list: this) => item is R, context?: any): Array<R>;
        filter(cb: (item: T, index: number, list: this) => any, context?: any): Array<T>;
        every(cb: (item: T, index: number, list: this) => any, context?: any): boolean;
        some(cb: (item: T, index: number, list: this) => any, context?: any): boolean;
        reduce<R = T>(cb: (accumulator: R, item: T, index: number, list: this) => R, initialValue?: R): R;
        reduceRight<R = T>(cb: (accumulator: R, item: T, index: number, list: this) => R, initialValue?: R): R;
        keys(): Iterator<number>;
        values(): Iterator<T>;
        entries(): Iterator<[number, T]>;
    }
}
