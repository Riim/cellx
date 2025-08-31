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
export type TListener = (evt: IEvent) => any;
export interface I$Listener {
    listener: TListener;
    context: any;
}
export declare const EventEmitter_CommonState: {
    currentlySubscribing: boolean;
    transactionLevel: number;
    transactionEvents: Array<IEvent>;
    silently: boolean;
};
export declare class EventEmitter {
    static get currentlySubscribing(): boolean;
    static transact(fn: Function): void;
    static silently(fn: Function): void;
    [KEY_VALUE_CELLS]?: Map<string, Cell>;
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
