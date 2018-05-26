import { EventEmitter } from '../EventEmitter';

export class FreezableCollection extends EventEmitter {
	_frozen = false;
	get frozen(): boolean {
		return this._frozen;
	}

	freeze(): this {
		this._frozen = true;
		return this;
	}

	unfreeze(): this {
		this._frozen = false;
		return this;
	}

	_throwIfFrozen(msg?: string) {
		if (this._frozen) {
			throw new TypeError(msg || 'Frozen collection cannot be mutated');
		}
	}
}
