import { ObservableMap } from '../src/cellx';

describe('ObservableMap', () => {
	test('#has()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.has('foo')).toBeTruthy();
		expect(map.has('quux')).toBeFalsy();

		map.set('foo', 4).set('quux', 5);

		expect(map.has('foo')).toBeTruthy();
		expect(map.has('quux')).toBeTruthy();
	});

	test('#get()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.get('foo')).toBe(1);
		expect(map.get('bar')).toBe(2);
	});

	test('#set()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		map.set('foo', 4).set('quux', 5);

		expect(map.get('foo')).toBe(4);
		expect(map.get('bar')).toBe(2);
		expect(map.get('quux')).toBe(5);
	});

	test('#delete()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.delete('foo')).toBeTruthy();
		expect(map.delete('quux')).toBeFalsy();
		expect(map.has('foo')).toBeFalsy();
		expect(map.get('foo')).toBeUndefined();
	});

	test('#size', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.size).toBe(3);

		map.set('foo', 4).set('quux', 5);

		expect(map.size).toBe(4);
	});

	test('#clear()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.clear()).toBe(map);
		expect(map.has('foo')).toBeFalsy();
		expect(map.size).toBe(0);
	});

	test('#forEach()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let cb = jest.fn();

		map.forEach(cb);

		expect(cb).toHaveBeenCalledTimes(3);
		expect(cb.mock.calls[1]).toEqual([2, 'bar', map]);
	});

	test('#clone()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let copy = map.clone();

		expect(map).not.toBe(copy);
		expect(copy.has('foo')).toBeTruthy();

		map.set('quux', 4);

		expect(copy.has('quux')).toBeFalsy();
		expect(copy.size).toBe(3);
	});

	test('поддерживает перебор for-of-ом', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let result = [];

		for (let [key, value] of (map as any)) {
			result.push(key, value);
		}

		expect(result).toEqual(['foo', 1, 'bar', 2, 'baz', 3]);
	});
});
