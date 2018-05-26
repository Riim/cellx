import { is } from '@riim/is';
import { mixin } from '@riim/mixin';
import { Symbol } from '@riim/symbol-polyfill';
import { EventEmitter, IEvent } from '../EventEmitter';
import { FreezableCollection } from './FreezableCollection';
import { ObservableCollection } from './ObservableCollection';

const splice = Array.prototype.splice;

export type TComparator<T> = (a: T, b: T) => number;

export type TObservableListItems<T> = Array<T> | ObservableList<T>;

export interface IObservableListOptions<T> {
	adoptsValueChanges?: boolean;
	comparator?: TComparator<T>;
	sorted?: boolean;
}

function defaultComparator(a: any, b: any): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

export class ObservableList<T = any> extends EventEmitter
	implements FreezableCollection, ObservableCollection<T> {
	_items: Array<T> = [];

	_length = 0;
	get length(): number {
		return this._length;
	}

	_comparator: TComparator<T> | null;
	_sorted: boolean;

	constructor(
		items?: TObservableListItems<T> | null,
		opts?: IObservableListOptions<T> | boolean
	) {
		super();
		FreezableCollection.call(this);
		ObservableCollection.call(this);

		if (typeof opts == 'boolean') {
			opts = { adoptsValueChanges: opts };
		}

		this._adoptsValueChanges = !!(opts && opts.adoptsValueChanges);

		if (opts && (opts.sorted || (opts.comparator && opts.sorted !== false))) {
			this._comparator = opts.comparator || defaultComparator;
			this._sorted = true;
		} else {
			this._comparator = null;
			this._sorted = false;
		}

		if (items) {
			this._addRange(items);
		}
	}

	_validateIndex(index: number | undefined, allowEndIndex?: boolean): number | undefined {
		if (index === undefined) {
			return index;
		}

		if (index < 0) {
			index += this._length;

			if (index < 0) {
				throw new RangeError('Index out of valid range');
			}
		} else if (index > this._length - (allowEndIndex ? 0 : 1)) {
			throw new RangeError('Index out of valid range');
		}

		return index;
	}

	contains(value: T): boolean {
		return this._valueCounts.has(value);
	}

	indexOf(value: T, fromIndex?: number): number {
		return this._items.indexOf(value, this._validateIndex(fromIndex, true));
	}

	lastIndexOf(value: T, fromIndex?: number): number {
		return this._items.lastIndexOf(
			value,
			fromIndex === undefined ? -1 : this._validateIndex(fromIndex, true)
		);
	}

	get(index: number): T | undefined {
		return this._items[this._validateIndex(index, true)!];
	}

	getRange(index: number, count?: number): Array<T> {
		index = this._validateIndex(index, true)!;

		let items = this._items;

		if (count === undefined) {
			return items.slice(index);
		}

		if (index + count > items.length) {
			throw new RangeError('Sum of "index" and "count" out of valid range');
		}

		return items.slice(index, index + count);
	}

	set(index: number, value: T): this {
		if (this._sorted) {
			throw new TypeError('Cannot set to sorted list');
		}

		index = this._validateIndex(index, true)!;

		let items = this._items;

		if (is(value, items[index])) {
			return this;
		}

		this._throwIfFrozen();

		this._unregisterValue(items[index]);
		items[index] = this._registerValue(value);

		this.emit('change');

		return this;
	}

	setRange(index: number, values: TObservableListItems<T>): this {
		if (this._sorted) {
			throw new TypeError('Cannot set to sorted list');
		}

		index = this._validateIndex(index, true)!;

		let valueCount = values.length;

		if (!valueCount) {
			return this;
		}

		if (index + valueCount > this._length) {
			throw new RangeError('Sum of "index" and "values.length" out of valid range');
		}

		if (values instanceof ObservableList) {
			values = values._items.slice();
		}

		let items = this._items;
		let changed = false;

		for (let i = index + valueCount; i > index; ) {
			let value = values[--i - index];

			if (!is(value, items[i])) {
				if (!changed) {
					this._throwIfFrozen();
				}

				this._unregisterValue(items[i]);
				items[i] = this._registerValue(value);

				changed = true;
			}
		}

		if (changed) {
			this.emit('change');
		}

		return this;
	}

	add(value: T): this {
		this._throwIfFrozen();

		if (this._sorted) {
			this._insertSortedValue(value);
		} else {
			this._items.push(this._registerValue(value));
		}

		this._length++;

		this.emit('change');

		return this;
	}

	addRange(values: TObservableListItems<T>): this {
		if (values.length) {
			this._throwIfFrozen();

			this._addRange(values);
			this.emit('change');
		}

		return this;
	}

	_addRange(values: TObservableListItems<T>) {
		if (values instanceof ObservableList) {
			values = values._items.slice();
		}

		let valueCount = values.length;

		if (this._sorted) {
			for (let i = 0; i < valueCount; i++) {
				this._insertSortedValue(values[i]);
			}
		} else {
			let items = this._items;
			let itemCount = items.length;

			for (let i = itemCount + valueCount; i > itemCount; ) {
				items[--i] = this._registerValue(values[i - itemCount]);
			}
		}

		this._length += valueCount;
	}

	insert(index: number, value: T): this {
		if (this._sorted) {
			throw new TypeError('Cannot insert to sorted list');
		}

		index = this._validateIndex(index, true)!;

		this._throwIfFrozen();

		this._items.splice(index, 0, this._registerValue(value));
		this._length++;

		this.emit('change');

		return this;
	}

	insertRange(index: number, values: TObservableListItems<T>): this {
		if (this._sorted) {
			throw new TypeError('Cannot insert to sorted list');
		}

		index = this._validateIndex(index, true)!;

		let valueCount = values.length;

		if (!valueCount) {
			return this;
		}

		this._throwIfFrozen();

		if (values instanceof ObservableList) {
			values = values._items;
		}

		for (let i = valueCount; i; ) {
			this._registerValue(values[--i]);
		}

		splice.apply(this._items, ([index, 0] as any).concat(values));
		this._length += valueCount;

		this.emit('change');

		return this;
	}

	remove(value: T, fromIndex?: number): boolean {
		let index = this._items.indexOf(value, this._validateIndex(fromIndex, true));

		if (index == -1) {
			return false;
		}

		this._throwIfFrozen();

		this._unregisterValue(value);
		this._items.splice(index, 1);
		this._length--;

		this.emit('change');

		return true;
	}

	removeAll(value: T, fromIndex?: number): boolean {
		let index = this._validateIndex(fromIndex, true);
		let items = this._items;
		let changed = false;

		while ((index = items.indexOf(value, index)) != -1) {
			if (!changed) {
				this._throwIfFrozen();
			}

			this._unregisterValue(value);
			items.splice(index, 1);

			changed = true;
		}

		if (changed) {
			this._length = items.length;
			this.emit('change');
		}

		return changed;
	}

	removeEach(values: TObservableListItems<T>, fromIndex?: number): boolean {
		fromIndex = this._validateIndex(fromIndex, true);

		if (values instanceof ObservableList) {
			values = values._items.slice();
		}

		let items = this._items;
		let changed = false;

		for (let i = 0, l = values.length; i < l; i++) {
			let value = values[i];
			let index = items.indexOf(value, fromIndex);

			if (index != -1) {
				if (!changed) {
					this._throwIfFrozen();
				}

				this._unregisterValue(value);
				items.splice(index, 1);

				changed = true;
			}
		}

		if (changed) {
			this._length = items.length;
			this.emit('change');
		}

		return changed;
	}

	removeAllEach(values: TObservableListItems<T>, fromIndex?: number): boolean {
		fromIndex = this._validateIndex(fromIndex, true);

		if (values instanceof ObservableList) {
			values = values._items.slice();
		}

		let items = this._items;
		let changed = false;

		for (let i = 0, l = values.length; i < l; i++) {
			let value = values[i];

			for (let index = fromIndex; (index = items.indexOf(value, index)) != -1; ) {
				if (!changed) {
					this._throwIfFrozen();
				}

				this._unregisterValue(value);
				items.splice(index, 1);

				changed = true;
			}
		}

		if (changed) {
			this._length = items.length;
			this.emit('change');
		}

		return changed;
	}

	removeAt(index: number): T {
		index = this._validateIndex(index)!;

		this._throwIfFrozen();

		let value = this._items.splice(index, 1)[0];

		this._unregisterValue(value);
		this._length--;

		this.emit('change');

		return value;
	}

	removeRange(index: number, count?: number): Array<T> {
		index = this._validateIndex(index, true)!;

		let items = this._items;

		if (count === undefined) {
			count = items.length - index;
		} else if (index + count > items.length) {
			throw new RangeError('"index" and "count" out of valid range');
		}

		if (!count) {
			return [];
		}

		this._throwIfFrozen();

		for (let i = index + count; i > index; ) {
			this._unregisterValue(items[--i]);
		}
		let values = items.splice(index, count);
		this._length -= count;

		this.emit('change');

		return values;
	}

	clear(): this {
		if (!this._length) {
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

		this._valueCounts.clear();
		this._items.length = 0;
		this._length = 0;

		this.emit('change', { subtype: 'clear' });

		return this;
	}

	join(separator?: string): string {
		return this._items.join(separator);
	}

	find(callback: (item: T, index: number, list: this) => any, context?: any): T | undefined {
		let items = this._items;

		for (let i = 0, l = items.length; i < l; i++) {
			let item = items[i];

			if (callback.call(context, item, i, this)) {
				return item;
			}
		}

		return;
	}

	findIndex(callback: (item: T, index: number, list: this) => any, context?: any): number {
		let items = this._items;

		for (let i = 0, l = items.length; i < l; i++) {
			if (callback.call(context, items[i], i, this)) {
				return i;
			}
		}

		return -1;
	}

	clone(deep?: boolean): ObservableList<T> {
		return new (this.constructor as typeof ObservableList)(
			deep
				? this._items.map(item => ((item as any).clone ? (item as any).clone() : item))
				: this,
			{
				adoptsValueChanges: this._adoptsValueChanges,
				comparator: this._comparator || undefined,
				sorted: this._sorted
			}
		);
	}

	toArray(): Array<T> {
		return this._items.slice();
	}

	toString(): string {
		return this._items.join();
	}

	_insertSortedValue(value: T) {
		let items = this._items;
		let comparator = this._comparator!;
		let low = 0;
		let high = items.length;

		while (low != high) {
			let mid = (low + high) >> 1;

			if (comparator(value, items[mid]) < 0) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}

		items.splice(low, 0, this._registerValue(value));
	}

	// FreezableCollection
	_frozen: boolean;
	get frozen(): boolean {
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

mixin(ObservableList.prototype, FreezableCollection.prototype, ['constructor']);
mixin(ObservableList.prototype, ObservableCollection.prototype, ['constructor']);

['forEach', 'map', 'filter', 'every', 'some'].forEach(name => {
	ObservableList.prototype[name] = function(callback: Function, context?: any) {
		return this._items[name](function(item: any, index: number): any {
			return callback.call(context, item, index, this);
		}, this);
	};
});

['reduce', 'reduceRight'].forEach(name => {
	ObservableList.prototype[name] = function(callback: Function, initialValue?: any): any {
		let list = this;

		function wrapper(accumulator: any, item: any, index: number): any {
			return callback(accumulator, item, index, list);
		}

		return arguments.length >= 2
			? this._items[name](wrapper, initialValue)
			: this._items[name](wrapper);
	};
});

[
	['keys', (index: number): number => index],
	['values', (index: number, item: any): any => item],
	['entries', (index: number, item: any): [number, any] => [index, item]]
].forEach((settings: [string, (index: number, item: any) => any]) => {
	let getStepValue = settings[1];

	ObservableList.prototype[settings[0]] = function() {
		let items = this._items;
		let index = 0;
		let done = false;

		return {
			next() {
				if (!done) {
					if (index < items.length) {
						return {
							value: getStepValue(index, items[index++]),
							done: false
						};
					}

					done = true;
				}

				return {
					value: undefined,
					done: true
				};
			}
		};
	};
});

declare module '../collections/ObservableList' {
	/* tslint:disable-next-line */
	interface ObservableList<T = any> {
		forEach(callback: (item: T, index: number, list: this) => void, context?: any): void;

		map<R>(callback: (item: T, index: number, list: this) => R, context?: any): Array<R>;

		filter<R extends T>(
			callback: (item: T, index: number, list: this) => item is R,
			context?: any
		): Array<R>;
		filter(callback: (item: T, index: number, list: this) => any, context?: any): Array<T>;

		every(callback: (item: T, index: number, list: this) => any, context?: any): boolean;

		some(callback: (item: T, index: number, list: this) => any, context?: any): boolean;

		reduce<R = T>(
			callback: (accumulator: R, item: T, index: number, list: this) => R,
			initialValue?: R
		): R;

		reduceRight<R = T>(
			callback: (accumulator: R, item: T, index: number, list: this) => R,
			initialValue?: R
		): R;

		keys(): Iterator<number>;

		values(): Iterator<T>;

		entries(): Iterator<[number, T]>;
	}
}

ObservableList.prototype[Symbol.iterator] = ObservableList.prototype.values;
