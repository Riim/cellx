import { ObservableList } from '../src/cellx';

describe('ObservableList', () => {
	test('#sorted', () => {
		let list = new ObservableList([4, 3, 1, 5, 2], {
			sorted: true
		});

		expect(list.toArray()).toEqual([1, 2, 3, 4, 5]);
	});

	test('#contains()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(list.contains(2)).toBeTruthy();
		expect(list.contains(4)).toBeFalsy();
	});

	test('#indexOf()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.indexOf(1)).toBe(0);
		expect(list.indexOf(2, 2)).toBe(3);
		expect(list.indexOf(3, 3)).toBe(-1);
	});

	test('#lastIndexOf()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.lastIndexOf(1)).toBe(4);
		expect(list.lastIndexOf(2, 3)).toBe(3);
		expect(list.lastIndexOf(3, 3)).toBe(2);
		expect(list.lastIndexOf(3, 1)).toBe(-1);
	});

	test('#get()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.get(2)).toBe(3);
	});

	test('#getRange()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.getRange(2, 2)).toEqual([3, 2]);
		expect(list.getRange(2)).toEqual([3, 2, 1]);
	});

	test('#set()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.set(2, 4)).toBe(list);
		expect(list.get(2)).toBe(4);
	});

	test('#setRange()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.setRange(2, [4, 5])).toBe(list);
		expect(list.toArray()).toEqual([1, 2, 4, 5, 1]);
	});

	test('#add()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.add(4)).toBe(list);
		expect(list.get(-1)).toBe(4);
	});

	test('#add(unique = true)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.add(3, true)).toBe(list);
		expect(list.get(-1)).toBe(1);
	});

	test('#addRange()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.addRange([4, 5])).toBe(list);
		expect(list.getRange(-2)).toEqual([4, 5]);
	});

	test('#addRange(unique = true)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.addRange([3, 4, 2, 5], true)).toBe(list);
		expect(list.getRange(-3)).toEqual([1, 4, 5]);
		expect(list.length).toBe(7);
	});

	test('#insert()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.insert(3, 4)).toBe(list);
		expect(list.toArray()).toEqual([1, 2, 3, 4, 2, 1]);
	});

	test('#insertRange()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.insertRange(3, [4, 5])).toBe(list);
		expect(list.toArray()).toEqual([1, 2, 3, 4, 5, 2, 1]);
	});

	test('#remove()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.remove(1)).toBeTruthy();
		expect(list.remove(4)).toBeFalsy();
		expect(list.toArray()).toEqual([2, 3, 2, 1]);
	});

	test('#removeAll()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeAll(1)).toBeTruthy();
		expect(list.toArray()).toEqual([2, 3, 2]);
	});

	test('#removeEach()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeEach([2, 3, 1], 1)).toBeTruthy();
		expect(list.removeEach([1], 1)).toBeFalsy();
		expect(list.toArray()).toEqual([1, 2]);
	});

	test('#removeAt()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeAt(2)).toBe(3);
		expect(list.toArray()).toEqual([1, 2, 2, 1]);
	});

	test('#removeRange()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeRange(2, 2)).toEqual([3, 2]);
		expect(list.toArray()).toEqual([1, 2, 1]);
		expect(list.removeRange(1)).toEqual([2, 1]);
		expect(list.toArray()).toEqual([1]);
	});

	test('#clear()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.clear()).toBe(list);
		expect(list.toArray()).toEqual([]);
	});

	test('#length', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.length).toBe(5);
		expect(list.add(4).length).toBe(6);
	});

	test('#join()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.join('-')).toBe('1-2-3-2-1');
	});

	test('#forEach()', () => {
		let list = new ObservableList([1, 2, 3]);
		let cb = jest.fn();

		list.forEach(cb);

		expect(cb).toHaveBeenCalledTimes(3);
		expect(cb.mock.calls[1]).toEqual([2, 1, list]);
	});

	test('#find()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);
		let isThree = jest.fn(item => item == 3);

		expect(list.find(isThree)).toBe(3);
		expect(isThree).toHaveBeenCalledTimes(3);
		expect(isThree.mock.calls[1]).toEqual([2, 1, list]);
	});

	test('#findIndex()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);
		let isThree = jest.fn(item => item == 3);

		expect(list.findIndex(isThree)).toBe(2);
		expect(isThree).toHaveBeenCalledTimes(3);
		expect(isThree.mock.calls[1]).toEqual([2, 1, list]);
	});

	test('#reduce()', () => {
		let list = new ObservableList([1, 2, 3]);
		let reducer = jest.fn((sum, item) => sum + item);

		expect(list.reduce(reducer)).toBe(6);
		expect(reducer).toHaveBeenCalledTimes(2);
		expect(reducer.mock.calls[1]).toEqual([3, 3, 2, list]);
	});

	test('#clone()', () => {
		let list = new ObservableList([1, 2, 3]);
		let copy = list.clone();

		expect(copy).not.toBe(list);
		expect(copy.length).toBe(list.length);
		expect(copy.toArray()).toEqual(list.toArray());
	});

	test('#toArray()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(list.toArray()).toEqual([1, 2, 3]);
	});

	test('#toString()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(list.toString()).toBe('1,2,3');
	});

	test('понимает отрицательные индексы', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.get(-3)).toBe(3);
		expect(list.get(-2)).toBe(2);
	});

	test('поддерживает перебор for-of-ом', () => {
		let list = new ObservableList([1, 2, 3]);
		let result = [];

		for (let value of (list as any)) {
			result.push(value);
		}

		expect(result).toEqual([1, 2, 3]);
	});
});
