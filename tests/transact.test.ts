import { describe, expect, test } from '@jest/globals';
import { cellx, transact } from '../src/cellx';

describe('transact()', () => {
	test('works', () => {
		let a$ = cellx(1);

		try {
			transact(() => {
				a$.value = 2;
				a$.value = 3;

				throw 1;
			});
		} catch {}

		expect(a$.value).toBe(1);
	});
});
