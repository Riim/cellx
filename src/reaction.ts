import {
	Cell,
	Cell_runtimeState,
	type IAsyncCellOptions,
	type ICellOptions,
	type TAnyCellOptions,
	type TAsyncCellCompute,
	type TCellCompute
} from './Cell';

export function reaction<Value, Context = any>(
	source: TAsyncCellCompute<Value, Context>,
	fn: (this: Context, value: Value, disposer: () => void) => any,
	cellOptions: IAsyncCellOptions<Value, Context>
): () => void;
export function reaction<Value, Context = any>(
	source: Cell<Value> | TCellCompute<Value, Context>,
	fn: (this: Context, value: Value, disposer: () => void) => any,
	cellOptions?: ICellOptions<Value, Context>
): () => void;

export function reaction<Value, Context = any>(
	source: Cell | TAsyncCellCompute<Value, Context>,
	fn: (this: Context, value: Value, disposer: () => void) => any,
	cellOptions?: TAnyCellOptions<Value, Context>
) {
	let cell = new Cell<Value, Context>(
		(source instanceof Cell ? () => source.value : source) as TCellCompute<Value, Context>,
		cellOptions as ICellOptions<Value, Context> | undefined
	);
	let disposer = () => {
		cell.disconnect();
	};

	cell.onChange(function (this: Context, value) {
		let prevCell = Cell_runtimeState.currentCell;
		Cell_runtimeState.currentCell = null;

		try {
			return fn.call(this, value, disposer);
		} finally {
			Cell_runtimeState.currentCell = prevCell;
		}
	});

	return disposer;
}
