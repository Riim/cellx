import { is } from '@riim/is';
import { Map } from '@riim/map-set-polyfill';
import { mixin } from '@riim/mixin';
import { Symbol } from '@riim/symbol-polyfill';
import { EventEmitter } from '../EventEmitter';
import { FreezableCollection } from './FreezableCollection';

export type TObservableMapEntries<K, V> =
	| Array<[K, V]>
	| { [key: string]: V }
	| Map<K, V>
	| ObservableMap<K, V>;

export class ObservableMap<K = any, V = any> extends EventEmitter implements FreezableCollection {
	_entries = new Map<K, V>();

	get size(): number {
		return this._entries.size;
	}

	constructor(entries?: TObservableMapEntries<K, V> | null) {
		super();
		FreezableCollection.call(this);

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
					mapEntries.set(key as any, entries[key]);
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

			if (is(value, prev)) {
				return this;
			}

			this._throwIfFrozen();
		} else {
			this._throwIfFrozen();
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
			this._throwIfFrozen();

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
			this._throwIfFrozen();

			this._entries.clear();
			this.emit('change', { subtype: 'clear' });
		}

		return this;
	}

	forEach(callback: (value: V, key: K, map: this) => void, context?: any) {
		this._entries.forEach(function(value, key) {
			callback.call(context, value, key, this);
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

mixin(ObservableMap.prototype, FreezableCollection.prototype, ['constructor']);

ObservableMap.prototype[Symbol.iterator] = ObservableMap.prototype.entries;

declare module './ObservableMap' {
	/* tslint:disable-next-line */
	interface ObservableMap {
		_frozen: boolean;
		readonly frozen: boolean;
		freeze(): this;
		unfreeze(): this;
		_throwIfFrozen(msg?: string): void;
	}
}
