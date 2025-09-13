import { Cell } from './Cell';

export function defineObservableProperty<T extends object = object>(
	obj: T,
	key: string,
	value: any
) {
	let cell = new Cell({
		value,
		context: obj
	});

	Object.defineProperty(obj, key, {
		configurable: true,
		enumerable: true,

		get() {
			return cell.get();
		},

		set(value) {
			cell.set(value);
		}
	});

	return obj;
}

export function defineObservableProperties<T extends object = object>(
	obj: T,
	props: Record<string, any>
) {
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
