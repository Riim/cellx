import { describe, expect, test } from '@jest/globals';
import { DependencyFilter, cellx, release, tracked, untracked } from '../src/cellx';

describe('track', () => {
	test('untracked()', () => {
		let a$ = cellx(1);
		let b$ = cellx(1);
		let calcC$ = jest.fn(() => a$.value + untracked(() => b$.value));
		let c$ = cellx(calcC$, { onChange: () => {} });

		// @ts-expect-error
		expect(c$._dependencies.length).toBe(1);

		calcC$.mockClear();

		a$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);
		// @ts-expect-error
		expect(c$._dependencies.length).toBe(1);
	});

	test('tracked()', () => {
		let a$ = cellx(1);
		let b$ = cellx(1);
		let calcC$ = jest.fn(() => tracked(() => a$.value) + b$.value);
		let c$ = cellx(calcC$, {
			dependencyFilter: DependencyFilter.onlyTracked,
			onChange: () => {}
		});

		// @ts-expect-error
		expect(c$._dependencies.length).toBe(1);

		calcC$.mockClear();

		a$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);
		// @ts-expect-error
		expect(c$._dependencies.length).toBe(1);
	});
});
