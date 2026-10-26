import {
	Cell,
	type IAsyncCellOptions,
	type ICellOptions,
	type TAnyCellOptions,
	type TAsyncCellCompute,
	type TCellCompute
} from './Cell';

export { configure } from './config';
export { WaitError } from './WaitError';
export {
	Cell,
	type IAsyncCellOptions,
	type ICellOptions,
	type ICellOptionsBase,
	type TAnyCellOptions,
	type TAsyncCellCompute,
	type TCellCompute,
	type TCellPut,
	type TCellValue
} from './Cell';
export { release } from './release';
export { afterRelease } from './afterRelease';
export { effect, type IEffectOptions } from './effect';
export { reaction } from './reaction';
export { batch } from './batch';

export function cellx<Value, Context = any>(
	compute: TAsyncCellCompute<Value, Context>,
	options: IAsyncCellOptions<Value, Context>
): Cell<Value, Context>;
export function cellx<Value, Context = any>(
	compute: TCellCompute<Value, Context>,
	options?: ICellOptions<Value, Context>
): Cell<Value, Context>;
export function cellx<Value, Context = any>(
	value: Value,
	options?: ICellOptions<Value, Context>
): Cell<Value, Context>;
export function cellx<Value, Context = any>(
	valueOrCompute: Value | TAsyncCellCompute<Value, Context>,
	options?: TAnyCellOptions<Value, Context>
): Cell<Value, Context> {
	return new Cell<Value, Context>(
		valueOrCompute as Value | TCellCompute<Value, Context>,
		options as ICellOptions<Value, Context> | undefined
	);
}
