import { Cell, type IAsyncCellOptions, type ICellOptions, type TAsyncCellCompute, type TCellCompute } from './Cell';
export declare function reaction<Value, Context = any>(source: TAsyncCellCompute<Value, Context>, fn: (this: Context, value: Value, disposer: () => void) => any, cellOptions: IAsyncCellOptions<Value, Context>): () => void;
export declare function reaction<Value, Context = any>(source: Cell<Value> | TCellCompute<Value, Context>, fn: (this: Context, value: Value, disposer: () => void) => any, cellOptions?: ICellOptions<Value, Context>): () => void;
