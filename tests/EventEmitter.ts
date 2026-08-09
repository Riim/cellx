/* istanbul ignore file */
export class EventEmitter {
	protected _listeners = new Map<
		string,
		Array<{
			listener: Function;
			context: any;
		}>
	>();

	on(type: string, listener: Function, context: any = this) {
		let typeListeners = this._listeners.get(type);

		if (typeListeners) {
			typeListeners.push({ listener, context });
		} else {
			this._listeners.set(type, [{ listener, context }]);
		}
	}

	off(type: string, listener: Function, context: any = this) {
		let typeListeners = this._listeners.get(type);

		if (!typeListeners) {
			return;
		}

		for (let i = 0; i < typeListeners.length; i++) {
			if (typeListeners[i].listener == listener && typeListeners[i].context === context) {
				typeListeners.splice(i, 1);
				break;
			}
		}
	}

	emit(type: string) {
		let typeListeners = this._listeners.get(type);

		if (!typeListeners) {
			return;
		}

		typeListeners = typeListeners.slice();

		let evt = { target: this, type };

		for (let i = 0; i < typeListeners.length; i++) {
			typeListeners[i].listener.call(typeListeners[i].context, evt);
		}
	}
}
