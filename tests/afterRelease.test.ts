import { describe, expect, test } from '@jest/globals';
import { afterRelease, cellx, release } from '../src/cellx';

describe('afterRelease()', () => {
	test('works', () => {
		let a$ = cellx(1);
		let b$ = cellx(() => a$.value + 1, { onChange() {} });

		a$.value = 2;

		let afterReleaseCallback = jest.fn();

		afterRelease(afterReleaseCallback);

		release();

		expect(afterReleaseCallback.mock.calls.length).toBe(1);
		expect(b$.value).toBe(3);
	});
});
