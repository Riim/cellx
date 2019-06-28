import { EventEmitter, IEvent, TListener } from './EventEmitter';
export declare type TCellPull<T> = (cell: Cell<T>, next: any) => any;
export interface ICellOptions<T, M> {
    debugKey?: string;
    context?: object;
    pull?: TCellPull<T>;
    get?: (value: any) => T;
    validate?: (next: T, value: any) => void;
    merge?: (next: T, value: any) => any;
    put?: (cell: Cell<T>, next: any, value: any) => void;
    reap?: () => void;
    meta?: M;
    value?: T;
    onChange?: TListener;
    onError?: TListener;
}
export interface ICellChangeEvent<T extends EventEmitter = EventEmitter> extends IEvent<T> {
    type: 'change';
    data: {
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
    static autorun(cb: Function, context?: any): () => void;
    static release(): void;
    static afterRelease(cb: Function): void;
    debugKey: string | undefined;
    context: object;
    _pull: TCellPull<T> | null;
    _get: ((value: any) => T) | null;
    _validate: ((next: T, value: any) => void) | null;
    _merge: ((next: T, value: any) => any) | null;
    _put: (cell: Cell<T>, next: any, value: any) => void;
    _reap: (() => void) | null;
    meta: M | null;
    _dependencies: Array<Cell> | null | undefined;
    _reactions: Array<Cell>;
    _value: any;
    _error: Error | null;
    _lastErrorEvent: IEvent<this> | null;
    _state: 'actual' | 'dirty' | 'check';
    _inited: boolean;
    _hasSubscribers: boolean;
    _active: boolean;
    _currentlyPulling: boolean;
    _updationId: number;
    constructor(value: T | TCellPull<T>, options?: ICellOptions<T, M>);
    on(type: 'change' | 'error', listener: TListener, context?: any): this;
    on(listeners: Record<'change' | 'error', TListener>, context?: any): this;
    off(type: 'change' | 'error', listener: TListener, context?: any): this;
    off(listeners?: Record<'change' | 'error', TListener>, context?: any): this;
    _addReaction(reaction: Cell, actual: boolean): void;
    _deleteReaction(reaction: Cell): void;
    _activate(actual: boolean): void;
    _deactivate(): void;
    _onValueChange(evt: IEvent): void;
    _addToRelease(dirty: boolean): void;
    actualize(): void;
    get(): T;
    pull(): boolean;
    set(value: T): this;
    push(value: any): boolean;
    fail(err: any): boolean;
    _setError(err: Error | null): void;
    _handleErrorEvent(evt: IEvent<this>): void;
    wait(): void;
    reap(): this;
    dispose(): this;
}
