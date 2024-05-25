import { EventEmitter, IEvent, TListener } from './EventEmitter';
export type TCellPull<TValue = any, TContext = any, TMeta = any> = (this: TContext, cell: Cell<TValue, TContext, TMeta>, value: TValue | undefined) => TValue;
export type TCellPut<TValue = any, TContext = any, TMeta = any> = (this: TContext, cell: Cell<TValue, TContext, TMeta>, next: TValue, value: TValue | undefined) => void;
export interface ICellOptions<TValue = any, TContext = any, TMeta = any> {
    debugKey?: string;
    context?: TContext;
    meta?: TMeta;
    slippery?: boolean;
    sticky?: boolean;
    pull?: TCellPull<TValue, TContext, TMeta>;
    validate?: (next: TValue, value: TValue | undefined) => void;
    put?: TCellPut<TValue, TContext, TMeta>;
    compareValues?: (next: TValue, value: TValue | undefined) => boolean;
    reap?: (this: TContext) => void;
    value?: TValue;
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
export declare class Cell<TValue = any, TContext = any, TMeta = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    static EVENT_ERROR: string;
    static get currentlyPulling(): boolean;
    static autorun<TValue = any, TContext = any, TMeta = any>(cb: (value: TValue | undefined, disposer: () => void) => TValue, cellOptions?: ICellOptions<TValue, TContext, TMeta>): () => void;
    static release(): void;
    static afterRelease(cb: Function): void;
    static transact(cb: Function): void;
    debugKey: string | undefined;
    context: TContext;
    meta: TMeta | null;
    _slippery: boolean;
    _sticky: boolean;
    _pull: TCellPull<TValue, TContext, TMeta> | null;
    _validate: ((next: TValue, value: TValue | undefined) => void) | null;
    _put: TCellPut<TValue, TContext, TMeta> | null;
    _compareValues: (next: TValue, value: TValue | undefined) => boolean;
    _reap: (() => void) | null;
    _dependencies: Array<Cell> | null | undefined;
    _reactions: Array<Cell>;
    _value: TValue | undefined;
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
    constructor(value: TCellPull<TValue, TContext, TMeta>, options?: ICellOptions<TValue, TContext, TMeta>);
    constructor(value: TValue, options?: ICellOptions<TValue, TContext, TMeta>);
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
    get value(): TValue;
    set value(value: TValue);
    get(sticky?: boolean): TValue;
    pull(): boolean;
    set(value: TValue): this;
    push(value: TValue): boolean;
    fail(err: any): boolean;
    _setError(errorEvent: IEvent<this, {
        error: Error;
    }> | null): void;
    wait(): never;
    reap(): this;
    dispose(): this;
}
