import { Cell, ICellOptions, TCellPull } from './Cell';
export declare function reaction<Value, Context = any, Meta = any>(source: Cell | Array<Cell> | TCellPull<Value, Context, Meta>, fn: (this: Context, value: Value, prevValue: Value, disposer: () => void) => any, cellOptions?: ICellOptions<Value, Context, Meta>): () => void;
