var ObservableCollection;

(function() {
	var Map = cellx.Map;
	var EventEmitter = cellx.EventEmitter;

	ObservableCollection = createClass({
		Extends: EventEmitter,

		constructor: function() {
			/**
			 * @type {Map<*, uint>}
			 */
			this._valueCounts = new Map();
		},

		/**
		 * @typesign (evt: cellx~Event);
		 */
		_onItemChange: function(evt) {
			this._handleEvent(evt);
		},

		/**
		 * @typesign (value);
		 */
		_registerValue: function(value) {
			var valueCounts = this._valueCounts;
			var valueCount = valueCounts.get(value);

			if (valueCount) {
				valueCounts.set(value, valueCount + 1);
			} else {
				valueCounts.set(value, 1);

				if (this.adoptsItemChanges && value instanceof EventEmitter) {
					value.on('change', this._onItemChange, this);
				}
			}
		},

		/**
		 * @typesign (value);
		 */
		_unregisterValue: function(value) {
			var valueCounts = this._valueCounts;
			var valueCount = valueCounts.get(value);

			if (valueCount > 1) {
				valueCounts.set(value, valueCount - 1);
			} else {
				valueCounts.delete(value);

				if (this.adoptsItemChanges && value instanceof EventEmitter) {
					value.off('change', this._onItemChange, this);
				}
			}
		},

		/**
		 * Освобождает занятые инстансом ресурсы.
		 * @typesign ();
		 */
		dispose: function() {
			if (this.adoptsItemChanges) {
				this._valueCounts.forEach(function(value) {
					if (value instanceof EventEmitter) {
						value.off('change', this._onItemChange, this);
					}
				}, this);
			}
		}
	});
})();
