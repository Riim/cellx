import { Cell_runtimeState } from './Cell';
import { scheduleRelease } from './release';

export function afterRelease(cb: () => void): void {
	(Cell_runtimeState.afterRelease ??= []).push(cb);
	scheduleRelease();
}
