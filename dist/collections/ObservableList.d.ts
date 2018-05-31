import { EventEmitter, IEvent } from '../EventEmitter';
import { FreezableCollection } from './FreezableCollection';
import { ObservableCollection } from './ObservableCollection';
export declare type TComparator<T> = (a: T, b: T) => number;
export declare type TObservableListItems<T> = Array<T> | ObservableList<T>;
export interface IObservableListOptions<T> {
    adoptsValueChanges?: boolean;
    comparator?: TComparator<T>;
    sorted?: boolean;
}
export declare class ObservableList<T = any> extends EventEmitter implements FreezableCollection, ObservableCollection<T> {
    _items: Array<T>;
    _length: number;
    readonly length: number;
    _comparator: TComparator<T> | null;
    _sorted: boolean;
    constructor(items?: TObservableListItems<T> | null, options?: IObservableListOptions<T> | boolean);
    _validateIndex(index: number | undefined, allowEndIndex?: boolean): number | undefined;
    contains(value: T): boolean;
    indexOf(value: T, fromIndex?: number): number;
    lastIndexOf(value: T, fromIndex?: number): number;
    get(index: number): T | undefined;
    getRange(index: number, count?: number): Array<T>;
    set(index: number, value: T): this;
    setRange(index: number, values: TObservableListItems<T>): this;
    add(value: T): this;
    addRange(values: TObservableListItems<T>): this;
    _addRange(values: TObservableListItems<T>): void;
    insert(index: number, value: T): this;
    insertRange(index: number, values: TObservableListItems<T>): this;
    remove(value: T, fromIndex?: number): boolean;
    removeAll(value: T, fromIndex?: number): boolean;
    removeEach(values: TObservableListItems<T>, fromIndex?: number): boolean;
    removeAllEach(values: TObservableListItems<T>, fromIndex?: number): boolean;
    removeAt(index: number): T;
    removeRange(index: number, count?: number): Array<T>;
    clear(): this;
    join(separator?: string): string;
    find(callback: (item: T, index: number, list: this) => any, context?: any): T | undefined;
    findIndex(callback: (item: T, index: number, list: this) => any, context?: any): number;
    clone(deep?: boolean): ObservableList<T>;
    toArray(): Array<T>;
    toString(): string;
    _insertSortedValue(value: T): void;
    _frozen: boolean;
    readonly frozen: boolean;
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
declare module '../collections/ObservableList' {
    interface ObservableList<T = any> {
        forEach(callback: (item: T, index: number, list: this) => void, context?: any): void;
        map<R>(callback: (item: T, index: number, list: this) => R, context?: any): Array<R>;
        filter<R extends T>(callback: (item: T, index: number, list: this) => item is R, context?: any): Array<R>;
        filter(callback: (item: T, index: number, list: this) => any, context?: any): Array<T>;
        every(callback: (item: T, index: number, list: this) => any, context?: any): boolean;
        some(callback: (item: T, index: number, list: this) => any, context?: any): boolean;
        reduce<R = T>(callback: (accumulator: R, item: T, index: number, list: this) => R, initialValue?: R): R;
        reduceRight<R = T>(callback: (accumulator: R, item: T, index: number, list: this) => R, initialValue?: R): R;
        keys(): Iterator<number>;
        values(): Iterator<T>;
        entries(): Iterator<[number, T]>;
    }
}
