import { Bench } from 'tinybench';
import { Cell } from '../dist/cellx.umd';

const bench = new Bench({ time: 10000 });

bench.add('1', () => {
	let start = {
		prop1: new Cell(1),
		prop2: new Cell(2),
		prop3: new Cell(3),
		prop4: new Cell(4)
	};
	let layer = start;

	for (let i = 100; i--; ) {
		layer = ((prev) => {
			let next = {
				prop1: new Cell(() => prev.prop2.get()),
				prop2: new Cell(() => prev.prop1.get() - prev.prop3.get()),
				prop3: new Cell(() => prev.prop2.get() + prev.prop4.get()),
				prop4: new Cell(() => prev.prop3.get())
			};

			next.prop1.onChange(() => {});
			next.prop2.onChange(() => {});
			next.prop3.onChange(() => {});
			next.prop4.onChange(() => {});

			next.prop1.get();
			next.prop2.get();
			next.prop3.get();
			next.prop4.get();

			return next;
		})(layer);
	}

	let end = layer;

	let beforeChange = [end.prop1.get(), end.prop2.get(), end.prop3.get(), end.prop4.get()];

	start.prop1.set(4);
	start.prop2.set(3);
	start.prop3.set(2);
	start.prop4.set(1);

	let afterChange = [end.prop1.get(), end.prop2.get(), end.prop3.get(), end.prop4.get()];

	beforeChange;
	afterChange;
});

(async () => {
	await bench.run();

	console.table(bench.table());
})();
