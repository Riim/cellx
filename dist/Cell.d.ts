import { EventEmitter, IEvent, TListener } from './EventEmitter';
import { afterRelease } from './afterRelease';
import { autorun } from './autorun';
import { reaction } from './reaction';
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
export type TCellPut<Value = any, Context = any, Meta = any> = (this: Context, cell: Cell<Value, Context, Meta>, nextValue: Value, value: Value | undefined) => void;
export interface ICellOptions<Value = any, Context = any, Meta = any> {
    context?: Context;
    meta?: Meta;
    pull?: TCellPull<Value, Context, Meta>;
    dependencyFilter?: (dep: Cell) => any;
    validate?: (nextValue: Value, value: Value | undefined) => void;
    put?: TCellPut<Value, Context, Meta>;
    compareValues?: (nextValue: Value, value: Value | undefined) => boolean;
    reap?: (this: Context) => void;
    value?: Value;
    onChange?: TCellChangeEventListener<Cell<Value, any, Meta>>;
    onError?: TCellErrorEventListener<Cell<Value, any, Meta>>;
}
export interface ICellList {
    cell: Cell;
    state?: number;
    next: ICellList | null;
}
export declare enum CellState {
    ACTUAL = "actual",
    DIRTY = "dirty",
    CHECK = "check",
    PULLING = "pulling"
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
    static readonly reaction: typeof reaction;
    static readonly release: typeof release;
    static readonly afterRelease: typeof afterRelease;
    static readonly transact: typeof transact;
    readonly context: Context;
    readonly meta: Meta;
    protected _pull: TCellPull<Value, Context, Meta> | null;
    protected _dependencyFilter: (dependency: Cell) => any;
    protected _validateValue: ((nextValue: Value, value: Value | undefined) => void) | null;
    protected _put: TCellPut<Value, Context, Meta> | null;
    protected _compareValues: (nextValue: Value, value: Value | undefined) => boolean;
    protected _reap: (() => void) | null;
    protected _dependencies: ICellList | null | undefined;
    protected _dependents: ICellList | null;
    protected _value: Value | undefined;
    protected _error$: Cell<Error | null> | null;
    protected _error: Error | null;
    get error(): Error | null;
    protected _bound: boolean;
    protected _inited: boolean;
    get inited(): boolean;
    protected _active: boolean;
    get active(): boolean;
    protected _state: CellState;
    get state(): CellState;
    protected _updateId: number;
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
    protected _addDependent(dependent: Cell): void;
    protected _deleteDependent(dependent: Cell): void;
    protected _activate(): void;
    protected _deactivate(): void;
    protected _onValueChange(evt: IEvent): void;
    protected _addToRelease(dirty: boolean): void;
    actualize(): this;
    get value(): Value;
    set value(value: Value);
    get(): Value;
    pull(): boolean;
    set(value: Value): this;
    push(value: Value): boolean;
    _push(value: Value, fromPull?: boolean): boolean;
    fail(err: any): boolean;
    _fail(err: any, fromPull?: boolean): boolean;
    wait(): never;
    reap(): this;
    dispose(): this;
}
