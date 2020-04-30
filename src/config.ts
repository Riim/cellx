export const config = {
	logError: (...args: Array<any>): void => {
		console.error(...args);
	}
};

export function configure(options: Partial<typeof config>): typeof config {
	Object.assign(config, options);
	return config;
}
