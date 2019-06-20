import { EventEmitter } from '../EventEmitter';

const hasOwn = Object.prototype.hasOwnProperty;

export type TObservableMapEntries<K, V> =
	| Array<[K, V]>
	| Record<string, V>
	| Map<K, V>
	| ObservableMap<K, V>;

export class ObservableMap<K = any, V = any> extends EventEmitter {
	_entries = new Map<K, V>();

	get size(): number {
		return this._entries.size;
	}

	constructor(entries?: TObservableMapEntries<K, V> | null) {
		super();

		if (entries) {
			let mapEntries = this._entries;

			if (entries instanceof Map || entries instanceof ObservableMap) {
				(entries instanceof Map ? entries : entries._entries).forEach((value, key) => {
					mapEntries.set(key, value);
				});
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

	has(key: K): boolean {
		return this._entries.has(key);
	}

	get(key: K): V | undefined {
		return this._entries.get(key);
	}

	set(key: K, value: V): this {
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
		this.emit('change', {
			subtype: hasKey ? 'update' : 'add',
			key,
			prevValue: prev,
			value
		});

		return this;
	}

	delete(key: K): boolean {
		let entries = this._entries;

		if (entries.has(key)) {
			let value = entries.get(key);

			entries.delete(key);
			this.emit('change', {
				subtype: 'delete',
				key,
				value
			});

			return true;
		}

		return false;
	}

	clear(): this {
		if (this._entries.size) {
			this._entries.clear();
			this.emit('change', { subtype: 'clear' });
		}

		return this;
	}

	forEach(cb: (value: V, key: K, map: this) => void, context?: any) {
		this._entries.forEach(function(value, key) {
			cb.call(context, value, key, this);
		}, this);
	}

	keys(): Iterator<K> {
		return this._entries.keys();
	}

	values(): Iterator<V> {
		return this._entries.values();
	}

	entries(): Iterator<[K, V]> {
		return this._entries.entries();
	}

	clone(deep?: boolean): ObservableMap<K, V> {
		let entries: Array<[K, V]> | undefined;

		if (deep) {
			entries = [];

			this._entries.forEach((value, key) => {
				entries!.push([
					key,
					value && (value as any).clone ? (value as any).clone(true) : value
				]);
			});
		}

		return new (this.constructor as typeof ObservableMap)(entries || this);
	}
}

ObservableMap.prototype[Symbol.iterator] = ObservableMap.prototype.entries;
