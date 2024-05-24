/* istanbul ignore next */
export const nextTick: (cb: Function) => void =
	globalThis.process?.nextTick ??
	(() => {
		const resolvedPromise = Promise.resolve();

		return (cb) => {
			resolvedPromise.then(cb as any);
		};
	})();
