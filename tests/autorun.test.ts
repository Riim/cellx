import { describe, expect, test } from '@jest/globals';
import { autorun, cellx, release } from '../src/cellx';

describe.only('autorun()', () => {
	test('works', () => {
		let a$ = cellx(1);
		let a$AutorunFn = jest.fn(() => a$.value);
		let disposeA$Autorun = autorun(a$AutorunFn);

		expect(a$AutorunFn.mock.calls.length).toBe(1);

		a$.value = 2;

		release();

		expect(a$AutorunFn.mock.calls.length).toBe(2);
		expect(a$AutorunFn.mock.contexts[0]).toBe(null);

		disposeA$Autorun();
	});

	test('uses specified context', () => {
		let a$Context = {};
		let a$ = cellx(1);
		let a$AutorunFn = jest.fn(() => a$.value);
		let disposeA$Autorun = autorun(a$AutorunFn, { context: a$Context });

		a$.value = 2;

		release();

		expect(a$AutorunFn.mock.contexts[0]).toBe(a$Context);

		disposeA$Autorun();
	});
});
