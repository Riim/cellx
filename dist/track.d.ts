import { Cell } from './Cell';
export declare const DependencyFilter: {
    allExceptUntracked: (dependency: Cell) => boolean;
    onlyTracked: (dependency: Cell) => boolean;
};
export declare function untracked<T>(fn: () => T): T;
export declare function tracked<T>(fn: () => T): T;
