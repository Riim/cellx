import { Cell, type ICellOptions, type TCellPull } from './Cell';

export { configure } from './config';
export { type IEvent, type I$Listener, EventEmitter } from './EventEmitter';
export { autorun } from './autorun';
export { reaction } from './reaction';
export { release } from './release';
export { batch } from './batch';
export { afterRelease } from './afterRelease';
export { transaction } from './transaction';
export { DependencyFilter, untracked, tracked } from './track';
export {
	type CellValue,
	type ICellChangeEvent,
	type ICellErrorEvent,
	type TCellEvent,
	type TCellChangeEventListener,
	type TCellErrorEventListener,
	type TCellEventListener,
	type ICellListeners,
	type TCellPull,
	type TCellPut,
	type ICellOptions,
	CellState,
	Cell
} from './Cell';
export { WaitError } from './WaitError';
export { defineObservableProperty, defineObservableProperties, define } from './define';

export function observable<Value = any, Context = any, Meta = any>(
	value: Value,
	options?: Omit<ICellOptions<Value, Context, Meta>, 'pull' | 'value'>
): Cell<Value, Context, Meta> {
	return new Cell({
		...options,
		pull: undefined,
		value
	});
}

export function computed<Value = any, Context = any, Meta = any>(
	pullFn: TCellPull<Value, Context, Meta>,
	options?: ICellOptions<Value, Context, Meta>
): Cell<Value, Context, Meta> {
	return new Cell({
		...options,
		pull: pullFn
	});
}

export function cellx<Value = any, Context = any, Meta = any>(
	pullFn: TCellPull<Value, Context, Meta>,
	options?: ICellOptions<Value, Context, Meta>
): Cell<Value, Context, Meta>;
export function cellx<Value = any, Context = any, Meta = any>(
	value: Value,
	options?: ICellOptions<Value, Context, Meta>
): Cell<Value, Context, Meta>;
export function cellx<Value = any, Context = any, Meta = any>(
	valueOrPullFn: Value | TCellPull<Value, Context, Meta>,
	options?: ICellOptions<Value, Context, Meta>
) {
	return typeof valueOrPullFn == 'function'
		? computed(valueOrPullFn as any, options)
		: observable(valueOrPullFn, options);
}
