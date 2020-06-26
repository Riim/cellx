import { EventEmitter, TListener } from '../EventEmitter';

const hasOwn = Object.prototype.hasOwnProperty;

export type TObservableMapEntries<K, V> =
	| Array<[K, V]>
	| Record<string, V>
	| Map<K, V>
	| ObservableMap<K, V>;

export type TObservableMapValueEquals<V> = (a: V, b: V) => any;

export interface IObservableMapOptions<I> {
	valueEquals?: TObservableMapValueEquals<I>;
}

export class ObservableMap<K = any, V = any> extends EventEmitter {
	static EVENT_CHANGE = 'change';

	_entries = new Map<K, V>();

	get size() {
		return this._entries.size;
	}

	_valueEquals: TObservableMapValueEquals<V> | null;
	get valueEquals() {
		return this._valueEquals;
	}

	constructor(entries?: TObservableMapEntries<K, V> | null, options?: IObservableMapOptions<V>) {
		super();

		if (options && options.valueEquals) {
			this._valueEquals = options.valueEquals;
		}

		if (entries) {
			let mapEntries = this._entries;

			if (entries instanceof Map || entries instanceof ObservableMap) {
				for (let [key, value] of entries instanceof Map ? entries : entries._entries) {
					mapEntries.set(key, value);
				}
			} else if (Array.isArray(entries)) {
				for (let i = 0, l = entries.length; i < l; i++) {
					mapEntries.set(entries[i][0], entries[i][1]);
				}
			} else {
				for (let key in entries) {
					if (hasOwn.call(entries, key)) {
						mapEntries.set(key as any, entries[key]);
					}
				}
			}
		}
	}

	onChange(listener: TListener, context?: any) {
		return this.on(ObservableMap.EVENT_CHANGE, listener, context);
	}

	offChange(listener: TListener, context?: any) {
		return this.off(ObservableMap.EVENT_CHANGE, listener, context);
	}

	has(key: K) {
		return this._entries.has(key);
	}

	get(key: K) {
		return this._entries.get(key);
	}

	set(key: K, value: V) {
		let entries = this._entries;
		let hasKey = entries.has(key);
		let prev: V | undefined;

		if (hasKey) {
			prev = entries.get(key);

			if (Object.is(value, prev)) {
				return this;
			}
		}

		entries.set(key, value);
		this.emit(ObservableMap.EVENT_CHANGE, {
			subtype: hasKey ? 'update' : 'add',
			key,
			prevValue: prev,
			value
		});

		return this;
	}

	delete(key: K) {
		let entries = this._entries;

		if (entries.has(key)) {
			let value = entries.get(key);

			entries.delete(key);
			this.emit(ObservableMap.EVENT_CHANGE, {
				subtype: 'delete',
				key,
				value
			});

			return true;
		}

		return false;
	}

	clear() {
		if (this._entries.size) {
			this._entries.clear();
			this.emit(ObservableMap.EVENT_CHANGE, { subtype: 'clear' });
		}

		return this;
	}

	equals(that: any) {
		if (!(that instanceof ObservableMap)) {
			return false;
		}

		if (this.size != that.size) {
			return false;
		}

		for (let [key, value] of this) {
			if (!that.has(key)) {
				return false;
			}

			let thatValue = that.get(key);

			if (
				this._valueEquals || that._valueEquals
					? !(this._valueEquals || that._valueEquals)!(value, thatValue)
					: value !== thatValue &&
					  !(
							value &&
							thatValue &&
							typeof value == 'object' &&
							typeof thatValue == 'object' &&
							((value as any) as ObservableMap).equals &&
							((value as any) as ObservableMap).equals ===
								(thatValue as ObservableMap).equals &&
							((value as any) as ObservableMap).equals(thatValue)
					  )
			) {
				return false;
			}
		}

		return true;
	}

	forEach(cb: (value: V, key: K, map: this) => void, context?: any) {
		for (let [key, value] of this._entries) {
			cb.call(context, value, key, this);
		}
	}

	keys() {
		return this._entries.keys();
	}

	values() {
		return this._entries.values();
	}

	entries() {
		return this._entries.entries();
	}

	clone(deep = false): ObservableMap<K, V> {
		let entries: Array<[K, V]> | undefined;

		if (deep) {
			entries = [];

			for (let [key, value] of this._entries) {
				entries!.push([
					key,
					value && typeof value == 'object' && (value as any).clone
						? (value as any).clone(true)
						: value
				]);
			}
		}

		return new (this.constructor as typeof ObservableMap)(entries || this);
	}

	absorbFrom(that: any) {
		if (!(that instanceof ObservableMap)) {
			throw TypeError('"that" must be instance of ObservableMap');
		}

		let entries = this._entries;
		let changed = false;

		for (let [key, value] of entries as Map<any, any>) {
			if (that.has(key)) {
				let thatValue = that.get(key);

				if (
					this._valueEquals || that._valueEquals
						? !(this._valueEquals || that._valueEquals)!(value, thatValue)
						: value !== thatValue &&
						  !(
								value &&
								thatValue &&
								typeof value == 'object' &&
								typeof thatValue == 'object' &&
								(value as ObservableMap).equals &&
								(value as ObservableMap).equals ===
									(thatValue as ObservableMap).equals &&
								(value as ObservableMap).equals(thatValue)
						  )
				) {
					if (
						value &&
						thatValue &&
						typeof value == 'object' &&
						typeof thatValue == 'object' &&
						((value as any) as ObservableMap).absorbFrom &&
						((value as any) as ObservableMap).absorbFrom ===
							(thatValue as ObservableMap).absorbFrom
					) {
						if (((value as any) as ObservableMap).absorbFrom(thatValue)) {
							changed = true;
						}
					} else {
						entries.set(key, thatValue);
						changed = true;
					}
				}
			} else {
				entries.delete(key);
				changed = true;
			}
		}

		for (let [key, value] of that) {
			if (!entries.has(key)) {
				entries.set(key, value);
				changed = true;
			}
		}

		if (changed) {
			this.emit(ObservableMap.EVENT_CHANGE, { subtype: 'absorbFrom' });
		}

		return changed;
	}

	toData<I = any>() {
		let data: Record<string, I> = {};

		for (let [key, value] of this._entries) {
			data[key as any] =
				value && typeof value == 'object' && (value as any).toData
					? (value as any).toData()
					: value;
		}

		return data;
	}

	declare [Symbol.iterator]: () => Iterator<[K, V]>;
}

ObservableMap.prototype[Symbol.iterator] = ObservableMap.prototype.entries;
