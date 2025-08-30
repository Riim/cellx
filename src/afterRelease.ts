import { Cell_CommonState } from './Cell';

export function afterRelease(cb: Function) {
	(Cell_CommonState.afterRelease ?? (Cell_CommonState.afterRelease = [])).push(cb);
}
