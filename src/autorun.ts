import { Cell, ICellOptions } from './Cell';

export function autorun<Value, Context = null>(
	fn: (this: Context, value: Value | undefined, disposer: () => void) => Value,
	cellOptions?: ICellOptions<Value, Context>
) {
	let disposer: (() => void) | undefined;

	new Cell({
		onChange: () => {},
		...cellOptions,
		pull: function (cell, value) {
			return fn.call(
				this,
				value,
				(disposer ??= () => {
					cell.dispose();
				})
			);
		}
	});

	return disposer!;
}
