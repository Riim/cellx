import { describe, expect, test } from '@jest/globals';
import { define, reaction, release } from '../src/cellx';

describe.only('define()', () => {
	test('works', () => {
		let obj = define({} as { foo: number }, { foo: 1 });
		let fooReaction = jest.fn();

		reaction(() => obj.foo, fooReaction);

		expect(fooReaction.mock.calls.length).toBe(0);

		obj.foo = 2;
		release();

		expect(fooReaction.mock.calls.length).toBe(1);
	});
});
