import { release } from './release';

export function batch<T>(fn: () => T) {
	let result = fn();

	release();

	return result;
}
