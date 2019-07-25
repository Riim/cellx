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
    _addReaction(reaction: Cell, actual: boolean): void;
    _deleteReaction(reaction: Cell): void;
    _activate(actual: boolean): void;
    _deactivate(): void;
    _onValueChange(evt: IEvent): void;
    _addToRelease(dirty: boolean): void;
    actualize(): void;
    value: T;
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
