import { describe, expect, test } from '@jest/globals';
import {
	define,
	defineObservableProperties,
	defineObservableProperty,
	reaction,
	release
} from '../src/cellx';

describe('defineObservableProperty()', () => {
	test('создаёт observable свойство', () => {
		let obj = {} as { a: number };
		let aReaction = jest.fn();

		defineObservableProperty(obj, 'a', 1);
		reaction(() => obj.a, aReaction);

		expect(obj.a).toBe(1);

		obj.a = 2;
		release();

		expect(obj.a).toBe(2);
		expect(aReaction.mock.calls.length).toBe(1);
	});
});

describe('defineObservableProperties()', () => {
	test('создаёт несколько observable свойств', () => {
		let obj = {} as {
			a: number;
			b: number;
		};
		let aReaction = jest.fn();
		let bReaction = jest.fn();

		defineObservableProperties(obj, { a: 1, b: 2 });
		reaction(() => obj.a, aReaction);
		reaction(() => obj.b, bReaction);

		obj.a = 10;
		obj.b = 20;
		release();

		expect(obj.a).toBe(10);
		expect(obj.b).toBe(20);
		expect(aReaction.mock.calls.length).toBe(1);
		expect(bReaction.mock.calls.length).toBe(1);
	});
});

describe('define()', () => {
	test('define(obj, key, value)', () => {
		let obj = define({} as { foo: number }, 'foo', 1);
		let fooReaction = jest.fn();

		reaction(() => obj.foo, fooReaction);

		obj.foo = 2;
		release();

		expect(fooReaction.mock.calls.length).toBe(1);
	});

	test('define(obj, props)', () => {
		let obj = define({} as { foo: number }, { foo: 1 });
		let fooReaction = jest.fn();

		reaction(() => obj.foo, fooReaction);

		obj.foo = 2;
		release();

		expect(fooReaction.mock.calls.length).toBe(1);
	});
});
