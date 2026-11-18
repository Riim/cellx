import { type TEvent } from '@riim/event';
export type TCellValue<T> = T extends Cell<infer U, any> ? U : T;
export type TCellCompute<Value = any, Context = any> = (this: Context, value: NoInfer<Value> | undefined) => Value;
export type TAsyncCellCompute<Value = any, Context = any> = (this: Context, value: NoInfer<Value> | undefined) => Value | PromiseLike<Value>;
export type TCellPut<Value = any, Context = any> = (this: Context, nextValue: Value, value: Value | undefined) => void;
export interface ICellOptionsBase<Value = any, Context = any> {
    context?: Context;
    dependencyFilter?: (dependency: Cell) => any;
    assertValue?: (nextValue: NoInfer<Value>, value: NoInfer<Value> | undefined) => void;
    put?: TCellPut<NoInfer<Value>, Context>;
    onChange?: Parameters<Cell<NoInfer<Value>, Context>['onChange']>[0];
    onError?: Parameters<Cell<Value, Context>['onError']>[0];
    onObserved?: Parameters<Cell<Value, Context>['onObserved']>[0];
    onUnobserved?: Parameters<Cell<Value, Context>['onUnobserved']>[0];
}
export interface ICellOptions<Value = any, Context = any> extends ICellOptionsBase<Value, Context> {
    async?: false;
}
export interface IAsyncCellOptions<Value = any, Context = any> extends ICellOptionsBase<Value, Context> {
    async: true;
}
export type TAnyCellOptions<Value = any, Context = any> = ICellOptions<Value, Context> | IAsyncCellOptions<Value, Context>;
interface ICellRareState<Context> {
    errorCell: ErrorCell | null;
    onObserved: TEvent<void, Context> | null;
    onUnobserved: TEvent<void, Context> | null;
    pendingEvents: number;
}
export declare const enum Flags {
    PENDING = 1,
    DIRTY = 2,
    CHECKING = 4,
    PULLING = 8,
    ACTIVE = 16,
    QUEUED = 32,
    EFFECT = 64
}
export interface IReactiveNode {
    _dependencyFilter: ((dependency: Cell) => any) | null;
    _pullVersion: number;
    _nextDependency: ILink | null;
    _currentDependency: ILink | null;
    _nextDependent: ILink | null;
    _flags: number;
    _actualize(waiting?: ILink): boolean;
    disconnect(): IReactiveNode;
}
export interface ILink {
    readonly dependency: Cell;
    _prevDependency: ILink | null;
    _nextDependency: ILink | null;
    readonly dependent: IReactiveNode;
    _prevDependent: ILink | null;
    _nextDependent: ILink | null;
    dependencyVersion: number;
    dependentPullVersion: number;
    prevDependents: ILink | null;
}
export declare const Cell_runtimeState: {
    pendingCells: Array<IReactiveNode | undefined>;
    pendingCellsIndex: number;
    pendingCellsCount: number;
    pulling: number;
    currentCell: IReactiveNode | null;
    untrackedCell: IReactiveNode | null;
    globalVersion: number;
    afterRelease: Array<() => void> | null;
};
export declare function checkDependencies(node: IReactiveNode): boolean;
export declare function enqueueEffect(node: IReactiveNode): void;
export declare function trimDependencies(node: IReactiveNode): void;
export declare class Cell<Value = any, Context = any> implements IReactiveNode {
    static get pulling(): boolean;
    readonly context: Context;
    _dependencyFilter: ((dependency: Cell) => any) | null;
    protected _compute: TAsyncCellCompute<Value, Context> | null;
    protected _async: boolean;
    protected _assertValue: ICellOptionsBase<Value, Context>['assertValue'] | null;
    protected _put: TCellPut<Value, Context> | null;
    protected _value: Value | undefined;
    protected _pendingValue: Value;
    _error: Error | null;
    protected _globalVersion: number;
    _version: number;
    _pullVersion: number;
    _nextDependency: ILink | null;
    _currentDependency: ILink | null;
    _nextDependent: ILink | null;
    protected _lastDependent: ILink | null;
    _flags: number;
    protected _pullId: number;
    protected _appliedPullId: number;
    protected _rareState: ICellRareState<Context> | null;
    constructor(compute: TAsyncCellCompute<Value, Context>, options: IAsyncCellOptions<Value, Context>);
    constructor(valueOrCompute: Value | TCellCompute<Value, Context>, options?: ICellOptions<Value, Context>);
    protected _getRareState(): ICellRareState<Context>;
    onChange(handler: (this: Context, value: Value) => void): () => void;
    onError(handler: (this: Context, err: Error) => void): () => void;
    get onObserved(): TEvent<void, Context>;
    get onUnobserved(): TEvent<void, Context>;
    protected _scheduleObservation(observed: boolean): void;
    _addDependent(link: ILink): void;
    _deleteDependent(link: ILink): void;
    protected _activate(): void;
    protected _deactivate(): void;
    protected _invalidateDependents(waiting?: ILink, state?: Flags): void;
    actualize(): this;
    _actualize(waiting?: ILink): boolean;
    get value(): Value;
    set value(value: Value);
    get error(): Error | null;
    get(): Value;
    track(): void;
    protected _moveDependency(link: ILink, node: IReactiveNode, current: ILink | null, next: ILink | null): void;
    pull(): boolean;
    protected _pull(waiting?: ILink): boolean;
    protected _publish(value: Value | undefined, error: Error | null, waiting?: ILink): boolean;
    set(value: Value): this;
    disconnect(): this;
}
declare class ErrorCell extends Cell<Error | null> {
    _nextDependency: ILink;
    constructor(owner: Cell);
    _actualize(): boolean;
    _push(value: Error | null): void;
}
export {};
