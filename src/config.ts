export const config = {
	logError: /* istanbul ignore next */ (...args: Array<any>) => {
		console.error(...args);
	}
};

export function configure(options: Partial<typeof config>) {
	return Object.assign(config, options);
}
