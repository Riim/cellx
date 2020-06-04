import { EventEmitter, TListener } from '../EventEmitter';
export declare type TObservableListItems<I> = Array<I> | ObservableList<I>;
export declare type TObservableListItemEquals<I> = (a: I, b: I) => any;
export declare type TObservableListItemComparator<I> = (a: I, b: I) => number;
export interface IObservableListOptions<I> {
    itemEquals?: TObservableListItemEquals<I>;
    itemComparator?: TObservableListItemComparator<I>;
    sorted?: boolean;
}
export declare class ObservableList<I = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    _items: Array<I>;
    get length(): number;
    set length(value: number);
    _itemEquals: TObservableListItemEquals<I> | null;
    get itemEquals(): TObservableListItemEquals<I> | null;
    _itemComparator: TObservableListItemComparator<I> | null;
    get itemComparator(): TObservableListItemComparator<I> | null;
    _sorted: boolean;
    get sorted(): boolean;
    constructor(items?: TObservableListItems<I> | null, options?: IObservableListOptions<I>);
    onChange(listener: TListener, context?: any): this;
    offChange(listener: TListener, context?: any): this;
    _validateIndex(index: number | undefined, allowEndIndex?: boolean): number | undefined;
    contains(item: I): boolean;
    indexOf(item: I, fromIndex?: number): number;
    lastIndexOf(item: I, fromIndex?: number): number;
    get(index: number): I | undefined;
    getRange(index: number, count?: number): I[];
    set(index: number, item: I): this;
    setRange(index: number, items: TObservableListItems<I>): this;
    add(item: I, unique?: boolean): this;
    addRange(items: TObservableListItems<I>, unique?: boolean): this;
    insert(index: number, item: I): this;
    insertRange(index: number, items: TObservableListItems<I>): this;
    remove(item: I, fromIndex?: number): boolean;
    removeAll(item: I, fromIndex?: number): boolean;
    removeEach(items: TObservableListItems<I>, fromIndex?: number): boolean;
    removeAt(index: number): I;
    removeRange(index: number, count?: number): I[];
    replace(oldValue: I, newValue: I): boolean;
    clear(): this;
    equals(that: any): boolean;
    join(separator?: string): string;
    find(cb: (item: I, index: number, list: this) => any, context?: any): I | undefined;
    findIndex(cb: (item: I, index: number, list: this) => any, context?: any): number;
    clone(deep?: boolean): ObservableList<I>;
    absorbFrom(that: ObservableList): boolean;
    toArray(): I[];
    toString(): string;
    toData<I = any>(): Array<I>;
    _insertSortedValue(item: I): void;
    [Symbol.iterator]: () => Iterator<I>;
}
declare module './ObservableList' {
    interface ObservableList<I = any> {
        forEach(cb: (item: I, index: number, list: this) => void, context?: any): void;
        map<R>(cb: (item: I, index: number, list: this) => R, context?: any): Array<R>;
        filter<R extends I>(cb: (item: I, index: number, list: this) => item is R, context?: any): Array<R>;
        filter(cb: (item: I, index: number, list: this) => any, context?: any): Array<I>;
        every(cb: (item: I, index: number, list: this) => any, context?: any): boolean;
        some(cb: (item: I, index: number, list: this) => any, context?: any): boolean;
        reduce<R = I>(cb: (accumulator: R, item: I, index: number, list: this) => R, initialValue?: R): R;
        reduceRight<R = I>(cb: (accumulator: R, item: I, index: number, list: this) => R, initialValue?: R): R;
        keys(): Iterator<number>;
        values(): Iterator<I>;
        entries(): Iterator<[number, I]>;
    }
}
