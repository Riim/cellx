import { Cell, Cell_CommonState } from './Cell';
import { release } from './release';

export function transaction<T>(fn: () => T, onFailure?: (err: any) => T | void) {
	if (Cell_CommonState.transactionStates) {
		return fn();
	}

	if (Cell_CommonState.pendingCells.length != 0) {
		release();
	}

	Cell_CommonState.transactionStates = new Map();

	let result: T;

	try {
		result = fn();
	} catch (err) {
		for (let [cell, { value, error, state, updateId }] of Cell_CommonState.transactionStates) {
			// @ts-expect-error
			cell._value = value;
			// @ts-expect-error
			cell._error$?.set(error);
			// @ts-expect-error
			cell._error = error;
			// @ts-expect-error
			cell._state = state;
			// @ts-expect-error
			cell._updateId = updateId;
		}

		Cell_CommonState.pendingCells.length = 0;
		Cell_CommonState.transactionStates = null;

		if (onFailure) {
			return onFailure(err);
		}

		throw err;
	}

	for (let [cell, { value }] of Cell_CommonState.transactionStates) {
		// @ts-expect-error
		if (!cell._compareValues(cell._value, value)) {
			cell.emit(Cell.EVENT_CHANGE, {
				// @ts-expect-error
				value: cell._value,
				prevValue: value
			});
		}
	}

	Cell_CommonState.transactionStates = null;

	if (Cell_CommonState.pendingCells.length != 0) {
		release();
	}

	return result;
}
