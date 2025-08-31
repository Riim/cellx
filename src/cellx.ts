import { Cell, type ICellOptions, type TCellPull } from './Cell';

export { KEY_VALUE_CELLS } from './keys';
export { configure } from './config';
export { type IEvent, type I$Listener, EventEmitter } from './EventEmitter';
export { autorun } from './autorun';
export { effect } from './effect';
export { release } from './release';
export { afterRelease } from './afterRelease';
export { transact } from './transact';
export { DependencyFilter, untracked, tracked } from './track';
export {
	type TCellPull,
	type ICellOptions,
	type ICellChangeEvent,
	type ICellErrorEvent,
	type TCellEvent,
	Cell
} from './Cell';
export { WaitError } from './WaitError';
export { defineObservableProperty, defineObservableProperties, define } from './define';

export function cellx<TValue = any, TContext = any, TMeta = any>(
	value: TCellPull<TValue, TContext, TMeta>,
	options?: ICellOptions<TValue, TContext, TMeta>
): Cell<TValue, TContext, TMeta>;
export function cellx<TValue = any, TContext = any, TMeta = any>(
	value: TValue,
	options?: ICellOptions<TValue, TContext, TMeta>
): Cell<TValue, TContext, TMeta>;
export function cellx<TValue = any, TContext = any, TMeta = any>(
	value: TValue | TCellPull<TValue, TContext, TMeta>,
	options?: ICellOptions<TValue, TContext, TMeta>
) {
	return new Cell<TValue, TContext, TMeta>(value as any, options);
}
