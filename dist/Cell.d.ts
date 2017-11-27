import { EventEmitter, IEvent, TListener } from './EventEmitter';
export declare type TCellPull<T> = (cell: Cell<T>, next: any) => any;
export interface ICellOptions<T> {
    debugKey?: string;
    context?: object;
    get?: (value: any) => T;
    validate?: (next: T, value: any) => void;
    merge?: (next: T, value: any) => any;
    put?: (cell: Cell<T>, next: any, value: any) => void;
    reap?: () => void;
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
export declare class Cell<T = any> extends EventEmitter {
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
    _reap: (() => void) | null;
    _value: any;
    _fixedValue: any;
    _error: Error | null;
    _pushingIndex: number;
    _errorIndex: number;
    _version: number;
    _masters: Array<Cell> | null | undefined;
    _slaves: Array<Cell>;
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
    constructor(value: T | TCellPull<T>, opts?: ICellOptions<T>);
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
    _registerSlave(slave: Cell): void;
    _unregisterSlave(slave: Cell): void;
    _activate(): void;
    _deactivate(): void;
    _onValueChange(evt: IEvent): void;
    _onValueChange$(evt: IEvent): void;
    get(): T;
    pull(): boolean;
    _tryPull(): any;
    getError(): Error | null;
    isPending(): boolean;
    set(value: T): this;
    push(value: any): this;
    _push(value: any, external: boolean, pulling: boolean): boolean;
    _addToRelease(): void;
    fail(err: any): this;
    _fail(err: any, external: boolean): void;
    wait(): void;
    _setError(err: Error | null): void;
    _handleErrorEvent(evt: IEvent<this>): void;
    _resolvePending(): void;
    reap(): this;
    dispose(): this;
}
