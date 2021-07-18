import { Cell } from './Cell';
import { KEY_VALUE_CELLS } from './keys';
export interface IEvent<T extends EventEmitter = EventEmitter, D extends object = Record<string, any>> {
    target: T;
    type: string | symbol;
    bubbles?: boolean;
    defaultPrevented?: boolean;
    propagationStopped?: boolean;
    data: D;
}
export declare type TListener<T extends EventEmitter = EventEmitter> = (evt: IEvent<T>) => any;
export interface IRegisteredEvent {
    listener: TListener;
    context: any;
}
export declare class EventEmitter {
    static get currentlySubscribing(): boolean;
    static transact(cb: Function): void;
    static silently(cb: Function): void;
    [KEY_VALUE_CELLS]?: Map<string, Cell>;
    _events: Map<string | symbol, IRegisteredEvent | IRegisteredEvent[]>;
    getEvents(): Map<string | symbol, Array<IRegisteredEvent>>;
    getEvents(type: string | symbol): Array<IRegisteredEvent>;
    on(type: string | symbol, listener: TListener, context?: any): this;
    on(listeners: Record<string | symbol, TListener>, context?: any): this;
    off(type: string | symbol, listener: TListener, context?: any): this;
    off(listeners?: Record<string | symbol, TListener>, context?: any): this;
    _on(type: string | symbol, listener: TListener, context: any): void;
    _off(type: string | symbol, listener: TListener, context: any): void;
    once(type: string | symbol, listener: TListener, context?: any): TListener;
    emit(evt: {
        target?: EventEmitter;
        type: string | symbol;
        bubbles?: boolean;
        defaultPrevented?: boolean;
        propagationStopped?: boolean;
        data?: Record<string, any>;
    } | string | symbol, data?: Record<string, any>): IEvent<EventEmitter, Record<string, any>>;
    handleEvent(evt: IEvent): void;
    _tryEventListener(emEvt: IRegisteredEvent, evt: IEvent): any;
}
