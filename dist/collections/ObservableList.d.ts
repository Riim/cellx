import { EventEmitter, TListener } from '../EventEmitter';
export declare type TObservableListItems<I> = Array<I> | ObservableList<I>;
export declare type TObservableListItemEquals<I> = (a: I, b: I) => any;
export declare type TObservableListItemComparator<I> = (a: I, b: I) => number;
export interface IObservableListOptions<I> {
    itemEquals?: TObservableListItemEquals<I>;
    itemComparator?: TObservableListItemComparator<I>;
    sorted?: boolean;
}
export declare class ObservableList<T = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    _items: Array<T>;
    get length(): number;
    set length(value: number);
    _itemEquals: TObservableListItemEquals<T> | null;
    get itemEquals(): TObservableListItemEquals<T> | null;
    _itemComparator: TObservableListItemComparator<T> | null;
    get itemComparator(): TObservableListItemComparator<T> | null;
    _sorted: boolean;
    get sorted(): boolean;
    constructor(items?: TObservableListItems<T> | null, options?: IObservableListOptions<T>);
    onChange(listener: TListener, context?: any): this;
    offChange(listener: TListener, context?: any): this;
    _validateIndex(index: number | undefined, allowEndIndex?: boolean): number | undefined;
    contains(item: T): boolean;
    indexOf(item: T, fromIndex?: number): number;
    lastIndexOf(item: T, fromIndex?: number): number;
    get(index: number): T | undefined;
    getRange(index: number, count?: number): T[];
    set(index: number, item: T): this;
    setRange(index: number, items: TObservableListItems<T>): this;
    add(item: T, unique?: boolean): this;
    addRange(items: TObservableListItems<T>, uniques?: boolean): this;
    insert(index: number, item: T): this;
    insertRange(index: number, items: TObservableListItems<T>): this;
    remove(item: T, fromIndex?: number): boolean;
    removeAll(item: T, fromIndex?: number): boolean;
    removeAt(index: number): T;
    removeRange(index: number, count?: number): T[];
    replace(oldItem: T, newItem: T, fromIndex?: number): boolean;
    replaceAll(oldItem: T, newItem: T, fromIndex?: number): boolean;
    clear(): this;
    equals(that: any): boolean;
    join(separator?: string): string;
    findIndex(cb: (item: T, index: number, list: this) => any, fromIndex?: number): number;
    findLastIndex(cb: (item: T, index: number, list: this) => any, fromIndex?: number): number;
    find(cb: (item: T, index: number, list: this) => any, fromIndex?: number): T | undefined;
    findLast(cb: (item: T, index: number, list: this) => any, fromIndex?: number): T | undefined;
    clone(deep?: boolean): ObservableList<T>;
    absorbFrom(that: ObservableList): boolean;
    toArray(): T[];
    toString(): string;
    toData<I = any>(): Array<I>;
    _insertSortedValue(item: T): void;
    [Symbol.iterator]: () => Iterator<T>;
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
