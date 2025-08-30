import { Cell } from './Cell';
import { KEY_VALUE_CELLS } from './keys';
export interface IEvent<D = any, T extends EventEmitter = EventEmitter> {
    target: T;
    type: string | symbol;
    bubbles?: boolean;
    defaultPrevented?: boolean;
    propagationStopped?: boolean;
    data: D;
}
export interface I$Listener {
    listener: Function;
    context: any;
}
export declare class EventEmitter {
    static get currentlySubscribing(): boolean;
    static transact(cb: Function): void;
    static silently(cb: Function): void;
    [KEY_VALUE_CELLS]?: Map<string, Cell>;
    _$listeners: Map<string | symbol, I$Listener[]>;
    get$Listeners(): ReadonlyMap<string | symbol, ReadonlyArray<I$Listener>>;
    get$Listeners(type: string | symbol): ReadonlyArray<I$Listener>;
    on(type: string | symbol, listener: Function, context?: any): this;
    on(listeners: Record<string | symbol, Function>, context?: any): this;
    off(type: string | symbol, listener: Function, context?: any): this;
    off(listeners?: Record<string | symbol, Function>, context?: any): this;
    _on(type: string | symbol, listener: Function, context: any): void;
    _off(type: string | symbol, listener: Function, context: any): void;
    once(type: string | symbol, listener: Function, context?: any): (this: any, evt: IEvent) => any;
    emit(evt: {
        target?: EventEmitter;
        type: string | symbol;
        bubbles?: boolean;
        defaultPrevented?: boolean;
        propagationStopped?: boolean;
        data?: any;
    } | string | symbol, data?: any): IEvent;
    handleEvent(evt: IEvent): void;
    _tryEventListener($listener: I$Listener, evt: IEvent): any;
}
