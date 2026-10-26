import { describe, expect, test } from '@jest/globals';
import { cellx, effect, release } from '../src/cellx';

describe('effect()', () => {
	test('works', () => {
		let a$ = cellx(1);
		let a$EffectFn = jest.fn(() => a$.value);
		let disposeA$Effect = effect(a$EffectFn);

		expect(a$EffectFn.mock.calls.length).toBe(1);

		a$.value = 2;
		release();

		expect(a$EffectFn.mock.calls.length).toBe(2);
		expect(a$EffectFn.mock.contexts[0]).toBe(null);

		disposeA$Effect();
		disposeA$Effect();

		a$.value = 3;
		release();

		expect(a$EffectFn).toHaveBeenCalledTimes(2);
		expect(a$._nextDependent).toBeNull();
	});

	test('uses specified context', () => {
		let a$Context = {};
		let a$ = cellx(1);
		let a$EffectFn = jest.fn(() => a$.value);
		let disposeA$Effect = effect(a$EffectFn, { context: a$Context });

		a$.value = 2;
		release();

		expect(a$EffectFn.mock.contexts[0]).toBe(a$Context);

		disposeA$Effect();
	});
});
