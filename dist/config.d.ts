export declare const config: {
    logError: (...args: Array<any>) => void;
    confirmValues: (value1: any, value2: any) => boolean;
};
export declare function configure(options: Partial<typeof config>): {
    logError: (...args: any[]) => void;
    confirmValues: (value1: any, value2: any) => boolean;
};
