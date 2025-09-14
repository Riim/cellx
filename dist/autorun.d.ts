import { ICellOptions } from './Cell';
export declare function autorun<Value, Context = null>(fn: (this: Context, value: Value | undefined, disposer: () => void) => Value, cellOptions?: ICellOptions<Value, Context>): () => void;
