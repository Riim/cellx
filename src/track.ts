import { Cell, Cell_CommonState } from './Cell';

export const DependencyFilter = {
	allExceptUntracked: (dep: Cell) => Cell_CommonState.untrackedCounter == 0,
	onlyTracked: (dep: Cell) => Cell_CommonState.trackedCounter != 0
};

export function untracked<T>(fn: () => T): T {
	Cell_CommonState.untrackedCounter++;

	try {
		return fn();
	} finally {
		Cell_CommonState.untrackedCounter--;
	}
}

export function tracked<T>(fn: () => T): T {
	Cell_CommonState.trackedCounter++;

	try {
		return fn();
	} finally {
		Cell_CommonState.trackedCounter--;
	}
}
