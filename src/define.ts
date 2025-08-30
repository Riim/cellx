import { Cell } from './Cell';
import { KEY_VALUE_CELLS } from './keys';

export function defineObservableProperty<T extends object = object>(
	obj: T,
	key: string,
	value: any
): T {
	((obj[KEY_VALUE_CELLS] as Map<string, Cell>) || (obj[KEY_VALUE_CELLS] = new Map())).set(
		key,
		value instanceof Cell ? value : new Cell(value, { context: obj })
	);

	Object.defineProperty(obj, key, {
		configurable: true,
		enumerable: true,

		get() {
			return (this[KEY_VALUE_CELLS] as Map<string, Cell>).get(key)!.get();
		},

		set(value) {
			(this[KEY_VALUE_CELLS] as Map<string, Cell>).get(key)!.set(value);
		}
	});

	return obj;
}

export function defineObservableProperties<T extends object = object>(
	obj: T,
	props: Record<string, any>
): T {
	for (let key of Object.keys(props)) {
		defineObservableProperty(obj, key, props[key]);
	}

	return obj;
}

export function define<T extends object = object>(obj: T, key: string, value: any): T;
export function define<T extends object = object>(obj: T, props: Record<string, any>): T;
export function define(obj: object, keyOrProps: string | Record<string, any>, value?: any) {
	if (typeof keyOrProps == 'object') {
		defineObservableProperties(obj, keyOrProps);
	} else {
		defineObservableProperty(obj, keyOrProps, value);
	}

	return obj;
}
