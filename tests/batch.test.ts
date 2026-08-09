import { describe, expect, test } from '@jest/globals';
import { autorun, batch, cellx } from '../src/cellx';

describe('batch()', () => {
	test('батчит', () => {
		let a$ = cellx(0);
		let b$ = cellx(0);
		let autorunFn = jest.fn(() => a$.value + b$.value);
		let dispose = autorun(autorunFn);

		expect(autorunFn).toHaveBeenCalledTimes(1);

		batch(() => {
			a$.value = 5;
			b$.value = 5;
		});

		expect(autorunFn).toHaveBeenCalledTimes(2);
		expect(autorunFn).toHaveLastReturnedWith(10);

		dispose();
	});
});
