describe('cellx', function() {

	let Map = cellx.JS.Map;

	it('должна позволять использовать замороженный объект как ключ', function() {
		let obj = Object.freeze({});

		let map = new Map();

		map.set(obj, obj);

		expect(map.get(obj))
			.to.equal(obj);
	});

});
