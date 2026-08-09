export declare function defineObservableProperty<T extends object = object>(obj: T, key: keyof T, value: any): T;
export declare function defineObservableProperties<T extends object = object>(obj: T, props: Record<keyof T, any>): T;
export declare function define<T extends object = object>(obj: T, key: keyof T, value: any): T;
export declare function define<T extends object = object>(obj: T, props: Record<keyof T, any>): T;
