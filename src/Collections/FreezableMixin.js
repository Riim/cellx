export default function FreezableMixin() {
	/**
	 * @type {boolean}
	 */
	this._isFrozen = false;
}

FreezableMixin.prototype = {
	/**
	 * @type {boolean}
	 */
	get isFrozen() {
		return this._isFrozen;
	},

	/**
	 * @typesign () -> cellx.ObservableList;
	 */
	freeze: function freeze() {
		this._isFrozen = true;
		return this;
	},

	/**
	 * @typesign () -> cellx.ObservableList;
	 */
	unfreeze: function unfreeze() {
		this._isFrozen = false;
		return this;
	},

	/**
	 * @typesign (msg: string);
	 */
	_throwIfFrozen: function _throwIfFrozen(msg) {
		if (this._isFrozen) {
			throw new TypeError(msg || 'Frozen list cannot be mutated');
		}
	}
};
