import { Cell_runtimeState, Flags } from './Cell';
import { config } from './config';

let releaseDepth = 0;

export function release() {
	if (Cell_runtimeState.pulling > 0) {
		throw Error('Cannot call release() while computing');
	}

	releaseDepth++;

	try {
		while (Cell_runtimeState.pendingCellsIndex < Cell_runtimeState.pendingCellsCount) {
			let node = Cell_runtimeState.pendingCells[Cell_runtimeState.pendingCellsIndex]!;

			Cell_runtimeState.pendingCells[Cell_runtimeState.pendingCellsIndex++] = undefined;
			node._flags &= ~Flags.QUEUED;

			node._actualize();
		}
	} finally {
		if (Cell_runtimeState.pendingCellsIndex === Cell_runtimeState.pendingCellsCount) {
			Cell_runtimeState.pendingCellsIndex = Cell_runtimeState.pendingCellsCount = 0;
		}

		releaseDepth--;
	}

	if (releaseDepth === 0) {
		releaseDepth++;

		try {
			while (Cell_runtimeState.afterRelease && Cell_runtimeState.pendingCellsCount === 0) {
				let { afterRelease } = Cell_runtimeState;
				Cell_runtimeState.afterRelease = null;

				for (let i = 0, l = afterRelease.length; i < l; i++) {
					try {
						afterRelease[i]();
					} catch (error) {
						config.logError(error);
					}
				}
			}
		} finally {
			releaseDepth--;

			if (Cell_runtimeState.pendingCellsCount > 0 || Cell_runtimeState.afterRelease) {
				scheduleRelease();
			}
		}
	}
}

let releaseScheduled = false;

function scheduledRelease() {
	releaseScheduled = false;
	release();
}

export function scheduleRelease() {
	if (!releaseScheduled && releaseDepth === 0) {
		releaseScheduled = true;
		queueMicrotask(scheduledRelease);
	}
}
