import { type Cell } from './Cell';
export interface IEffectOptions<Context = any> {
    context?: Context;
    dependencyFilter?: (dependency: Cell) => any;
}
export declare function effect<Context = null>(fn: (this: Context, dispose: () => void) => void, options?: IEffectOptions<Context>): () => void;
