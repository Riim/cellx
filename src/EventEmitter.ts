import { config } from './config';

export interface IEvent<Data = any, Target extends EventEmitter = EventEmitter> {
	target: Target;
	type: string | symbol;
	bubbles?: boolean;
	defaultPrevented?: boolean;
	propagationStopped?: boolean;
	data: Data;
}

export type TListener<Event extends IEvent = IEvent, Context = any> = (
	this: Context,
	evt: Event
) => any;

export interface I$Listener {
	listener: TListener;
	context: any;
}

export const EventEmitter_CommonState = {
	inBatchCounter: 0,
	batchedEvents: [] as Array<IEvent>,

	inSilentlyCounter: 0
};

export class EventEmitter {
	static batch(fn: Function) {
		EventEmitter_CommonState.inBatchCounter++;

		try {
			fn();
		} finally {
			if (--EventEmitter_CommonState.inBatchCounter == 0) {
				let events = EventEmitter_CommonState.batchedEvents;

				EventEmitter_CommonState.batchedEvents = [];

				for (let i = 0; i < events.length; i++) {
					events[i].target.triggerEvent(events[i]);
				}
			}
		}
	}

	static silently(fn: Function) {
		EventEmitter_CommonState.inSilentlyCounter++;

		try {
			fn();
		} finally {
			EventEmitter_CommonState.inSilentlyCounter--;
		}
	}

	protected _listeners = new Map<string | symbol, Array<I$Listener>>();

	getListeners(): ReadonlyMap<string | symbol, ReadonlyArray<I$Listener>>;
	getListeners(type: string | symbol): ReadonlyArray<I$Listener>;
	getListeners(
		type?: string | symbol
	): ReadonlyMap<string | symbol, ReadonlyArray<I$Listener>> | ReadonlyArray<I$Listener> {
		return type ? (this._listeners.get(type) ?? []) : this._listeners;
	}

	on(type: string | symbol, listener: TListener, context?: any): this;
	on(listeners: Record<string | symbol, TListener>, context?: any): this;
	on(type: string | symbol | Record<string | symbol, TListener>, listener?: any, context?: any) {
		if (typeof type == 'object') {
			context = listener !== undefined ? listener : this;

			let listeners = type;

			for (type in listeners) {
				if (Object.prototype.hasOwnProperty.call(listeners, type)) {
					this._on(type, listeners[type], context);
				}
			}

			for (let type of Object.getOwnPropertySymbols(listeners)) {
				this._on(type, listeners[type], context);
			}
		} else {
			this._on(type, listener, context !== undefined ? context : this);
		}

		return this;
	}

	off(type: string | symbol, listener: TListener, context?: any): this;
	off(listeners?: Record<string | symbol, TListener>, context?: any): this;
	off(
		type?: string | symbol | Record<string | symbol, TListener>,
		listener?: any,
		context?: any
	) {
		if (type) {
			if (typeof type == 'object') {
				context = listener !== undefined ? listener : this;

				let listeners = type;

				for (type in listeners) {
					if (Object.prototype.hasOwnProperty.call(listeners, type)) {
						this._off(type, listeners[type], context);
					}
				}

				for (let type of Object.getOwnPropertySymbols(listeners)) {
					this._off(type, listeners[type], context);
				}
			} else {
				this._off(type, listener, context !== undefined ? context : this);
			}
		} else {
			this._listeners.clear();
		}

		return this;
	}

	protected _on(type: string | symbol, listener: TListener, context: any) {
		let typeListeners = this._listeners.get(type);
		let $listener = {
			listener,
			context
		};

		if (typeListeners) {
			typeListeners.push($listener);
		} else {
			this._listeners.set(type, [$listener]);
		}
	}

	protected _off(type: string | symbol, listener: TListener, context: any) {
		let typeListeners = this._listeners.get(type);

		if (!typeListeners) {
			return;
		}

		if (typeListeners.length == 1) {
			if (typeListeners[0].listener == listener && typeListeners[0].context === context) {
				this._listeners.delete(type);
			}
		} else {
			for (let i = 0; ; i++) {
				if (typeListeners[i].listener == listener && typeListeners[i].context === context) {
					typeListeners.splice(i, 1);

					break;
				}

				if (i + 1 == typeListeners.length) {
					break;
				}
			}
		}
	}

	once(type: string | symbol, listener: TListener, context?: any) {
		if (context === undefined) {
			context = this;
		}

		function wrapper(this: any, evt: IEvent): any {
			this._off(type, wrapper, context);

			return listener.call(this, evt);
		}

		this._on(type, wrapper, context);

		return wrapper;
	}

	emit(
		evt:
			| {
					target?: EventEmitter;
					type: string | symbol;
					bubbles?: boolean;
					defaultPrevented?: boolean;
					propagationStopped?: boolean;
					data?: any;
			  }
			| string
			| symbol,
		data?: any
	) {
		if (typeof evt == 'object') {
			if (!evt.target) {
				evt.target = this;
			} else if (evt.target != this) {
				throw TypeError('Event cannot be emitted on this target');
			}
		} else {
			evt = {
				target: this,
				type: evt
			};
		}

		if (data) {
			evt.data = data;
		}

		if (EventEmitter_CommonState.inSilentlyCounter == 0) {
			if (EventEmitter_CommonState.inBatchCounter != 0) {
				for (let i = EventEmitter_CommonState.batchedEvents.length; ; ) {
					if (i == 0) {
						if (evt.data) {
							evt.data['prevEvent'] = null;
						} else {
							evt.data = { prevEvent: null };
						}

						EventEmitter_CommonState.batchedEvents.push(evt as IEvent);

						break;
					}

					let event = EventEmitter_CommonState.batchedEvents[--i];

					if (event.target == this && event.type === evt.type) {
						if (evt.data) {
							evt.data['prevEvent'] = event;
						} else {
							evt.data = { prevEvent: event };
						}

						EventEmitter_CommonState.batchedEvents[i] = evt as IEvent;

						break;
					}
				}
			} else {
				this.triggerEvent(evt as IEvent);
			}
		}

		return evt as IEvent;
	}

	triggerEvent(evt: IEvent) {
		let typeListeners = this._listeners.get(evt.type);

		if (!typeListeners) {
			return;
		}

		if (typeListeners.length == 1) {
			if (this._tryEventListener(typeListeners[0], evt) === false) {
				evt.propagationStopped = true;
			}
		} else {
			typeListeners = typeListeners.slice();

			for (let i = 0; i < typeListeners.length; i++) {
				if (this._tryEventListener(typeListeners[i], evt) === false) {
					evt.propagationStopped = true;
				}
			}
		}
	}

	protected _tryEventListener($listener: I$Listener, evt: IEvent) {
		try {
			return $listener.listener.call($listener.context, evt);
		} catch (err) {
			config.logError(err);
		}
	}
}
