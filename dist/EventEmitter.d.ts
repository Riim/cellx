export interface IEvent<T extends EventEmitter = EventEmitter> {
    target: T;
    type: string;
    bubbles?: boolean;
    defaultPrevented?: boolean;
    propagationStopped?: boolean;
    data: Record<string, any>;
}
export declare type TListener<T extends EventEmitter = EventEmitter> = (evt: IEvent<T>) => any;
export interface IRegisteredEvent {
    listener: TListener;
    context: any;
}
export declare class EventEmitter {
    static currentlySubscribing: boolean;
    static transact(callback: Function): void;
    _events: Map<string, IRegisteredEvent | Array<IRegisteredEvent>>;
    constructor();
    getEvents(): Record<string, Array<IRegisteredEvent>>;
    getEvents(type: string): Array<IRegisteredEvent>;
    on(type: string, listener: TListener, context?: any): this;
    on(listeners: Record<string, TListener>, context?: any): this;
    off(type: string, listener: TListener, context?: any): this;
    off(listeners?: Record<string, TListener>, context?: any): this;
    _on(type: string, listener: TListener, context: any): void;
    _off(type: string, listener: TListener, context: any): void;
    once(type: string, listener: TListener, context?: any): TListener;
    emit(evt: {
        target?: EventEmitter;
        type: string;
        bubbles?: boolean;
        defaultPrevented?: boolean;
        propagationStopped?: boolean;
        data?: Record<string, any>;
    } | string, data?: Record<string, any>): IEvent;
    handleEvent(evt: IEvent): void;
    _tryEventListener(emEvt: IRegisteredEvent, evt: IEvent): any;
}
