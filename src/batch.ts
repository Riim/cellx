import { release } from './release';

let batchDepth = 0;

export function batch<T>(fn: () => T) {
	batchDepth++;

	try {
		return fn();
	} finally {
		if (--batchDepth === 0) {
			release();
		}
	}
}
