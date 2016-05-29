describe('cellx', function() {

	it('#get()', function() {
		let a = cellx(1);

		expect(a())
			.to.equal(1);
	});

	it('#set()', function() {
		let a = cellx(1);

		a(2);

		expect(a())
			.to.equal(2);
	});

	it('#bind()', function() {
		let aPullSpy = sinon.spy();
		let a = cellx(aPullSpy);
		let context = {};

		a = a.call(context, 'bind', 0);
		a();

		expect(aPullSpy.calledOnce)
			.to.be.ok;

		expect(aPullSpy.firstCall.calledOn(context))
			.to.be.ok;
	});

	it('#unwrap()', function() {
		let a = cellx(1);
		let aa = a('unwrap', 0);

		expect(aa)
			.to.be.instanceof(cellx.Cell);
	});

	it('должна позволять использование в прототипе', function() {
		function A() {}
		A.prototype.prop1 = cellx([1, 2, 3]);
		A.prototype.prop2 = cellx(function() { return [1, 2, 3]; });

		let a1 = new A();
		let a2 = new A();

		expect(a1.prop1())
			.to.equal(a2.prop1());

		expect(a1.prop2())
			.to.not.equal(a2.prop2());

		expect(a1.prop2())
			.to.eql(a2.prop2());
	});

});
