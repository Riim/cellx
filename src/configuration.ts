export const configuration = {
	logError: (...args: Array<any>) => {
		console.error(...args);
	}
};

export function configure(config: { logError: Function }): Object {
	Object.assign(configuration, config);
	return configuration;
}
