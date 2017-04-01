describe('ObservableMap', function() {

	if (!window.Symbol) {
		window.Symbol = cellx.JS.Symbol;
	}

	it('#has()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.has('foo'))
			.to.be.ok;

		expect(map.has('quux'))
			.to.be.not.ok;

		map.set('foo', 4).set('quux', 5);

		expect(map.has('foo'))
			.to.be.ok;

		expect(map.has('quux'))
			.to.be.ok;
	});

	it('#contains()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.contains(3))
			.to.be.ok;

		expect(map.contains(4))
			.to.be.not.ok;

		expect(map.contains(5))
			.to.be.not.ok;

		map.set('baz', 4).set('quux', 5);

		expect(map.contains(3))
			.to.be.not.ok;

		expect(map.contains(4))
			.to.be.ok;

		expect(map.contains(5))
			.to.be.ok;
	});

	it('#get()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.get('foo'))
			.to.equal(1);

		expect(map.get('bar'))
			.to.equal(2);
	});

	it('#set()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		map.set('foo', 4).set('quux', 5);

		expect(map.get('foo'))
			.to.equal(4);

		expect(map.get('bar'))
			.to.equal(2);

		expect(map.get('quux'))
			.to.equal(5);
	});

	it('#delete()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.delete('foo'))
			.to.be.ok;

		expect(map.delete('quux'))
			.to.be.not.ok;

		expect(map.has('foo'))
			.to.be.not.ok;

		expect(map.get('foo'))
			.to.equal(undefined);
	});

	it('#size', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.size)
			.to.equal(3);

		map.set('foo', 4).set('quux', 5);

		expect(map.size)
			.to.equal(4);
	});

	it('#clear()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});

		expect(map.clear())
			.to.equal(map);

		expect(map.has('foo'))
			.to.be.not.ok;

		expect(map.contains('2'))
			.to.be.not.ok;

		expect(map.size)
			.to.equal(0);
	});

	it('#forEach()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let spy = sinon.spy();
		let context = {};

		map.forEach(spy, context);

		expect(spy.calledThrice)
			.to.be.ok;

		expect(spy.firstCall.calledOn(context))
			.to.be.ok;

		expect(spy.secondCall.args)
			.to.eql([2, 'bar', map]);
	});

	it('#clone()', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let copy = map.clone();

		expect(map)
			.to.not.equal(copy);

		expect(copy.has('foo'))
			.to.be.ok;

		expect(copy.contains(2))
			.to.be.ok;

		map.set('quux', 4);

		expect(copy.contains(4))
			.to.be.not.ok;

		expect(copy.size)
			.to.equal(3);
	});

	it('должна поддерживать перебор for-of-ом', function() {
		let map = new cellx.ObservableMap({
			foo: 1,
			bar: 2,
			baz: 3
		});
		let result = [];

		for (let [key, value] of map) {
			result.push(key, value);
		}

		expect(result)
			.to.eql(['foo', 1, 'bar', 2, 'baz', 3]);
	});

});
