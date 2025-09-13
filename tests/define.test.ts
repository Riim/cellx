import { describe, expect, test } from '@jest/globals';
import { define, effect, release } from '../src/cellx';

describe.only('define()', () => {
	test('works', () => {
		let obj = define({} as { foo: number }, { foo: 1 });
		let fooEffect = jest.fn();

		effect(() => obj.foo, fooEffect);

		expect(fooEffect.mock.calls.length).toBe(0);

		obj.foo = 2;
		release();

		expect(fooEffect.mock.calls.length).toBe(1);
	});
});
