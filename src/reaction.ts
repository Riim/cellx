import { Cell, ICellChangeEvent, ICellOptions, TCellPull } from './Cell';

export function reaction<Value, Context = any, Meta = any>(
	source: Cell | Array<Cell> | TCellPull<Value, Context, Meta>,
	fn: (this: Context, value: Value, prevValue: Value, disposer: () => void) => any,
	cellOptions?: ICellOptions<Value, Context, Meta>
) {
	let cell = new Cell({
		...cellOptions,
		pull:
			source instanceof Cell
				? () => source.value
				: Array.isArray(source)
					? () => source.map((cell) => cell.value)
					: source
	});
	let disposer = () => {
		cell.dispose();
	};

	cell.onChange(function (this: Context, { data }: ICellChangeEvent) {
		return fn.call(this, data.value, data.prevValue, disposer);
	});

	return disposer;
}
