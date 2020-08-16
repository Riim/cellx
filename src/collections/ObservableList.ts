import { EventEmitter, TListener } from '../EventEmitter';

const push = Array.prototype.push;
const splice = Array.prototype.splice;

export type TObservableListItems<I> = Array<I> | ObservableList<I>;

export type TObservableListItemEquals<I> = (a: I, b: I) => any;
export type TObservableListItemComparator<I> = (a: I, b: I) => number;

export interface IObservableListOptions<I> {
	itemEquals?: TObservableListItemEquals<I>;
	itemComparator?: TObservableListItemComparator<I>;
	sorted?: boolean;
}

const defaultItemComparator: TObservableListItemComparator<any> = (a, b) => {
	return a < b ? -1 : a > b ? 1 : 0;
};

export class ObservableList<T = any> extends EventEmitter {
	static EVENT_CHANGE = 'change';

	_items: Array<T> = [];

	get length() {
		return this._items.length;
	}
	set length(value: number) {
		if (this._items.length != value) {
			if (value > this._items.length) {
				throw RangeError('Length out of valid range');
			}

			this.emit(ObservableList.EVENT_CHANGE);
			this._items.length = value;
		}
	}

	_itemEquals: TObservableListItemEquals<T> | null;
	get itemEquals() {
		return this._itemEquals;
	}

	_itemComparator: TObservableListItemComparator<T> | null;
	get itemComparator() {
		return this._itemComparator;
	}

	_sorted: boolean;
	get sorted() {
		return this._sorted;
	}

	constructor(items?: TObservableListItems<T> | null, options?: IObservableListOptions<T>) {
		super();

		if (options) {
			if (options.itemEquals) {
				this._itemEquals = options.itemEquals;
			}

			if ((options.itemComparator && options.sorted !== false) || options.sorted) {
				this._itemComparator = options.itemComparator || defaultItemComparator;
				this._sorted = true;
			} else {
				this._itemComparator = null;
				this._sorted = false;
			}
		}

		if (items) {
			if (this._sorted) {
				if (items instanceof ObservableList) {
					items = items._items;
				}

				for (let i = 0, l = items.length; i < l; i++) {
					this._insertSortedValue(items[i]);
				}
			} else {
				push.apply(this._items, items instanceof ObservableList ? items._items : items);
			}
		}
	}

	onChange(listener: TListener, context?: any) {
		return this.on(ObservableList.EVENT_CHANGE, listener, context);
	}

	offChange(listener: TListener, context?: any) {
		return this.off(ObservableList.EVENT_CHANGE, listener, context);
	}

	_validateIndex(index: number | undefined, allowEndIndex = false) {
		if (index === undefined) {
			return index;
		}

		if (index < 0) {
			index += this._items.length;

			if (index < 0) {
				throw RangeError('Index out of valid range');
			}
		} else if (index > this._items.length - (allowEndIndex ? 0 : 1)) {
			throw RangeError('Index out of valid range');
		}

		return index;
	}

	contains(item: T) {
		return this._items.indexOf(item) != -1;
	}

	indexOf(item: T, fromIndex?: number) {
		return this._items.indexOf(item, this._validateIndex(fromIndex, true));
	}

	lastIndexOf(item: T, fromIndex?: number) {
		return this._items.lastIndexOf(
			item,
			fromIndex === undefined ? -1 : this._validateIndex(fromIndex, true)
		);
	}

	get(index: number): T | undefined {
		return this._items[this._validateIndex(index, true)!];
	}

	getRange(index: number, count?: number) {
		index = this._validateIndex(index, true)!;

		if (count === undefined) {
			return this._items.slice(index);
		}

		if (index + count > this._items.length) {
			throw RangeError('Sum of "index" and "count" out of valid range');
		}

		return this._items.slice(index, index + count);
	}

	set(index: number, item: T) {
		if (this._sorted) {
			throw TypeError('Cannot set to sorted list');
		}

		index = this._validateIndex(index, true)!;

		if (!Object.is(item, this._items[index])) {
			this._items[index] = item;
			this.emit(ObservableList.EVENT_CHANGE);
		}

		return this;
	}

	setRange(index: number, items: TObservableListItems<T>) {
		if (this._sorted) {
			throw TypeError('Cannot set to sorted list');
		}

		index = this._validateIndex(index, true)!;

		if (items instanceof ObservableList) {
			items = items._items;
		}

		let itemCount = items.length;

		if (!itemCount) {
			return this;
		}

		let listItems = this._items;

		if (index + itemCount > listItems.length) {
			throw RangeError('Sum of "index" and "items.length" out of valid range');
		}

		let changed = false;

		for (let i = index + itemCount; i > index; ) {
			let item = items[--i - index];

			if (!Object.is(item, listItems[i])) {
				listItems[i] = item;
				changed = true;
			}
		}

		if (changed) {
			this.emit(ObservableList.EVENT_CHANGE);
		}

		return this;
	}

	add(item: T, unique = false) {
		if (unique && this._items.indexOf(item) != -1) {
			return this;
		}

		if (this._sorted) {
			this._insertSortedValue(item);
		} else {
			this._items.push(item);
		}

		this.emit(ObservableList.EVENT_CHANGE);

		return this;
	}

	addRange(items: TObservableListItems<T>, uniques = false) {
		if (items instanceof ObservableList) {
			items = items._items;
		}

		if (items.length) {
			if (uniques) {
				let listItems = this._items;
				let sorted = this._sorted;
				let changed = false;

				for (let item of items) {
					if (listItems.indexOf(item) == -1) {
						if (sorted) {
							this._insertSortedValue(item);
						} else {
							listItems.push(item);
						}

						changed = true;
					}
				}

				if (changed) {
					this.emit(ObservableList.EVENT_CHANGE);
				}
			} else {
				if (this._sorted) {
					for (let i = 0, l = items.length; i < l; i++) {
						this._insertSortedValue(items[i]);
					}
				} else {
					push.apply(this._items, items);
				}

				this.emit(ObservableList.EVENT_CHANGE);
			}
		}

		return this;
	}

	insert(index: number, item: T) {
		if (this._sorted) {
			throw TypeError('Cannot insert to sorted list');
		}

		this._items.splice(this._validateIndex(index, true)!, 0, item);
		this.emit(ObservableList.EVENT_CHANGE);

		return this;
	}

	insertRange(index: number, items: TObservableListItems<T>) {
		if (this._sorted) {
			throw TypeError('Cannot insert to sorted list');
		}

		index = this._validateIndex(index, true)!;

		if (items instanceof ObservableList) {
			items = items._items;
		}

		if (items.length) {
			splice.apply(this._items, ([index, 0] as Array<any>).concat(items));
			this.emit(ObservableList.EVENT_CHANGE);
		}

		return this;
	}

	remove(item: T, fromIndex?: number) {
		let index = this._items.indexOf(item, this._validateIndex(fromIndex, true));

		if (index == -1) {
			return false;
		}

		this._items.splice(index, 1);
		this.emit(ObservableList.EVENT_CHANGE);

		return true;
	}

	removeAll(item: T, fromIndex?: number) {
		let index = this._validateIndex(fromIndex, true);
		let items = this._items;
		let changed = false;

		while ((index = items.indexOf(item, index)) != -1) {
			items.splice(index, 1);
			changed = true;
		}

		if (changed) {
			this.emit(ObservableList.EVENT_CHANGE);
		}

		return changed;
	}

	removeAt(index: number) {
		let item = this._items.splice(this._validateIndex(index)!, 1)[0];
		this.emit(ObservableList.EVENT_CHANGE);

		return item;
	}

	removeRange(index: number, count?: number) {
		index = this._validateIndex(index, true)!;

		if (count === undefined) {
			count = this._items.length - index;

			if (!count) {
				return [];
			}
		} else {
			if (!count) {
				return [];
			}

			if (index + count > this._items.length) {
				throw RangeError('Sum of "index" and "count" out of valid range');
			}
		}

		let removedItems = this._items.splice(index, count);
		this.emit(ObservableList.EVENT_CHANGE);

		return removedItems;
	}

	replace(oldItem: T, newItem: T, fromIndex?: number) {
		if (this._sorted) {
			throw TypeError('Cannot replace in sorted list');
		}

		let index = this._items.indexOf(oldItem, this._validateIndex(fromIndex, true));

		if (index == -1) {
			return false;
		}

		this._items[index] = newItem;
		this.emit(ObservableList.EVENT_CHANGE);

		return true;
	}

	replaceAll(oldItem: T, newItem: T, fromIndex?: number) {
		if (this._sorted) {
			throw TypeError('Cannot replace in sorted list');
		}

		let index = this._validateIndex(fromIndex, true);
		let items = this._items;
		let changed = false;

		while ((index = items.indexOf(oldItem, index)) != -1) {
			items[index] = newItem;
			changed = true;
		}

		if (changed) {
			this.emit(ObservableList.EVENT_CHANGE);
		}

		return changed;
	}

	clear() {
		if (this._items.length) {
			this._items.length = 0;
			this.emit(ObservableList.EVENT_CHANGE);
		}

		return this;
	}

	equals(that: any) {
		if (!(that instanceof ObservableList)) {
			return false;
		}

		let items = this._items;
		let thatItems = that._items;

		if (items.length != thatItems.length) {
			return false;
		}

		for (let i = items.length; i; ) {
			let item: any = items[--i];
			let thatItem = thatItems[i];

			if (
				this._itemEquals || that._itemEquals
					? !(this._itemEquals || that._itemEquals)!(item, thatItem)
					: item !== thatItem &&
					  !(
							item &&
							typeof item == 'object' &&
							(item as ObservableList).equals &&
							(item as ObservableList).equals(thatItem)
					  )
			) {
				return false;
			}
		}

		return true;
	}

	join(separator?: string) {
		return this._items.join(separator);
	}

	find(cb: (item: T, index: number, list: this) => any, fromIndex?: number) {
		let foundIndex = this.findIndex(cb, fromIndex);
		return foundIndex == -1 ? undefined : this._items[foundIndex];
	}

	findLast(cb: (item: T, index: number, list: this) => any, fromIndex?: number) {
		let foundIndex = this.findLastIndex(cb, fromIndex);
		return foundIndex == -1 ? undefined : this._items[foundIndex];
	}

	findIndex(cb: (item: T, index: number, list: this) => any, fromIndex = 0) {
		let items = this._items;

		for (let i = this._validateIndex(fromIndex, true)!, l = items.length; i < l; i++) {
			if (cb.call(context, items[i], i, this)) {
				return i;
			}
		}

		return -1;
	}

	findLastIndex(cb: (item: T, index: number, list: this) => any, fromIndex?: number) {
		let items = this._items;
		let index =
			fromIndex === undefined ? items.length - 1 : this._validateIndex(fromIndex, true)!;

		if (index >= 0) {
			for (; ; index--) {
				if (cb.call(context, items[index], index, this)) {
					return index;
				}

				if (!index) {
					break;
				}
			}
		}

		return -1;
	}

	clone(deep = false): ObservableList<T> {
		return new (this.constructor as typeof ObservableList)(
			deep
				? this._items.map((item) =>
						item && typeof item == 'object' && (item as any).clone
							? (item as any).clone(true)
							: item
				  )
				: this,
			{
				itemComparator: this._itemComparator || undefined,
				sorted: this._sorted
			}
		);
	}

	absorbFrom(that: ObservableList) {
		if (!(that instanceof ObservableList)) {
			throw TypeError('"that" must be instance of ObservableList');
		}

		let items = this._items;
		let thatItems = that._items;
		let itemsLen = items.length;
		let thanItemsLen = thatItems.length;
		let changed = false;

		if (itemsLen != thanItemsLen) {
			items.length = thanItemsLen;
			changed = true;
		}

		for (let i = thanItemsLen; i; ) {
			let item: any = items[--i];
			let thatItem = thatItems[i];

			if (
				i < itemsLen && (this._itemEquals || that._itemEquals)
					? !(this._itemEquals || that._itemEquals)!(item, thatItem)
					: item !== thatItem &&
					  !(
							item &&
							typeof item == 'object' &&
							(item as ObservableList).equals &&
							(item as ObservableList).equals(thatItem)
					  )
			) {
				if (
					item &&
					thatItem &&
					typeof item == 'object' &&
					typeof thatItem == 'object' &&
					(item as ObservableList).absorbFrom &&
					(item as ObservableList).absorbFrom === (thatItem as ObservableList).absorbFrom
				) {
					if ((item as ObservableList).absorbFrom(thatItem)) {
						changed = true;
					}
				} else {
					items[i] = thatItem;
					changed = true;
				}
			}
		}

		if (changed) {
			this.emit(ObservableList.EVENT_CHANGE);
		}

		return changed;
	}

	toArray() {
		return this._items.slice();
	}

	toString() {
		return this._items.join();
	}

	toData<I = any>(): Array<I> {
		return this._items.map((item) =>
			item && typeof item == 'object' && (item as any).toData ? (item as any).toData() : item
		);
	}

	_insertSortedValue(item: T) {
		let items = this._items;
		let itemComparator = this._itemComparator!;
		let lowIndex = 0;
		let highIndex = items.length;

		while (lowIndex != highIndex) {
			let midIndex = (lowIndex + highIndex) >> 1;

			if (itemComparator(item, items[midIndex]) < 0) {
				highIndex = midIndex;
			} else {
				lowIndex = midIndex + 1;
			}
		}

		items.splice(lowIndex, 0, item);
	}

	declare [Symbol.iterator]: () => Iterator<T>;
}

['forEach', 'map', 'filter', 'every', 'some'].forEach((name) => {
	ObservableList.prototype[name] = function (cb: Function, context?: any) {
		return this._items[name]((item: any, index: number) => cb.call(context, item, index, this));
	};
});

['reduce', 'reduceRight'].forEach((name) => {
	ObservableList.prototype[name] = function (cb: Function, initialValue?: any) {
		let wrapper = (accumulator: any, item: any, index: number): any =>
			cb(accumulator, item, index, this);

		return arguments.length >= 2
			? this._items[name](wrapper, initialValue)
			: this._items[name](wrapper);
	};
});

[
	['keys', (index: number): number => index],
	['values', (_index: number, item: any): any => item],
	['entries', (index: number, item: any): [number, any] => [index, item]]
].forEach((settings: [string, (index: number, item: any) => any]) => {
	let getStepValue = settings[1];

	ObservableList.prototype[settings[0]] = function (): Iterator<any> {
		let items = this._items;
		let index = 0;
		let done = false;

		return {
			next(): IteratorResult<any> {
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

ObservableList.prototype[Symbol.iterator] = ObservableList.prototype.values;

declare module './ObservableList' {
	interface ObservableList<T = any> {
		forEach(cb: (item: T, index: number, list: this) => void, context?: any): void;

		map<R>(cb: (item: T, index: number, list: this) => R, context?: any): Array<R>;

		filter<R extends T>(
			cb: (item: T, index: number, list: this) => item is R,
			context?: any
		): Array<R>;
		filter(cb: (item: T, index: number, list: this) => any, context?: any): Array<T>;

		every(cb: (item: T, index: number, list: this) => any, context?: any): boolean;

		some(cb: (item: T, index: number, list: this) => any, context?: any): boolean;

		reduce<R = T>(
			cb: (accumulator: R, item: T, index: number, list: this) => R,
			initialValue?: R
		): R;

		reduceRight<R = T>(
			cb: (accumulator: R, item: T, index: number, list: this) => R,
			initialValue?: R
		): R;

		keys(): Iterator<number>;

		values(): Iterator<T>;

		entries(): Iterator<[number, T]>;
	}
}
