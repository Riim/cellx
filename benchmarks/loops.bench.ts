import { Bench } from 'tinybench';

const arr = Array.from({ length: 1000 }, (_, idx) => idx + 1);
let item: number;

const bench = new Bench({ time: 1000 });

bench
	.add('by index with l-var', () => {
		for (let i = 0, l = arr.length; i < l; i++) {
			arr[i];
			item = arr[i];
		}
	})
	.add('by index without l-var', () => {
		for (let i = 0; i < arr.length; i++) {
			arr[i];
			item = arr[i];
		}
	})
	.add('by index without l-var 2', () => {
		for (let i = 0; i != arr.length; i++) {
			arr[i];
			item = arr[i];
		}
	})
	.add('by index from end', () => {
		for (let i = arr.length; i != 0; ) {
			arr[--i];
			item = arr[i];
		}
	})
	.add('by index from end 2', () => {
		for (let i = arr.length - 1; i >= 0; i--) {
			arr[i];
			item = arr[i];
		}
	})
	.add('of operator', () => {
		for (let item_ of arr) {
			item_;
			item = item_;
		}
	});

(async () => {
	await bench.run();

	// ┌─────────┬────────────────────────────┬──────────────────┬──────────────────┬────────────────────────┬────────────────────────┬─────────┐
	// │ (index) │ Task name                  │ Latency avg (ns) │ Latency med (ns) │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
	// ├─────────┼────────────────────────────┼──────────────────┼──────────────────┼────────────────────────┼────────────────────────┼─────────┤
	// │ 0       │ 'by index with l-var'      │ '343.93 ± 0.05%' │ '337.00 ± 5.00'  │ '2928232 ± 0.01%'      │ '2967359 ± 44689'      │ 2907576 │
	// │ 1       │ 'by index without l-var'   │ '340.06 ± 0.03%' │ '335.00 ± 4.00'  │ '2953385 ± 0.00%'      │ '2985075 ± 36073'      │ 2940701 │
	// │ 2       │ 'by index without l-var 2' │ '459.00 ± 0.04%' │ '453.00 ± 2.00'  │ '2190553 ± 0.00%'      │ '2207506 ± 9789'       │ 2178655 │
	// │ 3       │ 'by index from end'        │ '575.30 ± 0.04%' │ '572.00 ± 1.00'  │ '1743325 ± 0.00%'      │ '1748252 ± 3062'       │ 1738214 │
	// │ 4       │ 'by index from end 2'      │ '458.18 ± 0.03%' │ '454.00 ± 2.00'  │ '2189922 ± 0.00%'      │ '2202643 ± 9746'       │ 2182541 │
	// │ 5       │ 'of operator'              │ '755.96 ± 0.02%' │ '752.00 ± 2.00'  │ '1326199 ± 0.01%'      │ '1329787 ± 3527'       │ 1322828 │
	// └─────────┴────────────────────────────┴──────────────────┴──────────────────┴────────────────────────┴────────────────────────┴─────────┘

	console.table(bench.table());
})();
