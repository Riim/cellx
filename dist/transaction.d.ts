export declare function transaction<T>(fn: () => T, onFailure?: (err: any) => T | void): void | T;
