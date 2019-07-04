export const config = {
	logError: (...args: Array<any>) => {
		console.error(...args);
	}
};

export function configure(options: { logError: Function }): Object {
	Object.assign(config, options);
	return config;
}
