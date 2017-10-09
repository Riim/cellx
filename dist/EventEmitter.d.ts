export interface IEvent<T extends EventEmitter = EventEmitter> {
    target: T;
    type: string;
    bubbles?: boolean;
    isPropagationStopped?: boolean;
    data: {
        [name: string]: any;
    };
}
export declare type TListener<T extends EventEmitter = EventEmitter> = (evt: IEvent<T>) => any;
export interface IRegisteredEvent {
    listener: TListener;
    context: any;
}
export declare class EventEmitter {
    static currentlySubscribing: boolean;
    static transact(cb: Function): void;
    _events: Map<string, IRegisteredEvent | Array<IRegisteredEvent>>;
    constructor();
    getEvents(): {
        [type: string]: Array<IRegisteredEvent>;
    };
    getEvents(type: string): Array<IRegisteredEvent>;
    on(type: string, listener: TListener, context?: any): this;
    on(listeners: {
        [type: string]: TListener;
    }, context?: any): this;
    off(type: string, listener: TListener, context?: any): this;
    off(listeners?: {
        [type: string]: TListener;
    }, context?: any): this;
    _on(type: string, listener: TListener, context: any): void;
    _off(type: string, listener: TListener, context: any): void;
    once(type: string, listener: TListener, context?: any): TListener;
    emit(evt: {
        target?: EventEmitter;
        type: string;
        bubbles?: boolean;
        isPropagationStopped?: boolean;
        data?: {
            [name: string]: any;
        };
    } | string, data?: {
        [name: string]: any;
    }): IEvent;
    handleEvent(evt: IEvent): void;
    _tryEventListener(emEvt: IRegisteredEvent, evt: IEvent): any;
}
