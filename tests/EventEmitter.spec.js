describe('EventEmitter', function() {

	it('#on()', function() {
		let emitter = new cellx.EventEmitter();
		let fooSpy = sinon.spy();
		let barSpy = sinon.spy();

		emitter.on('foo', fooSpy);
		emitter.on({
			bar: barSpy
		});

		emitter.emit('foo');

		expect(fooSpy.calledOnce)
			.to.be.ok;

		expect(barSpy.called)
			.to.not.be.ok;

		emitter.emit('bar');

		expect(fooSpy.calledOnce)
			.to.be.ok;

		expect(barSpy.calledOnce)
			.to.be.ok;
	});

	it('#off()', function() {
		let emitter = new cellx.EventEmitter();
		let fooSpy = sinon.spy();
		let barSpy = sinon.spy();

		emitter.on({
			foo: fooSpy,
			bar: barSpy
		});

		emitter.off('foo', fooSpy);
		emitter.off({
			bar: barSpy
		});

		emitter.emit('foo');
		emitter.emit('bar');

		expect(fooSpy.called)
			.to.not.be.ok;

		expect(barSpy.called)
			.to.not.be.ok;
	});

	it('#once()', function() {
		let emitter = new cellx.EventEmitter();
		let fooSpy = sinon.spy();

		emitter.once('foo', fooSpy);

		emitter.emit('foo');
		emitter.emit('foo');

		expect(fooSpy.calledOnce)
			.to.be.ok;
	});

});
