import { describe, expect, test } from '@jest/globals';
import { ICellList } from '../src/Cell';
import { DependencyFilter, cellx, release, tracked, untracked } from '../src/cellx';

function getCellListLength(list: ICellList | null) {
	if (!list) {
		return 0;
	}

	let length = 1;

	for (let $cell = list.next; $cell; $cell = $cell.next) {
		length++;
	}

	return length;
}

describe('track', () => {
	test('untracked()', () => {
		let a$ = cellx(1);
		let b$ = cellx(1);
		let calcC$ = jest.fn(() => a$.value + untracked(() => b$.value));
		let c$ = cellx(calcC$, { onChange: () => {} });

		// @ts-expect-error
		expect(getCellListLength(c$._dependencies)).toBe(1);

		calcC$.mockClear();

		a$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);
		// @ts-expect-error
		expect(getCellListLength(c$._dependencies)).toBe(1);
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
		expect(getCellListLength(c$._dependencies)).toBe(1);

		calcC$.mockClear();

		a$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);

		b$.value = 2;
		release();

		expect(calcC$.mock.calls.length).toBe(1);
		// @ts-expect-error
		expect(getCellListLength(c$._dependencies)).toBe(1);
	});
});
