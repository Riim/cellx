import { Cell, type ICellOptions } from './Cell';

export function autorun<TValue = any, TContext = any, TMeta = any>(
	fn: (this: TContext, value: TValue | undefined, disposer: () => void) => TValue,
	cellOptions?: ICellOptions<TValue, TContext, TMeta>
) {
	let disposer: (() => void) | undefined;

	new Cell(
		function (cell, value) {
			return fn.call(
				this,
				value,
				(disposer ??= () => {
					cell.dispose();
				})
			);
		},
		cellOptions?.onChange
			? cellOptions
			: {
					...cellOptions,
					onChange: () => {}
				}
	);

	return disposer!;
}
