export declare const config: {
    logError: (...args: Array<any>) => void;
    compareValues: (value1: any, value2: any) => boolean;
};
export declare function configure(options: Partial<typeof config>): {
    logError: (...args: any[]) => void;
    compareValues: (value1: any, value2: any) => boolean;
} & Partial<{
    logError: (...args: any[]) => void;
    compareValues: (value1: any, value2: any) => boolean;
}>;
