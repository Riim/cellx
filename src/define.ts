import { Cell } from './Cell';

export function defineObservableProperty<T extends object = object>(
	obj: T,
	key: keyof T,
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
	props: Record<keyof T, any>
) {
	for (let key of Object.keys(props)) {
		defineObservableProperty(obj, key as keyof T, props[key]);
	}

	return obj;
}

export function define<T extends object = object>(obj: T, key: keyof T, value: any): T;
export function define<T extends object = object>(obj: T, props: Record<keyof T, any>): T;
export function define<T extends object>(
	obj: T,
	keyOrProps: keyof T | Record<keyof T, any>,
	value?: any
) {
	if (typeof keyOrProps == 'object') {
		defineObservableProperties(obj, keyOrProps);
	} else {
		defineObservableProperty(obj, keyOrProps, value);
	}

	return obj;
}
