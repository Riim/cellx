export function FreezableCollectionMixin() {
	/**
	 * @type {boolean}
	 */
	this._isFrozen = false;
}

FreezableCollectionMixin.prototype = {
	/**
	 * @type {boolean}
	 */
	get isFrozen() {
		return this._isFrozen;
	},

	/**
	 * @typesign () -> this;
	 */
	freeze: function freeze() {
		this._isFrozen = true;
		return this;
	},

	/**
	 * @typesign () -> this;
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
			throw new TypeError(msg || 'Frozen collection cannot be mutated');
		}
	}
};
