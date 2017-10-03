let { ObservableMap } = require('../dist/cellx.umd');

describe('ObservableMap', () => {

	test('#has()', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.has('foo'))
			.toBeTruthy();

		expect(map.has('quux'))
			.toBeFalsy();

		map.set('foo', 4).set('quux', 5);

		expect(map.has('foo'))
			.toBeTruthy();

		expect(map.has('quux'))
			.toBeTruthy();
	});

	test('#contains()', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.contains(3))
			.toBeTruthy();

		expect(map.contains(4))
			.toBeFalsy();

		expect(map.contains(5))
			.toBeFalsy();

		map.set('baz', 4).set('quux', 5);

		expect(map.contains(3))
			.toBeFalsy();

		expect(map.contains(4))
			.toBeTruthy();

		expect(map.contains(5))
			.toBeTruthy();
	});

	test('#get()', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.get('foo'))
			.toBe(1);

		expect(map.get('bar'))
			.toBe(2);
	});

	test('#set()', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		map.set('foo', 4).set('quux', 5);

		expect(map.get('foo'))
			.toBe(4);

		expect(map.get('bar'))
			.toBe(2);

		expect(map.get('quux'))
			.toBe(5);
	});

	test('#delete()', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.delete('foo'))
			.toBeTruthy();

		expect(map.delete('quux'))
			.toBeFalsy();

		expect(map.has('foo'))
			.toBeFalsy();

		expect(map.get('foo'))
			.toBeUndefined();
	});

	test('#size', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.size)
			.toBe(3);

		map.set('foo', 4).set('quux', 5);

		expect(map.size)
			.toBe(4);
	});

	test('#clear()', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.clear())
			.toBe(map);

		expect(map.has('foo'))
			.toBeFalsy();

		expect(map.contains('2'))
			.toBeFalsy();

		expect(map.size)
			.toBe(0);
	});

	test('#forEach()', function() {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let cb = jest.fn();

		map.forEach(cb);

		expect(cb)
			.toHaveBeenCalledTimes(3);

		expect(cb.mock.calls[1])
			.toEqual([2, 'bar', map]);
	});

	test('#clone()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let copy = map.clone();

		expect(map)
			.not.toBe(copy);

		expect(copy.has('foo'))
			.toBeTruthy();

		expect(copy.contains(2))
			.toBeTruthy();

		map.set('quux', 4);

		expect(copy.contains(4))
			.toBeFalsy();

		expect(copy.size)
			.toBe(3);
	});

	test('поддерживает перебор for-of-ом', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let result = [];

		for (let [key, value] of map) {
			result.push(key, value);
		}

		expect(result)
			.toEqual(['foo', 1, 'bar', 2, 'baz', 3]);
	});

});
