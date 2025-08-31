import { Cell } from './Cell';
import { IEvent } from './EventEmitter';

export function effect<TValue, TContext>(
	cell: Cell<TValue, TContext>,
	fn: (evt: IEvent, disposer: () => void) => any,
	context?: TContext
) {
	let disposer: () => void;
	let listener = function (this: TContext, evt: IEvent) {
		return fn.call(this, evt, disposer);
	};

	disposer = () => {
		cell.offChange(listener, context);
	};

	cell.onChange(listener, context);

	return disposer;
}
