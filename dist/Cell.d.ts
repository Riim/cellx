import { EventEmitter, IEvent, TListener } from './EventEmitter';
export type TCellPull<TInnerValue = any, TOuterValue = TInnerValue, TContext = any, TMeta = any> = (this: TContext, cell: Cell<TInnerValue, TOuterValue, TContext, TMeta>, value: TInnerValue | undefined) => TInnerValue;
export type TCellPut<TInnerValue = any, TOuterValue = TInnerValue, TContext = any, TMeta = any> = (this: TContext, cell: Cell<TInnerValue, TOuterValue, TContext, TMeta>, next: TOuterValue, value: TInnerValue | undefined) => void;
export interface ICellOptions<TInnerValue = any, TOuterValue = TInnerValue, TContext = any, TMeta = any> {
    debugKey?: string;
    context?: TContext;
    pull?: TCellPull<TInnerValue, TOuterValue, TContext, TMeta>;
    get?: (value: TInnerValue) => TOuterValue;
    validate?: (next: TOuterValue, value: TInnerValue | undefined) => void;
    merge?: (next: TOuterValue, value: TInnerValue | undefined) => TInnerValue;
    put?: TCellPut<TInnerValue, TOuterValue, TContext, TMeta>;
    compareValues?: (next: TInnerValue, value: TInnerValue | undefined) => boolean;
    reap?: (this: TContext) => void;
    meta?: TMeta;
    value?: TOuterValue;
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
export type TCellEvent<T extends EventEmitter = EventEmitter> = ICellChangeEvent<T> | ICellErrorEvent<T>;
export declare class Cell<TInnerValue = any, TOuterValue = TInnerValue, TContext = any, TMeta = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    static EVENT_ERROR: string;
    static get currentlyPulling(): boolean;
    static autorun<TInnerValue = any, TOuterValue = TInnerValue, TContext = any, TMeta = any>(cb: (value: TInnerValue | undefined, disposer: () => void) => TInnerValue, cellOptions?: ICellOptions<TInnerValue, TOuterValue, TContext, TMeta>): () => void;
    static release(): void;
    static afterRelease(cb: Function): void;
    static transact(cb: Function): void;
    debugKey: string | undefined;
    context: TContext;
    _pull: TCellPull<TInnerValue, TOuterValue, TContext, TMeta> | null;
    _get: ((value: TInnerValue) => TOuterValue) | null;
    _validate: ((next: TOuterValue, value: TInnerValue | undefined) => void) | null;
    _merge: ((next: TOuterValue, value: TInnerValue | undefined) => TInnerValue) | null;
    _put: TCellPut<TInnerValue, TOuterValue, TContext, TMeta> | null;
    _compareValues: (next: TInnerValue, value: TInnerValue | undefined) => boolean;
    _reap: (() => void) | null;
    meta: TMeta | null;
    _dependencies: Array<Cell> | null | undefined;
    _reactions: Array<Cell>;
    _value: TInnerValue | undefined;
    _errorCell: Cell<Error | null> | null;
    _error: Error | null;
    _lastErrorEvent: IEvent<this> | null;
    get error(): Error | null;
    _state: CellState;
    get state(): CellState;
    _inited: boolean;
    _active: boolean;
    _currentlyPulling: boolean;
    _updationId: number;
    _bound: boolean;
    constructor(value: TCellPull<TInnerValue, TOuterValue, TContext, TMeta>, options?: ICellOptions<TInnerValue, TOuterValue, TContext, TMeta>);
    constructor(value: TOuterValue, options?: ICellOptions<TInnerValue, TOuterValue, TContext, TMeta>);
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
    get value(): TOuterValue;
    set value(value: TOuterValue);
    get(): TOuterValue;
    pull(): boolean;
    set(value: TOuterValue): this;
    push(value: TInnerValue): boolean;
    fail(err: any): boolean;
    _setError(errorEvent: IEvent<this, {
        error: Error;
    }> | null): void;
    wait(): never;
    reap(): this;
    dispose(): this;
}
