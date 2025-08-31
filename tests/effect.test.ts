import { describe, expect, test } from '@jest/globals';
import { cellx, effect, release } from '../src/cellx';

describe.only('effect()', () => {
	test('works', () => {
		let a$ = cellx(1);
		let a$EffectFn = jest.fn(() => a$.value);
		let disposeA$Effect = effect(a$, a$EffectFn);

		expect(a$EffectFn.mock.calls.length).toBe(0);

		a$.value = 2;

		release();

		expect(a$EffectFn.mock.calls.length).toBe(1);
		expect(a$EffectFn.mock.contexts[0]).toBe(null);

		disposeA$Effect();
	});

	test('uses context from cell', () => {
		let a$Context = {};
		let a$ = cellx(1, { context: a$Context });
		let a$EffectFn = jest.fn(() => a$.value);
		let disposeA$Effect = effect(a$, a$EffectFn);

		a$.value = 2;

		release();

		expect(a$EffectFn.mock.contexts[0]).toBe(a$Context);

		disposeA$Effect();
	});

	test('uses specified context', () => {
		let a$ = cellx(1);
		let a$EffectContext = {};
		let a$EffectFn = jest.fn(() => a$.value);
		let disposeA$Effect = effect(a$, a$EffectFn, a$EffectContext);

		a$.value = 2;

		release();

		expect(a$EffectFn.mock.contexts[0]).toBe(a$EffectContext);

		disposeA$Effect();
	});
});
