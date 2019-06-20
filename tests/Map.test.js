describe('Map', () => {
	test('позволяет использовать замороженный объект как ключ', () => {
		let obj = Object.freeze({});
		let map = new Map();

		map.set(obj, obj);

		expect(map.get(obj)).toBe(obj);
	});
});
