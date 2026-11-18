export declare const config: {
    logError: (...args: Array<any>) => void;
};
export declare function configure(options: Partial<typeof config>): {
    logError: (...args: Array<any>) => void;
} & Partial<{
    logError: (...args: Array<any>) => void;
}>;
