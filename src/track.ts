import { Cell, Cell_CommonState } from './Cell';

export const DependencyFilter = {
	allExceptUntracked: (dependency: Cell) => Cell_CommonState.inUntrackedCounter == 0,
	onlyTracked: (dependency: Cell) => Cell_CommonState.inTrackedCounter != 0
};

export function untracked<T>(fn: () => T): T {
	Cell_CommonState.inUntrackedCounter++;

	try {
		return fn();
	} finally {
		Cell_CommonState.inUntrackedCounter--;
	}
}

export function tracked<T>(fn: () => T): T {
	Cell_CommonState.inTrackedCounter++;

	try {
		return fn();
	} finally {
		Cell_CommonState.inTrackedCounter--;
	}
}
