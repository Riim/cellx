describe('cellx', function() {

	it('должна подписывать через EventEmitter', function(done) {
		let emitter = new cellx.EventEmitter();
		let onChangeSpy = sinon.spy();

		cellx.define(emitter, {
			foo: 1
		});

		emitter.on('change:foo', onChangeSpy);

		emitter.foo = 2;

		setTimeout(function() {
			expect(onChangeSpy.calledOnce)
				.to.be.ok;

			expect(onChangeSpy.firstCall.calledOn(emitter))
				.to.be.ok;

			done();
		}, 1);
	});

});
