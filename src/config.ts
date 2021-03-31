export const config = {
	logError: (...args: Array<any>) => {
		console.error(...args);
	}
};

export function configure(options: Partial<typeof config>) {
	Object.assign(config, options);
	return config;
}
