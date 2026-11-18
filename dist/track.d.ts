import { type Cell } from './Cell';
export declare const DependencyFilter: {
    onlyTracked: (dependency: Cell) => boolean;
};
export declare function untracked<T>(fn: () => T): T;
export declare function tracked<T>(fn: () => T): T;
