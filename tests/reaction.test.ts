import { describe, expect, test } from '@jest/globals';
import { cellx, reaction, release } from '../src/cellx';

describe.only('reaction()', () => {
	test('works', () => {
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

	test('uses specified context', () => {
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
