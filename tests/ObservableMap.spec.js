describe('ObservableMap', function() {

	if (!window.Symbol) {
		window.Symbol = cellx.js.Symbol;
	}

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
