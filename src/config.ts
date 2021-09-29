export const config = {
	logError: (...args: Array<any>) => {
		console.error(...args);
	},

	confirmValues: Object.is
};

export function configure(options: Partial<typeof config>) {
	Object.assign(config, options);
	return config;
}
