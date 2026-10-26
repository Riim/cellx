import { describe, expect, test } from '@jest/globals';
import { type ILink } from '../src/Cell';
import { cellx, release } from '../src/cellx';
import { DependencyFilter, tracked, untracked } from '../src/track';

function getDependencyListLength(list: ILink | null) {
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

		expect(getDependencyListLength(c$._nextDependency)).toBe(1);

		pullC$.mockClear();

		a$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);
		expect(getDependencyListLength(c$._nextDependency)).toBe(1);
		c$.disconnect();
	});

	test('tracked()', () => {
		let a$ = cellx(1);
		let b$ = cellx(1);
		let pullC$ = jest.fn(() => tracked(() => a$.value) + b$.value);
		let c$ = cellx(pullC$, {
			dependencyFilter: DependencyFilter.onlyTracked,
			onChange: () => {}
		});

		expect(getDependencyListLength(c$._nextDependency)).toBe(1);

		pullC$.mockClear();

		a$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(pullC$.mock.calls.length).toBe(1);
		expect(getDependencyListLength(c$._nextDependency)).toBe(1);
		c$.disconnect();
	});
});
