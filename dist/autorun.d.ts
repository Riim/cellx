import { ICellOptions } from './Cell';
export declare function autorun<T = any, M = any>(cb: (next: T | undefined, disposer: () => void) => T, cellOptions?: ICellOptions<T, M>): () => void;
