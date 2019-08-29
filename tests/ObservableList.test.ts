import { expect } from 'chai';
import * as sinon from 'sinon';
import { ObservableList } from '../src/cellx';

describe('ObservableList', () => {
	it('#sorted', () => {
		let list = new ObservableList([4, 3, 1, 5, 2], {
			sorted: true
		});

		expect(list.toArray()).to.eql([1, 2, 3, 4, 5]);
	});

	it('#contains()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(list.contains(2)).to.be.true;
		expect(list.contains(4)).to.be.false;
	});

	it('#indexOf()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.indexOf(1)).to.equal(0);
		expect(list.indexOf(2, 2)).to.equal(3);
		expect(list.indexOf(3, 3)).to.equal(-1);
	});

	it('#lastIndexOf()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.lastIndexOf(1)).to.equal(4);
		expect(list.lastIndexOf(2, 3)).to.equal(3);
		expect(list.lastIndexOf(3, 3)).to.equal(2);
		expect(list.lastIndexOf(3, 1)).to.equal(-1);
	});

	it('#get()', () => {
		let list = new ObservableList([1]);

		expect(() => {
			list.get(-2);
		}).to.throw(RangeError);
	});

	it('#get() (2)', () => {
		let list = new ObservableList([1]);

		expect(() => {
			list.get(2);
		}).to.throw(RangeError);
	});

	it('#get() (3)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.get(2)).to.equal(3);
	});

	it('#getRange()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(() => {
			list.getRange(2, 2);
		}).to.throw(RangeError);
	});

	it('#getRange() (2)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.getRange(2, 2)).to.eql([3, 2]);
		expect(list.getRange(2)).to.eql([3, 2, 1]);
	});

	it('#set()', () => {
		let list = new ObservableList(null, { sorted: true });

		expect(() => {
			list.set(0, 1);
		}).to.throw(TypeError);
	});

	it('#set() (2)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.set(2, 4)).to.equal(list);
		expect(list.get(2)).to.equal(4);
	});

	it('#setRange()', () => {
		let list = new ObservableList(null, { sorted: true });

		expect(() => {
			list.setRange(0, [1]);
		}).to.throw(TypeError);
	});

	it('#setRange() (2)', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(() => {
			list.setRange(2, [4, 5]);
		}).to.throw(RangeError);
	});

	it('#setRange() (3)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.setRange(2, [4, 5])).to.equal(list);
		expect(list.toArray()).to.eql([1, 2, 4, 5, 1]);
	});

	it('#add()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.add(4)).to.equal(list);
		expect(list.get(-1)).to.equal(4);
	});

	it('#add(unique = true)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.add(3, true)).to.equal(list);
		expect(list.get(-1)).to.equal(1);
	});

	it('#addRange()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.addRange([4, 5])).to.equal(list);
		expect(list.getRange(-2)).to.eql([4, 5]);
	});

	it('#addRange(unique = true)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.addRange([3, 4, 2, 5], true)).to.equal(list);
		expect(list.getRange(-3)).to.eql([1, 4, 5]);
		expect(list.length).to.equal(7);
	});

	it('#insert()', () => {
		let list = new ObservableList(null, { sorted: true });

		expect(() => {
			list.insert(0, 1);
		}).to.throw(TypeError);
	});

	it('#insert() (2)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.insert(3, 4)).to.equal(list);
		expect(list.toArray()).to.eql([1, 2, 3, 4, 2, 1]);
	});

	it('#insertRange()', () => {
		let list = new ObservableList(null, { sorted: true });

		expect(() => {
			list.insertRange(0, [1]);
		}).to.throw(TypeError);
	});

	it('#insertRange() (2)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.insertRange(3, [4, 5])).to.equal(list);
		expect(list.toArray()).to.eql([1, 2, 3, 4, 5, 2, 1]);
	});

	it('#remove()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.remove(1)).to.be.true;
		expect(list.remove(4)).to.be.false;
		expect(list.toArray()).to.eql([2, 3, 2, 1]);
	});

	it('#removeAll()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeAll(1)).to.be.true;
		expect(list.toArray()).to.eql([2, 3, 2]);
	});

	it('#removeEach()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeEach([2, 3, 1], 1)).to.be.true;
		expect(list.removeEach([1], 1)).to.be.false;
		expect(list.toArray()).to.eql([1, 2]);
	});

	it('#removeAt()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeAt(2)).to.equal(3);
		expect(list.toArray()).to.eql([1, 2, 2, 1]);
	});

	it('#removeRange()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(() => {
			list.removeRange(2, 2);
		}).to.throw(RangeError);
	});

	it('#removeRange() (2)', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeRange(2, 2)).to.eql([3, 2]);
		expect(list.toArray()).to.eql([1, 2, 1]);
		expect(list.removeRange(1)).to.eql([2, 1]);
		expect(list.toArray()).to.eql([1]);
	});

	it('#clear()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.clear()).to.equal(list);
		expect(list.toArray()).to.eql([]);
	});

	it('#length', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.length).to.equal(5);
		expect(list.add(4).length).to.equal(6);
	});

	it('#length (2)', () => {
		let list = new ObservableList([1]);

		expect(() => {
			list.length = 3;
		}).to.throw(RangeError);
	});

	it('#length (3)', () => {
		let list = new ObservableList([1, 2, 3, 4, 5]);

		list.length = 3;

		expect(list.length).to.equal(3);
	});

	it('#join()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.join('-')).to.equal('1-2-3-2-1');
	});

	it('#forEach()', () => {
		let list = new ObservableList([1, 2, 3]);
		let cb = sinon.spy();

		list.forEach(cb);

		expect(cb.calledThrice).to.be.true;
		expect(cb.secondCall.args).to.eql([2, 1, list]);
	});

	it('#find()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);
		let isThree = sinon.spy(item => item == 3);

		expect(list.find(isThree)).to.equal(3);
		expect(isThree.calledThrice).to.be.true;
		expect(isThree.secondCall.args).to.eql([2, 1, list]);
	});

	it('#findIndex()', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);
		let isThree = sinon.spy(item => item == 3);

		expect(list.findIndex(isThree)).to.equal(2);
		expect(isThree.calledThrice).to.be.true;
		expect(isThree.secondCall.args).to.eql([2, 1, list]);
	});

	it('#reduce()', () => {
		let list = new ObservableList([1, 2, 3]);
		let reducer = sinon.spy((sum, item) => sum + item);

		expect(list.reduce(reducer)).to.equal(6);
		expect(reducer.calledTwice).to.be.true;
		expect(reducer.secondCall.args).to.eql([3, 3, 2, list]);
	});

	it('#clone()', () => {
		let list = new ObservableList([1, 2, 3]);
		let copy = list.clone();

		expect(copy).not.to.equal(list);
		expect(copy.length).to.equal(list.length);
		expect(copy.toArray()).to.eql(list.toArray());
	});

	it('#clone(true)', () => {
		let list = new ObservableList([new ObservableList([1, 2, 3])]);
		let copy = list.clone(true);

		expect(copy.get(0)!.toArray()).to.eql([1, 2, 3]);
		expect(copy.get(0)).not.to.equal(list.get(0));
	});

	it('#toArray()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(list.toArray()).to.eql([1, 2, 3]);
	});

	it('#toString()', () => {
		let list = new ObservableList([1, 2, 3]);

		expect(list.toString()).to.equal('1,2,3');
	});

	it('понимает отрицательные индексы', () => {
		let list = new ObservableList([1, 2, 3, 2, 1]);

		expect(list.get(-3)).to.equal(3);
		expect(list.get(-2)).to.equal(2);
	});

	it('поддерживает перебор for-of-ом', () => {
		let list = new ObservableList([1, 2, 3]);
		let result = [];

		for (let value of list) {
			result.push(value);
		}

		expect(result).to.eql([1, 2, 3]);
	});
});
