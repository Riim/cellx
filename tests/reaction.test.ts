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
		disposeA$Reaction();

		a$.value = 3;
		release();

		expect(a$ReactionFn).toHaveBeenCalledTimes(1);
		expect(a$._nextDependent).toBeNull();
	});

	test('работает с compute', () => {
		let a$ = cellx(1);
		let a$ReactionFn = jest.fn();
		let disposeA$Reaction = reaction(() => a$.value + 1, a$ReactionFn);

		a$.value = 5;
		release();

		expect(a$ReactionFn.mock.calls.length).toBe(1);
		expect(a$ReactionFn.mock.calls[0][0]).toBe(6);
		expect(a$ReactionFn.mock.calls[0][1]).toBe(disposeA$Reaction);

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
