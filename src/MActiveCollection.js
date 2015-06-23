var MActiveCollection;

(function() {
	var EventEmitter = cellx.EventEmitter;

	MActiveCollection = {
		/**
		 * @type {Map<*, uint>}
		 */
		_valueCounts: null,

		adoptsItemChanges: true,

		/**
		 * @typesign (evt: cellx.Event);
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
				valueCounts['delete'](value);

				if (this.adoptsItemChanges && value instanceof EventEmitter) {
					value.off('change', this._onItemChange, this);
				}
			}
		},

		/**
		 * Уничтожает инстанс освобождая занятые им ресурсы.
		 * @typesign ();
		 */
		dispose: function() {
			if (this.adoptsItemChanges) {
				var onItemChange = this._onItemChange;

				this._valueCounts.forEach(function(value) {
					if (value instanceof EventEmitter) {
						value.off('change', onItemChange, this);
					}
				}, this);
			}
		}
	};
})();
