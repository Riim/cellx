import { Cell } from './Cell';
export declare const DependencyFilter: {
    allExceptUntracked: (dep: Cell) => boolean;
    onlyTracked: (dep: Cell) => boolean;
};
export declare function untracked<T>(fn: () => T): T;
export declare function tracked<T>(fn: () => T): T;
