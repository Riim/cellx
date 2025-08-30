import { Bench } from 'tinybench';

const bench = new Bench({ time: 1000 });

const arr = Array.from({ length: 1000 }, (_, idx) => idx + 1);

bench
	.add('by index with l-var', () => {
		let item;

		for (let i = 0, l = arr.length; i < l; i++) {
			arr[i];
			item = arr[i];
		}
	})
	.add('by index without l-var', () => {
		let item;

		for (let i = 0; i < arr.length; i++) {
			arr[i];
			item = arr[i];
		}
	})
	.add('by index without l-var 2', () => {
		let item;

		for (let i = 0; i != arr.length; i++) {
			arr[i];
			item = arr[i];
		}
	})
	.add('by index from end', () => {
		let item;

		for (let i = arr.length; i != 0; ) {
			arr[--i];
			item = arr[i];
		}
	})
	.add('by index from end 2', () => {
		let item;

		for (let i = arr.length - 1; i >= 0; i--) {
			arr[i];
			item = arr[i];
		}
	})
	.add('of operator', () => {
		let item;

		for (let item_ of arr) {
			item_;
			item = item_;
		}
	});

(async () => {
	await bench.run();

	// ┌─────────┬────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
	// │ (index) │ Task Name                  │ ops/sec   │ Average Time (ns)  │ Margin   │ Samples │
	// ├─────────┼────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
	// │ 0       │ 'by index with l-var'      │ '804 888' │ 1242.4083320804239 │ '±0.22%' │ 804889  │
	// │ 1       │ 'by index without l-var'   │ '804 675' │ 1242.7368282391537 │ '±0.17%' │ 804676  │
	// │ 2       │ 'by index without l-var 2' │ '748 204' │ 1336.5337039985186 │ '±0.17%' │ 748205  │
	// │ 3       │ 'by index from end'        │ '651 888' │ 1534.0054825284474 │ '±0.18%' │ 651889  │
	// │ 4       │ 'by index from end 2'      │ '658 182' │ 1519.335048154231  │ '±0.21%' │ 658183  │
	// │ 5       │ 'of operator'              │ '575 856' │ 1736.5437947271807 │ '±0.26%' │ 575857  │
	// └─────────┴────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
	console.table(bench.table());
})();
