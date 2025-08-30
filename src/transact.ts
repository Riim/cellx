import { Cell_CommonState, CellState } from './Cell';
import { release } from './release';

export function transact(cb: Function) {
	if (Cell_CommonState.transaction) {
		cb();

		return;
	}

	if (Cell_CommonState.pendingCells.length != 0) {
		release();
	}

	Cell_CommonState.transaction = {
		primaryCells: new Map(),
		secondaryCells: new Set()
	};

	try {
		cb();
	} catch (err) {
		for (let [cell, value] of Cell_CommonState.transaction.primaryCells) {
			// @ts-expect-error
			cell._value = value;
		}
		for (let cell of Cell_CommonState.transaction.secondaryCells) {
			// @ts-expect-error
			cell._state = CellState.ACTUAL;
		}

		Cell_CommonState.pendingCells.length = 0;
		Cell_CommonState.pendingCellsIndex = 0;

		Cell_CommonState.transaction = null;

		throw err;
	}

	Cell_CommonState.transaction = null;

	if (Cell_CommonState.pendingCells.length != 0) {
		release();
	}
}
