import { describe, expect, test } from '@jest/globals';
import { batch, cellx, effect } from '../src/cellx';

describe('batch()', () => {
	test('батчит', () => {
		let a$ = cellx(0);
		let b$ = cellx(0);
		let effectFn = jest.fn(() => a$.value + b$.value);
		let dispose = effect(effectFn);

		expect(effectFn).toHaveBeenCalledTimes(1);

		batch(() => {
			a$.value = 5;
			b$.value = 5;
		});

		expect(effectFn).toHaveBeenCalledTimes(2);
		expect(effectFn).toHaveLastReturnedWith(10);

		dispose();
	});
});
