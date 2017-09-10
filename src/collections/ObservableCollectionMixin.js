import { Map } from '@riim/map-set-polyfill';
import EventEmitter from '../EventEmitter';

export default function ObservableCollectionMixin() {
	/**
	 * @type {Map<*, uint>}
	 */
	this._valueCounts = new Map();
}

ObservableCollectionMixin.prototype = {
	/**
	 * @typesign (evt: cellx~Event);
	 */
	_onItemChange: function _onItemChange(evt) {
		this._handleEvent(evt);
	},

	/**
	 * @typesign (value);
	 */
	_registerValue: function _registerValue(value) {
		var valueCounts = this._valueCounts;
		var valueCount = valueCounts.get(value);

		if (valueCount) {
			valueCounts.set(value, valueCount + 1);
		} else {
			valueCounts.set(value, 1);

			if (this.adoptsValueChanges && value instanceof EventEmitter) {
				value.on('change', this._onItemChange, this);
			}
		}
	},

	/**
	 * @typesign (value);
	 */
	_unregisterValue: function _unregisterValue(value) {
		var valueCounts = this._valueCounts;
		var valueCount = valueCounts.get(value);

		if (valueCount > 1) {
			valueCounts.set(value, valueCount - 1);
		} else {
			valueCounts.delete(value);

			if (this.adoptsValueChanges && value instanceof EventEmitter) {
				value.off('change', this._onItemChange, this);
			}
		}
	}
};