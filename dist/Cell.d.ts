import { autorun } from './autorun';
import { EventEmitter, IEvent, TListener } from './EventEmitter';
export declare type TCellPull<T, R = T> = (cell: Cell<T>, next: any) => R;
export interface ICellOptions<T, M> {
    debugKey?: string;
    context?: object;
    pull?: TCellPull<T>;
    get?: (value: any) => T;
    validate?: (next: T, value: any) => void;
    merge?: (next: T, value: any) => any;
    put?: (cell: Cell<T>, next: any, value: any) => void;
    reap?: () => void;
    compareValues?: (value1: T, value2: T) => boolean;
    meta?: M;
    value?: T;
    onChange?: TListener;
    onError?: TListener;
}
export declare enum CellState {
    ACTUAL = "actual",
    DIRTY = "dirty",
    CHECK = "check"
}
export interface ICellChangeEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
    type: typeof Cell.EVENT_CHANGE;
    data: {
        prevValue: any;
        value: any;
    };
}
export interface ICellErrorEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
    type: typeof Cell.EVENT_ERROR;
    data: {
        error: any;
    };
}
export declare type TCellEvent<T extends EventEmitter = EventEmitter> = ICellChangeEvent<T> | ICellErrorEvent<T>;
export declare class Cell<T = any, M = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    static EVENT_ERROR: string;
    static get currentlyPulling(): boolean;
    static autorun: typeof autorun;
    static release(): void;
    static afterRelease(cb: Function): void;
    static transact(cb: Function): void;
    debugKey: string | undefined;
    context: object;
    _pull: TCellPull<T> | null;
    _get: ((value: any) => T) | null;
    _validate: ((next: T, value: any) => void) | null;
    _merge: ((next: T, value: any) => any) | null;
    _put: (cell: Cell<T>, next: any, value: any) => void;
    _reap: (() => void) | null;
    _compareValues: (value1: T, value2: T) => boolean;
    meta: M | null;
    _dependencies: Array<Cell> | null | undefined;
    _reactions: Array<Cell>;
    _prevValue: any;
    _value: any;
    _errorCell: Cell<Error | null> | null;
    _error: Error | null;
    _lastErrorEvent: IEvent<this> | null;
    get error(): Error | null;
    _state: CellState;
    get state(): CellState;
    _inited: boolean;
    _hasSubscribers: boolean;
    _active: boolean;
    _currentlyPulling: boolean;
    _updationId: number;
    _bound: boolean;
    constructor(value: T | TCellPull<T>, options?: ICellOptions<T, M>);
    on(type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, listener: TListener, context?: any): this;
    on(listeners: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>, context?: any): this;
    off(type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, listener: TListener, context?: any): this;
    off(listeners?: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>, context?: any): this;
    onChange(listener: TListener, context?: any): this;
    offChange(listener: TListener, context?: any): this;
    onError(listener: TListener, context?: any): this;
    offError(listener: TListener, context?: any): this;
    subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this;
    unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this;
    _addReaction(reaction: Cell): void;
    _deleteReaction(reaction: Cell): void;
    _activate(): void;
    _deactivate(): void;
    _onValueChange(evt: IEvent): void;
    _addToRelease(dirty: boolean): void;
    actualize(): void;
    get value(): T;
    set value(value: T);
    get(): T;
    pull(): boolean;
    set(value: T): this;
    push(value: any): boolean;
    fail(err: any): boolean;
    _setError(err: Error | null): void;
    _setError_(evt: IEvent<this, {
        error: any;
    }> | null): void;
    wait(): never;
    reap(): this;
    dispose(): this;
}
