import { EventEmitter } from '../EventEmitter';

export function isEventEmitterLike(value: any): value is EventEmitter {
	return (
		!!value &&
		typeof value['on'] == 'function' &&
		typeof value['off'] == 'function' &&
		typeof value['emit'] == 'function'
	);
}
