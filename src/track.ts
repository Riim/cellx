import { type Cell, Cell_runtimeState, type IReactiveNode } from './Cell';

let trackedCell: IReactiveNode | null = null;

export const DependencyFilter = {
	onlyTracked: (dependency: Cell) =>
		trackedCell !== null && trackedCell === Cell_runtimeState.currentCell
};

export function untracked<T>(fn: () => T): T {
	let prevUntrackedCell = Cell_runtimeState.untrackedCell;
	Cell_runtimeState.untrackedCell = Cell_runtimeState.currentCell;

	try {
		return fn();
	} finally {
		Cell_runtimeState.untrackedCell = prevUntrackedCell;
	}
}

export function tracked<T>(fn: () => T): T {
	let prevTrackedCell = trackedCell;
	trackedCell = Cell_runtimeState.currentCell;

	try {
		return fn();
	} finally {
		trackedCell = prevTrackedCell;
	}
}
