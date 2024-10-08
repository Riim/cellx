import { Cell, ICellOptions, TCellPull } from './Cell';
export { KEY_VALUE_CELLS } from './keys';
export { configure } from './config';
export { IEvent, I$Listener, EventEmitter } from './EventEmitter';
export { TCellPull, ICellOptions, ICellChangeEvent, ICellErrorEvent, TCellEvent, Cell } from './Cell';
export { WaitError } from './WaitError';
export declare const autorun: typeof Cell.autorun;
export declare function cellx<TValue = any, TContext = any, TMeta = any>(value: TCellPull<TValue, TContext, TMeta>, options?: ICellOptions<TValue, TContext, TMeta>): Cell<TValue, TContext, TMeta>;
export declare function cellx<TValue = any, TContext = any, TMeta = any>(value: TValue, options?: ICellOptions<TValue, TContext, TMeta>): Cell<TValue, TContext, TMeta>;
export declare function defineObservableProperty<T extends object = object>(obj: T, key: string, value: any): T;
export declare function defineObservableProperties<T extends object = object>(obj: T, props: Record<string, any>): T;
export declare function define<T extends object = object>(obj: T, key: string, value: any): T;
export declare function define<T extends object = object>(obj: T, props: Record<string, any>): T;
