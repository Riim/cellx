export function WaitError() {
	if (!(this instanceof WaitError)) {
		return new (WaitError as any)();
	}
}

WaitError.prototype = {
	__proto__: Error.prototype,
	constructor: WaitError
};
