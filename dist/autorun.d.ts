import { type ICellOptions } from './Cell';
export declare function autorun<TValue = any, TContext = any, TMeta = any>(fn: (this: TContext, value: TValue | undefined, disposer: () => void) => TValue, cellOptions?: ICellOptions<TValue, TContext, TMeta>): () => void;
