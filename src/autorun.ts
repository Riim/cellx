import { Cell, type ICellOptions } from './Cell';

export function autorun<TValue = any, TContext = any, TMeta = any>(
	cb: (value: TValue | undefined, disposer: () => void) => TValue,
	cellOptions?: ICellOptions<TValue, TContext, TMeta>
) {
	let disposer: (() => void) | undefined;

	new Cell(
		function (cell, value) {
			return cb.call(
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
