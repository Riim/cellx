import { Cell } from './Cell';
import { IEvent } from './EventEmitter';
export declare function effect<TValue, TContext>(cell: Cell<TValue, TContext>, fn: (evt: IEvent, disposer: () => void) => any, context?: TContext): () => void;
