import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { afterRelease } from './afterRelease';
import { autorun } from './autorun';
import { release } from './release';
import { transact } from './transact';
export type TCellPull<TValue = any, TContext = any, TMeta = any> = (this: TContext, cell: Cell<TValue, TContext, TMeta>, value: TValue | undefined) => TValue;
export type TCellPut<TValue = any, TContext = any, TMeta = any> = (this: TContext, cell: Cell<TValue, TContext, TMeta>, next: TValue, value: TValue | undefined) => void;
export interface ICellOptions<TValue = any, TContext = any, TMeta = any> {
    debugKey?: string;
    context?: TContext;
    meta?: TMeta;
    dependencyFilter?: (dep: Cell) => any;
    validate?: (next: TValue, value: TValue | undefined) => void;
    put?: TCellPut<TValue, TContext, TMeta>;
    compareValues?: (next: TValue, value: TValue | undefined) => boolean;
    reap?: (this: TContext) => void;
    onChange?: TListener;
    onError?: TListener;
}
export declare enum CellState {
    ACTUAL = "actual",
    DIRTY = "dirty",
    CHECK = "check"
}
export interface ICellChangeEvent<T extends Cell = Cell> extends IEvent<any, T> {
    type: typeof Cell.EVENT_CHANGE;
    data: {
        prevValue: any;
        value: any;
    };
}
export interface ICellErrorEvent<T extends Cell = Cell> extends IEvent<any, T> {
    type: typeof Cell.EVENT_ERROR;
    data: {
        error: any;
    };
}
export type TCellEvent<T extends Cell = Cell> = ICellChangeEvent<T> | ICellErrorEvent<T>;
export declare const Cell_CommonState: {
    pendingCells: Array<Cell>;
    pendingCellsIndex: number;
    afterRelease: Array<Function> | null;
    currentCell: Cell | null;
    untrackedCounter: number;
    trackedCounter: number;
    lastUpdateId: number;
    transaction: {
        primaryCells: Map<Cell, any>;
        secondaryCells: Set<Cell>;
    } | null;
};
export declare class Cell<TValue = any, TContext = any, TMeta = any> extends EventEmitter {
    static EVENT_CHANGE: string;
    static EVENT_ERROR: string;
    static get currentlyPulling(): boolean;
    static autorun: typeof autorun;
    static release: typeof release;
    static afterRelease: typeof afterRelease;
    static transact: typeof transact;
    debugKey: string | undefined;
    context: TContext;
    meta: TMeta | null;
    protected _pull: TCellPull<TValue, TContext, TMeta> | null;
    protected _dependencyFilter: (dep: Cell) => any;
    protected _validate: ((next: TValue, value: TValue | undefined) => void) | null;
    protected _put: TCellPut<TValue, TContext, TMeta> | null;
    protected _compareValues: (next: TValue, value: TValue | undefined) => boolean;
    protected _reap: (() => void) | null;
    protected _dependencies: Array<Cell> | null | undefined;
    protected _reactions: Array<Cell>;
    protected _value: TValue | undefined;
    protected _errorCell: Cell<Error | null> | null;
    protected _error: Error | null;
    protected _lastErrorEvent: IEvent | null;
    get error(): Error | null;
    protected _state: CellState;
    get state(): CellState;
    protected _inited: boolean;
    get inited(): boolean;
    protected _active: boolean;
    get active(): boolean;
    protected _currentlyPulling: boolean;
    get currentlyPulling(): boolean;
    protected _updateId: number;
    protected _bound: boolean;
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
    protected _addReaction(reaction: Cell): void;
    protected _deleteReaction(reaction: Cell): void;
    protected _activate(): void;
    protected _deactivate(): void;
    protected _onValueChange(evt: IEvent): void;
    protected _addToRelease(dirty: boolean): void;
    actualize(): void;
    get value(): TValue;
    set value(value: TValue);
    get(): TValue;
    pull(): boolean;
    set(value: TValue): this;
    push(value: TValue, _afterPull?: boolean): boolean;
    fail(err: any, _afterPull?: boolean): boolean;
    protected _setError(errorEvent: IEvent<{
        error: Error;
    }> | null, afterPull: boolean): void;
    wait(): never;
    reap(): this;
    dispose(): this;
}
