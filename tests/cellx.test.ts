import { Cell, cellx } from '../src/cellx';

describe('cellx', () => {
	test('#get()', () => {
		let a = cellx(1);

		expect(a()).toBe(1);
	});

	test('#set()', () => {
		let a = cellx(1);

		a(2);

		expect(a()).toBe(2);
	});

	test('#cell()', () => {
		let a = cellx(1);
		let aa = a('cell', 0);

		expect(aa).toBeInstanceOf(Cell);
	});

	test('#bind()', () => {
		let c;
		let getA = jest.fn(function() {
			c = this;
		});
		let a = cellx(getA);
		let context = {};

		a = a.call(context, 'bind', 0);
		a();

		expect(getA).toHaveBeenCalledTimes(1);
		expect(c).toBe(context);
	});

	test('позволяет использование в прототипе', () => {
		function A() {}
		A.prototype.prop1 = cellx([1, 2, 3]);
		A.prototype.prop2 = cellx(() => {
			return [1, 2, 3];
		});

		let a1 = new (A as any)();
		let a2 = new (A as any)();

		expect(a1.prop1()).toBe(a2.prop1());
		expect(a1.prop2()).not.toBe(a2.prop2());
		expect(a1.prop2()).toEqual(a2.prop2());
	});
});
