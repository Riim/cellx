import { describe, expect, test } from '@jest/globals';
import { IDependencyList } from '../src/Cell';
import { DependencyFilter, cellx, release, tracked, untracked } from '../src/cellx';

function getDependencyListLength(list: IDependencyList | null) {
	if (!list) {
		return 0;
	}

	let length = 1;

	for (let $cell = list._nextDependency; $cell; $cell = $cell._nextDependency) {
		length++;
	}

	return length;
}

describe('track', () => {
	test('untracked()', () => {
		let a$ = cellx(1);
		let b$ = cellx(1);
		let pullC$ = jest.fn(() => a$.value + untracked(() => b$.value));
		let c$ = cellx(pullC$, { onChange: () => {} });

		// @ts-expect-error
		expect(getDependencyListLength(c$._nextDependency)).toBe(1);

		pullC$.mockClear();

		a$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);
		// @ts-expect-error
		expect(getDependencyListLength(c$._nextDependency)).toBe(1);
	});

	test('tracked()', () => {
		let a$ = cellx(1);
		let b$ = cellx(1);
		let pullC$ = jest.fn(() => tracked(() => a$.value) + b$.value);
		let c$ = cellx(pullC$, {
			dependencyFilter: DependencyFilter.onlyTracked,
			onChange: () => {}
		});

		// @ts-expect-error
		expect(getDependencyListLength(c$._nextDependency)).toBe(1);

		pullC$.mockClear();

		a$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);
		// @ts-expect-error
		expect(getDependencyListLength(c$._nextDependency)).toBe(1);
	});
});
