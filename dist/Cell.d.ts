import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { afterRelease } from './afterRelease';
import { autorun } from './autorun';
import { effect } from './effect';
import { release } from './release';
import { transact } from './transact';
export type CellValue<T> = T extends Cell<infer U> ? U : T;
export interface ICellChangeEvent<Target extends Cell = Cell> extends IEvent<{
    value: CellValue<Target>;
    prevValue: CellValue<Target>;
}, Target> {
    type: typeof Cell.EVENT_CHANGE;
}
export interface ICellErrorEvent<Target extends Cell = Cell> extends IEvent<{
    error: Error;
}, Target> {
    type: typeof Cell.EVENT_ERROR;
}
export type TCellEvent<Target extends Cell = Cell> = ICellChangeEvent<Target> | ICellErrorEvent<Target>;
export type TCellChangeEventListener<Target extends Cell = Cell, Context = any> = TListener<ICellChangeEvent<Target>, Context>;
export type TCellErrorEventListener<Target extends Cell = Cell, Context = any> = TListener<ICellErrorEvent<Target>, Context>;
export type TCellEventListener<Target extends Cell = Cell, Context = any> = TCellChangeEventListener<Target, Context> | TCellErrorEventListener<Target, Context>;
export interface ICellListeners<Target extends Cell = Cell, Context = any> {
    [Cell.EVENT_CHANGE]?: TCellChangeEventListener<Target, Context>;
    [Cell.EVENT_ERROR]?: TCellErrorEventListener<Target, Context>;
}
export type TCellPull<Value = any, Context = any, Meta = any> = (this: Context, cell: Cell<Value, Context, Meta>, value: Value | undefined) => Value;
export type TCellPut<Value = any, Context = any, Meta = any> = (this: Context, cell: Cell<Value, Context, Meta>, next: Value, value: Value | undefined) => void;
export interface ICellOptions<Value = any, Context = any, Meta = any> {
    context?: Context;
    meta?: Meta;
    pullFn?: TCellPull<Value, Context, Meta>;
    dependencyFilter?: (dep: Cell) => any;
    validate?: (next: Value, value: Value | undefined) => void;
    put?: TCellPut<Value, Context, Meta>;
    compareValues?: (next: Value, value: Value | undefined) => boolean;
    reap?: (this: Context) => void;
    value?: Value;
    onChange?: TCellChangeEventListener<Cell<Value, any, Meta>>;
    onError?: TCellErrorEventListener<Cell<Value, any, Meta>>;
}
export declare enum CellState {
    ACTUAL = "actual",
    DIRTY = "dirty",
    CHECK = "check"
}
export declare const Cell_CommonState: {
    pendingCells: Array<Cell>;
    pendingCellsIndex: number;
    afterRelease: Array<Function> | null;
    currentCell: Cell | null;
    inUntrackedCounter: number;
    inTrackedCounter: number;
    lastUpdateId: number;
    transaction: {
        primaryCells: Map<Cell, any>;
        secondaryCells: Set<Cell>;
    } | null;
};
export declare class Cell<Value = any, Context = any, Meta = any> extends EventEmitter {
    static readonly EVENT_CHANGE = "change";
    static readonly EVENT_ERROR = "error";
    static get currentlyPulling(): boolean;
    static readonly autorun: typeof autorun;
    static readonly effect: typeof effect;
    static readonly release: typeof release;
    static readonly afterRelease: typeof afterRelease;
    static readonly transact: typeof transact;
    readonly context: Context;
    readonly meta: Meta;
    protected _pullFn: TCellPull<Value, Context, Meta> | null;
    protected _dependencyFilter: (dep: Cell) => any;
    protected _validateValue: ((next: Value, value: Value | undefined) => void) | null;
    protected _putFn: TCellPut<Value, Context, Meta> | null;
    protected _compareValues: (next: Value, value: Value | undefined) => boolean;
    protected _reap: (() => void) | null;
    protected _dependencies: Array<Cell> | null | undefined;
    protected _reactions: Array<Cell>;
    protected _value: Value | undefined;
    protected _error$: Cell<Error | null> | null;
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
    constructor(options: ICellOptions<Value, Context, Meta>);
    on<C>(type: typeof Cell.EVENT_CHANGE, listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    on<C>(type: typeof Cell.EVENT_ERROR, listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    on<C>(listeners: ICellListeners<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    off<C>(type: typeof Cell.EVENT_CHANGE, listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    off<C>(type: typeof Cell.EVENT_ERROR, listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    off<C>(listeners?: ICellListeners<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    onChange<C>(listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    offChange<C>(listener: TCellChangeEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    onError<C>(listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    offError<C>(listener: TCellErrorEventListener<Cell<Value, C extends undefined ? Context : C, Meta>>, context?: C): this;
    subscribe<C>(listener: (this: C extends undefined ? (typeof this)['context'] : C, err: Error | null, evt: TCellEvent<this>) => any, context?: C): this;
    unsubscribe<C>(listener: (this: C extends undefined ? (typeof this)['context'] : C, err: Error | null, evt: TCellEvent<this>) => any, context?: C): this;
    protected _addReaction(reaction: Cell): void;
    protected _deleteReaction(reaction: Cell): void;
    protected _activate(): void;
    protected _deactivate(): void;
    protected _onValueChange(evt: IEvent): void;
    protected _addToRelease(dirty: boolean): void;
    actualize(): void;
    get value(): Value;
    set value(value: Value);
    get(): Value;
    pull(): boolean;
    set(value: Value): this;
    push(value: Value, _afterPull?: boolean): boolean;
    fail(err: any, _afterPull?: boolean): boolean;
    protected _setError(errorEvent: IEvent<{
        error: Error;
    }> | null, afterPull: boolean): void;
    wait(): never;
    reap(): this;
    dispose(): this;
}
