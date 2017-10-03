import { EventEmitter } from '../EventEmitter';

export class FreezableCollection extends EventEmitter {
	_isFrozen = false;
	get isFrozen(): boolean {
		return this._isFrozen;
	}

	freeze(): this {
		this._isFrozen = true;
		return this;
	}

	unfreeze(): this {
		this._isFrozen = false;
		return this;
	}

	_throwIfFrozen(msg?: string) {
		if (this._isFrozen) {
			throw new TypeError(msg || 'Frozen collection cannot be mutated');
		}
	}
}
