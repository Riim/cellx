export interface IEvent<Data = any, Target extends EventEmitter = EventEmitter> {
    target: Target;
    type: string | symbol;
    bubbles?: boolean;
    defaultPrevented?: boolean;
    propagationStopped?: boolean;
    data: Data;
}
export type TListener<Event extends IEvent = IEvent, Context = any> = (this: Context, evt: Event) => any;
export interface I$Listener {
    listener: TListener;
    context: any;
}
export declare const EventEmitter_CommonState: {
    inTransactCounter: number;
    transactionEvents: Array<IEvent>;
    inSilentlyCounter: number;
};
export declare class EventEmitter {
    static transact(fn: Function): void;
    static silently(fn: Function): void;
    protected _$listeners: Map<string | symbol, I$Listener[]>;
    get$Listeners(): ReadonlyMap<string | symbol, ReadonlyArray<I$Listener>>;
    get$Listeners(type: string | symbol): ReadonlyArray<I$Listener>;
    on(type: string | symbol, listener: TListener, context?: any): this;
    on(listeners: Record<string | symbol, TListener>, context?: any): this;
    off(type: string | symbol, listener: TListener, context?: any): this;
    off(listeners?: Record<string | symbol, TListener>, context?: any): this;
    protected _on(type: string | symbol, listener: TListener, context: any): void;
    protected _off(type: string | symbol, listener: TListener, context: any): void;
    once(type: string | symbol, listener: TListener, context?: any): (this: any, evt: IEvent) => any;
    emit(evt: {
        target?: EventEmitter;
        type: string | symbol;
        bubbles?: boolean;
        defaultPrevented?: boolean;
        propagationStopped?: boolean;
        data?: any;
    } | string | symbol, data?: any): IEvent;
    handleEvent(evt: IEvent): void;
    protected _tryEventListener($listener: I$Listener, evt: IEvent): any;
}
