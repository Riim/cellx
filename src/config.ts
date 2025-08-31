export const config = {
	logError: /* istanbul ignore next */ (...args: Array<any>) => {
		console.error(...args);
	},

	compareValues: Object.is
};

export function configure(options: Partial<typeof config>) {
	return Object.assign(config, options);
}
