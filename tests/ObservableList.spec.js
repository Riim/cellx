describe('ObservableList', function() {

	if (!window.Symbol) {
		window.Symbol = cellx.js.Symbol;
	}

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
