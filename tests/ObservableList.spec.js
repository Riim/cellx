describe('ObservableList', function() {

	if (!window.Symbol) {
		window.Symbol = cellx.js.Symbol;
	}

	it('#sorted', function() {
		let list = new cellx.ObservableList([4, 3, 1, 5, 2], {
			sorted: true
		});

		expect(list.toArray())
			.to.eql([1, 2, 3, 4, 5]);
	});

	it('#contains()', function() {
		let list = new cellx.ObservableList([1, 2, 3]);

		expect(list.contains(1))
			.to.be.ok;

		expect(list.contains(4))
			.to.be.not.ok;
	});

	it('#indexOf()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.indexOf(1))
			.to.equal(0);

		expect(list.indexOf(2, 2))
			.to.equal(3);

		expect(list.indexOf(3, 3))
			.to.equal(-1);
	});

	it('#lastIndexOf()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.lastIndexOf(1))
			.to.equal(4);

		expect(list.lastIndexOf(2, 3))
			.to.equal(3);

		expect(list.lastIndexOf(3, 2))
			.to.equal(2);

		expect(list.lastIndexOf(3, 1))
			.to.equal(-1);
	});

	it('#get()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.get(2))
			.to.equal(3);
	});

	it('#getRange()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.getRange(2, 2))
			.to.eql([3, 2]);

		expect(list.getRange(2))
			.to.eql([3, 2, 1]);
	});

	it('#set()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.set(2, 4))
			.to.equal(list);

		expect(list.get(2))
			.to.equal(4);
	});

	it('#setRange()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.setRange(2, [4, 5]))
			.to.equal(list);

		expect(list.getRange(2, 2))
			.to.eql([4, 5]);
	});

	it('#add()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.add(4))
			.to.equal(list);

		expect(list.get(-1))
			.to.equal(4);
	});

	it('#addRange()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.addRange([4, 5]))
			.to.equal(list);

		expect(list.getRange(-2))
			.to.eql([4, 5]);
	});

	it('#insert()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.insert(3, 4))
			.to.equal(list);

		expect(list.toArray())
			.to.eql([1, 2, 3, 4, 2, 1]);
	});

	it('#insertRange()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.insertRange(3, [4, 5]))
			.to.equal(list);

		expect(list.toArray())
			.to.eql([1, 2, 3, 4, 5, 2, 1]);
	});

	it('#remove()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.remove(1))
			.to.be.ok;

		expect(list.remove(4))
			.to.be.not.ok;

		expect(list.toArray())
			.to.eql([2, 3, 2, 1]);
	});

	it('#removeAll()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeAll(1))
			.to.be.ok;

		expect(list.remove(4))
			.to.be.not.ok;

		expect(list.toArray())
			.to.eql([2, 3, 2]);
	});

	it('#removeEach()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeEach([2, 3, 1], 1))
			.to.be.ok;

		expect(list.removeEach([1], 1))
			.to.be.not.ok;

		expect(list.toArray())
			.to.eql([1, 2]);
	});

	it('#removeAllEach()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeAllEach([2, 3, 1], 1))
			.to.be.ok;

		expect(list.removeAllEach([2]))
			.to.be.not.ok;

		expect(list.toArray())
			.to.eql([1]);
	});

	it('#removeAt()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeAt(2))
			.to.equal(3);

		expect(list.toArray())
			.to.eql([1, 2, 2, 1]);
	});

	it('#removeRange()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.removeRange(2, 2))
			.to.eql([3, 2]);

		expect(list.toArray())
			.to.eql([1, 2, 1]);

		expect(list.removeRange(1))
			.to.eql([2, 1]);

		expect(list.toArray())
			.to.eql([1]);
	});

	it('#clear()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.clear())
			.to.equal(list);

		expect(list.toArray())
			.to.eql([]);
	});

	it('#length', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.length)
			.to.equal(5);

		expect(list.add(4).length)
			.to.eql(6);
	});

	it('#join()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.join('-'))
			.to.equal('1-2-3-2-1');
	});

	it('#forEach()', function() {
		let list = new cellx.ObservableList([1, 2, 3]);
		let callbackSpy = sinon.spy();
		let context = {};

		list.forEach(callbackSpy, context)

		expect(callbackSpy.calledThrice)
			.to.be.ok;

		expect(callbackSpy.firstCall.calledOn(context))
			.to.be.ok;

		expect(callbackSpy.secondCall.args)
			.to.eql([2, 1, list]);
	});

	it('#find()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);
		let callbackSpy = sinon.spy(function(item) {
			if (item == 3) {
				return true;
			}
		});
		let context = {};

		expect(list.find(callbackSpy, context))
			.to.equal(3);

		expect(callbackSpy.calledThrice)
			.to.be.ok;

		expect(callbackSpy.firstCall.calledOn(context))
			.to.be.ok;

		expect(callbackSpy.secondCall.args)
			.to.eql([2, 1, list]);
	});

	it('#findIndex()', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);
		let callbackSpy = sinon.spy(function(item) {
			if (item == 3) {
				return true;
			}
		});
		let context = {};

		expect(list.findIndex(callbackSpy, context))
			.to.equal(2);

		expect(callbackSpy.calledThrice)
			.to.be.ok;

		expect(callbackSpy.firstCall.calledOn(context))
			.to.be.ok;

		expect(callbackSpy.secondCall.args)
			.to.eql([2, 1, list]);
	});

	it('#reduce()', function() {
		let list = new cellx.ObservableList([1, 2, 3]);
		let callbackSpy = sinon.spy(function(sum, item) {
			return sum + item;
		});

		expect(list.reduce(callbackSpy))
			.to.equal(6);

		expect(callbackSpy.calledTwice)
			.to.be.ok;

		expect(callbackSpy.firstCall.calledOn(undefined))
			.to.be.ok;

		expect(callbackSpy.secondCall.args)
			.to.eql([3, 3, 2, list]);
	});

	it('#clone()', function() {
		let list = new cellx.ObservableList([1, 2, 3]);
		let clonedList = list.clone();

		expect(clonedList)
			.to.not.equal(list);

		expect(clonedList.length)
			.to.equal(list.length);

		expect(clonedList.toArray())
			.to.eql(list.toArray());
	});

	it('#toArray()', function() {
		let list = new cellx.ObservableList([1, 2, 3]);

		expect(list.toArray())
			.to.eql([1, 2, 3]);
	});

	it('#toString()', function() {
		let list = new cellx.ObservableList([1, 2, 3]);

		expect(list.toString())
			.to.equal('1,2,3');
	});

	it('должен понимать отрицательные индексы', function() {
		let list = new cellx.ObservableList([1, 2, 3, 2, 1]);

		expect(list.get(-3))
			.to.equal(3);

		expect(list.get(-1))
			.to.equal(1);
	});

	it('должен поддерживать перебор for-of-ом', function() {
		let list = new cellx.ObservableList([1, 2, 3]);
		let result = [];

		for (let value of list) {
			result.push(value);
		}

		expect(result)
			.to.eql([1, 2, 3]);
	});

});
