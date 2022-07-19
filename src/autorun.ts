import { Cell, ICellOptions } from './Cell';

export function autorun<T = any, M = any>(
	cb: (next: T | undefined, disposer: () => void) => T,
	cellOptions?: ICellOptions<T, M>
) {
	let disposer: (() => void) | undefined;

	new Cell(
		function (this: any, cell, next) {
			if (!disposer) {
				disposer = () => {
					cell.dispose();
				};
			}

			return cb.call(this, next, disposer);
		},
		cellOptions?.onChange
			? cellOptions
			: {
					...cellOptions,
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					onChange() {}
			  }
	);

	return disposer!;
}
