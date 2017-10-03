import { EventEmitter } from '../EventEmitter';
export declare class FreezableCollection extends EventEmitter {
    _isFrozen: boolean;
    readonly isFrozen: boolean;
    freeze(): this;
    unfreeze(): this;
    _throwIfFrozen(msg?: string): void;
}
