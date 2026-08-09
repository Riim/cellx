import { describe, expect, test } from '@jest/globals';
import { cellx, reaction, release } from '../src/cellx';

describe('reaction()', () => {
	test('работает', () => {
		let a$ = cellx(1);
		let a$ReactionFn = jest.fn(() => a$.value);
		let disposeA$Reaction = reaction(a$, a$ReactionFn);

		expect(a$ReactionFn.mock.calls.length).toBe(0);

		a$.value = 2;
		release();

		expect(a$ReactionFn.mock.calls.length).toBe(1);
		expect(a$ReactionFn.mock.contexts[0]).toBe(null);

		disposeA$Reaction();
	});

	test('работает с массивом ячеек', () => {
		let a$ = cellx(1);
		let b$ = cellx(2);
		let a$B$ReactionFn = jest.fn();
		let disposeA$B$Reaction = reaction([a$, b$], a$B$ReactionFn);

		a$.value = 10;
		release();
		b$.value = 20;
		release();

		expect(a$B$ReactionFn.mock.calls.length).toBe(2);
		expect(a$B$ReactionFn.mock.calls[0][0]).toEqual([10, 2]);
		expect(a$B$ReactionFn.mock.calls[0][1]).toEqual([1, 2]);
		expect(a$B$ReactionFn.mock.calls[1][0]).toEqual([10, 20]);
		expect(a$B$ReactionFn.mock.calls[1][1]).toEqual([10, 2]);

		disposeA$B$Reaction();
	});

	test('работает с pull-функцией', () => {
		let a$ = cellx(1);
		let a$ReactionFn = jest.fn();
		let disposeA$Reaction = reaction(() => a$.value + 1, a$ReactionFn);

		a$.value = 5;
		release();

		expect(a$ReactionFn.mock.calls.length).toBe(1);
		expect(a$ReactionFn.mock.calls[0][0]).toBe(6);
		expect(a$ReactionFn.mock.calls[0][1]).toBe(2);

		disposeA$Reaction();
	});

	test('используется указанный контекст', () => {
		let a$ = cellx(1);
		let a$ReactionContext = {};
		let a$ReactionFn = jest.fn(() => a$.value);
		let disposeA$Reaction = reaction(a$, a$ReactionFn, { context: a$ReactionContext });

		a$.value = 2;
		release();

		expect(a$ReactionFn.mock.contexts[0]).toBe(a$ReactionContext);

		disposeA$Reaction();
	});
});
