import { EventEmitter } from '../EventEmitter';
export declare class FreezableCollection extends EventEmitter {
    _frozen: boolean;
    readonly frozen: boolean;
    freeze(): this;
    unfreeze(): this;
    _throwIfFrozen(msg?: string): void;
}
