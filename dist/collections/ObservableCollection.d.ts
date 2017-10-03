import { EventEmitter, IEvent } from '../EventEmitter';
export declare class ObservableCollection<T> extends EventEmitter {
    _adoptsValueChanges: boolean;
    readonly adoptsValueChanges: boolean;
    _valueCounts: Map<T, number>;
    _onItemChange(evt: IEvent): void;
    _registerValue(value: T): T;
    _unregisterValue(value: T): void;
}
