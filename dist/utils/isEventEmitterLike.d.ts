export interface IEventEmitterLike {
    on(type: string | symbol, listener: (...args: Array<any>) => any, context?: any): any;
    off(type: string | symbol, listener: (...args: Array<any>) => any, context?: any): any;
    emit(type: string | symbol | {
        type: string | symbol;
        [key: string]: any;
    }, data?: any): any;
}
export declare function isEventEmitterLike(value: any): value is IEventEmitterLike;
