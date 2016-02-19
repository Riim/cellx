describe('cellx', function() {

	it('должна подписывать через EventEmitter', function(done) {
		var ee = new cellx.EventEmitter();
		var onChangeSpy = sinon.spy();

		cellx.define(ee, {
			foo: 1
		});

		ee.on('change:foo', onChangeSpy);

		ee.foo = 2;

		setTimeout(function() {
			expect(onChangeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

});
