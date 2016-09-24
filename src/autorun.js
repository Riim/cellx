import Cell from './Cell';
import noop from './Utils/noop';

/**
 * @typesign (cb: (), context?) -> ();
 */
export default function autorun(cb, context) {
	var cell = new Cell(function() {
		cb.call(context);
	}, { onChange: noop });

	return function disposer() {
		cell.dispose();
	};
}
