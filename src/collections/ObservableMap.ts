import { is } from '@riim/is';
import { Map } from '@riim/map-set-polyfill';
import { mixin } from '@riim/mixin';
import { Symbol } from '@riim/symbol-polyfill';
import { EventEmitter, IEvent } from '../EventEmitter';
import { FreezableCollection } from './FreezableCollection';
import { ObservableCollection } from './ObservableCollection';

export type TObservableMapEntries<K, V> =
	| Array<[K, V]>
	| { [key: string]: V }
	| Map<K, V>
	| ObservableMap<K, V>;

export interface IObservableMapOptions {
	adoptsValueChanges?: boolean;
}

export class ObservableMap<K = any, V = any> extends EventEmitter
	implements FreezableCollection, ObservableCollection<V> {
	_entries = new Map<K, V>();

	_size: number;
	get size(): number {
		return this._size;
	}

	constructor(
		entries?: TObservableMapEntries<K, V> | null,
		opts?: IObservableMapOptions | boolean
	) {
		super();
		FreezableCollection.call(this);
		ObservableCollection.call(this);

		if (typeof opts == 'boolean') {
			opts = { adoptsValueChanges: opts };
		}

		this._adoptsValueChanges = !!(opts && opts.adoptsValueChanges);

		if (entries) {
			let mapEntries = this._entries;

			if (entries instanceof Map || entries instanceof ObservableMap) {
				(entries instanceof Map ? entries : entries._entries).forEach(function(value, key) {
					mapEntries.set(key, this._registerValue(value));
				}, this);
			} else if (Array.isArray(entries)) {
				for (let i = 0, l = entries.length; i < l; i++) {
					mapEntries.set(entries[i][0], this._registerValue(entries[i][1]));
				}
			} else {
				for (let key in entries) {
					mapEntries.set(key as any, this._registerValue(entries[key]));
				}
			}

			this._size = mapEntries.size;
		} else {
			this._size = 0;
		}
	}

	has(key: K): boolean {
		return this._entries.has(key);
	}

	contains(value: V): boolean {
		return this._valueCounts.has(value);
	}

	get(key: K): V | undefined {
		return this._entries.get(key);
	}

	set(key: K, value: V): this {
		let entries = this._entries;
		let hasKey = entries.has(key);
		let prev: V | undefined;

		if (hasKey) {
			prev = entries.get(key)!;

			if (is(value, prev)) {
				return this;
			}

			this._throwIfFrozen();

			this._unregisterValue(prev);
		} else {
			this._throwIfFrozen();
		}

		entries.set(key, this._registerValue(value));

		if (!hasKey) {
			this._size++;
		}

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

		if (!entries.has(key)) {
			return false;
		}

		this._throwIfFrozen();

		let value = entries.get(key);

		this._unregisterValue(value);
		entries.delete(key);
		this._size--;

		this.emit('change', {
			subtype: 'delete',
			key,
			value
		});

		return true;
	}

	clear(): this {
		if (!this._size) {
			return this;
		}

		this._throwIfFrozen();

		if (this._adoptsValueChanges) {
			this._valueCounts.forEach(function(valueCount, value) {
				if (value instanceof EventEmitter) {
					value.off('change', this._onItemChange, this);
				}
			}, this);
		}

		this._entries.clear();
		this._valueCounts.clear();

		this._size = 0;

		this.emit('change', {
			subtype: 'clear'
		});

		return this;
	}

	forEach(callback: (value: V, key: K, map: this) => void, context?: any) {
		this._entries.forEach(function(value, key) {
			callback.call(context, value, key, this);
		}, this);
	}

	keys(): IterableIterator<K> {
		return this._entries.keys();
	}

	values(): IterableIterator<V> {
		return this._entries.values();
	}

	entries(): IterableIterator<[K, V]> {
		return this._entries.entries();
	}

	clone(deep?: boolean): ObservableMap<K, V> {
		let entries: Array<[K, V]> | undefined;

		if (deep) {
			entries = [];

			this._entries.forEach((value, key) => {
				entries!.push([key, (value as any).clone ? (value as any).clone() : value]);
			});
		}

		return new (this.constructor as typeof ObservableMap)(
			entries || this,
			this._adoptsValueChanges
		);
	}

	// FreezableCollection
	_isFrozen: boolean;
	get isFrozen(): boolean {
		return false;
	}
	freeze(): this {
		return this;
	}
	unfreeze(): this {
		return this;
	}
	_throwIfFrozen(msg?: string) {}

	// ObservableCollection
	_adoptsValueChanges: boolean;
	get adoptsValueChanges(): boolean {
		return false;
	}
	_valueCounts: Map<any, number>;
	_onItemChange(evt: IEvent) {}
	_registerValue(value: any): any {}
	_unregisterValue(value: any) {}
}

mixin(ObservableMap.prototype, FreezableCollection.prototype, ['constructor']);
mixin(ObservableMap.prototype, ObservableCollection.prototype, ['constructor']);

(ObservableMap.prototype as any)[Symbol.iterator] = ObservableMap.prototype.entries;
