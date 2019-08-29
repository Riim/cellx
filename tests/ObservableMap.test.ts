import { expect } from 'chai';
import * as sinon from 'sinon';
import { ObservableMap } from '../src/cellx';

describe('ObservableMap', () => {
	it('#has()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.has('foo')).to.be.true;
		expect(map.has('quux')).to.be.false;

		map.set('foo', 4).set('quux', 5);

		expect(map.has('foo')).to.be.true;
		expect(map.has('quux')).to.be.true;
	});

	it('#get()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.get('foo')).to.equal(1);
		expect(map.get('bar')).to.equal(2);
	});

	it('#set()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		map.set('foo', 4).set('quux', 5);

		expect(map.get('foo')).to.equal(4);
		expect(map.get('bar')).to.equal(2);
		expect(map.get('quux')).to.equal(5);
	});

	it('#delete()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.delete('foo')).to.be.true;
		expect(map.delete('quux')).to.be.false;
		expect(map.has('foo')).to.be.false;
		expect(map.get('foo')).to.be.undefined;
	});

	it('#size', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.size).to.equal(3);

		map.set('foo', 4).set('quux', 5);

		expect(map.size).to.equal(4);
	});

	it('#clear()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.clear()).to.equal(map);
		expect(map.has('foo')).to.be.false;
		expect(map.size).to.equal(0);
	});

	it('#equals()', () => {
		let map1 = new ObservableMap({
			foo: 1,
			bar: 2
		});
		let map2 = new ObservableMap({
			foo: 1,
			bar: 2
		});
		let map3 = new ObservableMap({
			foo: 1,
			bar: 20
		});
		let map4 = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map1.equals(map2)).to.be.true;
		expect(map1.equals(map3)).to.be.false;
		expect(map1.equals(map4)).to.be.false;
		expect(map2.equals(map3)).to.be.false;
		expect(map2.equals(map4)).to.be.false;
		expect(map3.equals(map4)).to.be.false;
	});

	it('#forEach()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let cb = sinon.spy();

		map.forEach(cb);

		expect(cb.calledThrice).to.be.true;
		expect(cb.secondCall.args).to.eql([2, 'bar', map]);
	});

	it('#clone()', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let copy = map.clone();

		expect(map).not.to.equal(copy);
		expect(copy.has('foo')).to.be.true;

		map.set('quux', 4);

		expect(copy.has('quux')).to.be.false;
		expect(copy.size).to.equal(3);
	});

	it('#clone(true)', () => {
		let submap = new ObservableMap({
			foo: 1
		});
		let map = new ObservableMap({
			bar: submap
		});
		let copy = map.clone(true);

		expect(copy.get('bar')!.has('foo')).to.be.true;
		expect(copy.get('bar')).not.to.equal(map.get('bar'));
	});

	it('#absorbFrom()', () => {
		let map = new ObservableMap();

		expect(() => {
			map.absorbFrom({} as any);
		}).to.throw(TypeError);
	});

	it('#absorbFrom() (2)', () => {
		let map1 = new ObservableMap({
			foo: 1
		});
		let map2 = new ObservableMap({
			foo: 2
		});
		map1.absorbFrom(map2);

		expect(map1.get('foo')).to.equal(2);
	});

	it('#absorbFrom() (3)', () => {
		let map1 = new ObservableMap({
			foo: 1
		});
		let map2 = new ObservableMap({
			bar: 2
		});
		map1.absorbFrom(map2);

		expect(map1.size).to.equal(1);
		expect(map1.has('foo')).to.be.false;
		expect(map1.has('bar')).to.be.true;
		expect(map1.get('bar')).to.equal(2);
	});

	it('#absorbFrom() (4)', () => {
		let map1 = new ObservableMap({
			foo: new ObservableMap({
				foo: 1
			})
		});
		let map2 = new ObservableMap({
			foo: new ObservableMap({
				foo: 2,
				bar: 3
			})
		});
		map1.absorbFrom(map2);

		expect(map1.get('foo').size).to.equal(2);
		expect(map1.get('foo').has('foo')).to.be.true;
		expect(map1.get('foo').has('bar')).to.be.true;
		expect(map1.get('foo').get('foo')).to.equal(2);
		expect(map1.get('foo').get('bar')).to.equal(3);
		expect(map1.get('foo')).not.to.equal(map2.get('foo'));
	});

	it('поддерживает перебор for-of-ом', () => {
		let map = new ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let result = [];

		for (let [key, value] of map) {
			result.push(key, value);
		}

		expect(result).to.eql(['foo', 1, 'bar', 2, 'baz', 3]);
	});
});
