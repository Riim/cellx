import { Cell, ICellOptions, TCellPull } from './Cell';
import { IEvent, TListener } from './EventEmitter';
export { KEY_VALUE_CELLS } from './keys';
export { configure } from './config';
export { IEvent, TListener, IRegisteredEvent, EventEmitter } from './EventEmitter';
export { TCellPull, ICellOptions, ICellChangeEvent, ICellErrorEvent, TCellEvent, Cell } from './Cell';
export { WaitError } from './WaitError';
export interface ICellx<T = any, M = any> {
    (value?: T): T;
    cell: Cell<T, M>;
    on(type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, listener: TListener, context?: any): Cell<T, M>;
    on(listeners: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>, context?: any): Cell<T, M>;
    off(type: typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, listener: TListener, context?: any): Cell<T, M>;
    off(listeners?: Record<typeof Cell.EVENT_CHANGE | typeof Cell.EVENT_ERROR, TListener>, context?: any): Cell<T, M>;
    onChange(listener: TListener, context?: any): Cell<T, M>;
    offChange(listener: TListener, context?: any): Cell<T, M>;
    onError(listener: TListener, context?: any): Cell<T, M>;
    offError(listener: TListener, context?: any): Cell<T, M>;
    subscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell<T, M>;
    unsubscribe(listener: (err: Error | null, evt: IEvent) => any, context?: any): Cell<T, M>;
    value: T;
    pull(): boolean;
    reap(): Cell<T, M>;
    dispose(): Cell<T, M>;
}
export declare function cellx<T = any, M = any>(value: T | TCellPull<T>, options?: ICellOptions<T, M>): ICellx<T>;
export declare function defineObservableProperty<T extends object = object>(obj: T, key: string | symbol, value: any): T;
export declare function defineObservableProperties<T extends object = object>(obj: T, props: Record<string | symbol, any>): T;
export declare function define<T extends object = object>(obj: T, key: string | symbol, value: any): T;
export declare function define<T extends object = object>(obj: T, props: Record<string | symbol, any>): T;
