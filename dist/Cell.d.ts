import { EventEmitter, IEvent, TListener } from './EventEmitter';
export declare type TCellPull<T> = (cell: Cell<T>, next: any) => any;
export interface ICellOptions<T, M> {
    debugKey?: string;
    context?: object;
    get?: (value: any) => T;
    validate?: (next: T, value: any) => void;
    merge?: (next: T, value: any) => any;
    put?: (cell: Cell<T>, next: any, value: any) => void;
    reap?: () => void;
    meta?: M;
    onChange?: TListener;
    onError?: TListener;
}
export interface ICellChangeEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
    type: 'change';
    data: {
        prevEvent: ICellChangeEvent | null;
        prevValue: any;
        value: any;
    };
}
export interface ICellErrorEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
    type: 'error';
    data: {
        error: any;
    };
}
export declare type TCellEvent<T extends EventEmitter = EventEmitter> = ICellChangeEvent<T> | ICellErrorEvent<T>;
export declare class Cell<T = any, M = any> extends EventEmitter {
    static readonly currentlyPulling: boolean;
    static autorun(callback: Function, context?: any): () => void;
    static forceRelease(): void;
    static afterRelease(callback: Function): void;
    debugKey: string | undefined;
    context: object;
    _pull: TCellPull<T> | null;
    _get: ((value: any) => T) | null;
    _validate: ((next: T, value: any) => void) | null;
    _merge: ((next: T, value: any) => any) | null;
    _put: (cell: Cell<T>, next: any, value: any) => void;
    _onFulfilled: ((value: any) => void) | null;
    _onRejected: ((err: Error) => void) | null;
    _reap: (() => void) | null;
    meta: M | null;
    _value: any;
    _fixedValue: any;
    _error: Error | null;
    _pushingIndex: number;
    _errorIndex: number;
    _version: number;
    _dependencies: Array<Cell> | null | undefined;
    _reactions: Array<Cell>;
    _level: number;
    _levelInRelease: number;
    _selfPendingStatusCell: Cell<boolean> | null;
    _pendingStatusCell: Cell<boolean> | null;
    _selfErrorCell: Cell<Error | null> | null;
    _errorCell: Cell<Error | null> | null;
    _state: number;
    _prevChangeEvent: IEvent | null;
    _changeEvent: IEvent | null;
    _lastErrorEvent: IEvent<this> | null;
    constructor(value: T | TCellPull<T>, options?: ICellOptions<T, M>);
    on(type: string, listener: TListener, context?: any): this;
    on(listeners: {
        [type: string]: TListener;
    }, context?: any): this;
    off(type: string, listener: TListener, context?: any): this;
    off(listeners?: {
        [type: string]: TListener;
    }, context?: any): this;
    addChangeListener(listener: TListener, context?: any): this;
    removeChangeListener(listener: TListener, context?: any): this;
    addErrorListener(listener: TListener, context?: any): this;
    removeErrorListener(listener: TListener, context?: any): this;
    subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this;
    unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): this;
    _addReaction(reaction: Cell): void;
    _deleteReaction(reaction: Cell): void;
    _activate(): void;
    _deactivate(): void;
    _onValueChange(evt: IEvent): void;
    get(): T;
    pull(): boolean;
    _pull$(): any;
    getError(): Error | null;
    isPending(): boolean;
    set(value: T): this;
    push(value: any): this;
    _push(value: any, public$: boolean, pulling: boolean): boolean;
    _fulfill(value: any): void;
    fail(err: any): this;
    _fail(err: any, public$: boolean, pulling: boolean): void;
    _setError(err: Error | null, reject: boolean): void;
    _handleErrorEvent(evt: IEvent<this>, err: Error | null): void;
    _reject(err: Error): void;
    wait(): void;
    _addToRelease(): void;
    _resolvePending(): void;
    then<U = any>(onFulfilled: ((value: T) => U) | null, onRejected?: (err: Error) => U): Promise<U>;
    catch<U = any>(onRejected: (err: Error) => U): Promise<U>;
    reap(): this;
    dispose(): this;
}
