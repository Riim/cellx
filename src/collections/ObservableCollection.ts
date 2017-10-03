import { Map } from '@riim/map-set-polyfill';
import { EventEmitter, IEvent } from '../EventEmitter';

export class ObservableCollection<T> extends EventEmitter {
	_adoptsValueChanges: boolean;
	get adoptsValueChanges(): boolean {
		return this._adoptsValueChanges;
	}

	_valueCounts = new Map<T, number>();

	_onItemChange(evt: IEvent) {
		this.handleEvent(evt);
	}

	_registerValue(value: T): T {
		let valueCounts = this._valueCounts;
		let valueCount = valueCounts.get(value);

		if (valueCount) {
			valueCounts.set(value, valueCount + 1);
		} else {
			valueCounts.set(value, 1);

			if (this._adoptsValueChanges && value instanceof EventEmitter) {
				value.on('change', this._onItemChange, this);
			}
		}

		return value;
	}

	_unregisterValue(value: T) {
		let valueCounts = this._valueCounts;
		let valueCount = valueCounts.get(value)!;

		if (valueCount == 1) {
			valueCounts.delete(value);

			if (this._adoptsValueChanges && value instanceof EventEmitter) {
				value.off('change', this._onItemChange, this);
			}
		} else {
			valueCounts.set(value, valueCount - 1);
		}
	}
}
