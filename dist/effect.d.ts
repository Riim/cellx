import { Cell, ICellOptions, TCellPull } from './Cell';
export declare function effect<Value, Context = null, Meta = null>(source: Cell | Array<Cell> | TCellPull<Value, Context, Meta>, fn: (this: Context, value: Value, prevValue: Value, disposer: () => void) => any, cellOptions?: ICellOptions<Value, Context, Meta>): () => void;
