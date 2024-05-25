import { Cell } from './Cell';
import { config } from './config';
import { KEY_VALUE_CELLS } from './keys';

export interface IEvent<
	T extends EventEmitter = EventEmitter,
	D extends object = Record<string, any>
> {
	target: T;
	type: string | symbol;
	bubbles?: boolean;
	defaultPrevented?: boolean;
	propagationStopped?: boolean;
	data: D;
}

export type TListener<T extends EventEmitter = EventEmitter> = (evt: IEvent<T>) => any;

export interface I$Listener {
	listener: TListener;
	context: any;
}

let currentlySubscribing = false;

let transactionLevel = 0;
let transactionEvents: Array<IEvent> = [];

let silently = false;

export class EventEmitter {
	static get currentlySubscribing() {
		return currentlySubscribing;
	}

	static transact(cb: Function) {
		transactionLevel++;

		try {
			cb();
		} finally {
			if (--transactionLevel == 0) {
				let events = transactionEvents;

				transactionEvents = [];

				for (let i = 0; i < events.length; i++) {
					events[i].target.handleEvent(events[i]);
				}
			}
		}
	}

	static silently(cb: Function) {
		if (silently) {
			cb();

			return;
		}

		silently = true;

		try {
			cb();
		} finally {
			silently = false;
		}
	}

	[KEY_VALUE_CELLS]?: Map<string, Cell>;

	_$listeners = new Map<string | symbol, Array<I$Listener>>();

	get$Listeners(): ReadonlyMap<string | symbol, ReadonlyArray<I$Listener>>;
	get$Listeners(type: string | symbol): ReadonlyArray<I$Listener>;
	get$Listeners(
		type?: string | symbol
	): ReadonlyMap<string | symbol, ReadonlyArray<I$Listener>> | ReadonlyArray<I$Listener> {
		return type ? this._$listeners.get(type) ?? [] : this._$listeners;
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
			this._$listeners.clear();
		}

		return this;
	}

	_on(type: string | symbol, listener: TListener, context: any) {
		let index: number;

		if (typeof type == 'string' && (index = type.indexOf(':')) != -1) {
			let propName = type.slice(index + 1);

			currentlySubscribing = true;

			(
				(this[KEY_VALUE_CELLS] ?? (this[KEY_VALUE_CELLS] = new Map<string, Cell>())).get(
					propName
				) ?? (this[propName], this[KEY_VALUE_CELLS]).get(propName)!
			).on(type.slice(0, index), listener, context);

			currentlySubscribing = false;
		} else {
			let type$Listeners = this._$listeners.get(type);
			let $listener = {
				listener,
				context
			};

			if (type$Listeners) {
				type$Listeners.push($listener);
			} else {
				this._$listeners.set(type, [$listener]);
			}
		}
	}

	_off(type: string | symbol, listener: TListener, context: any) {
		let index: number;

		if (typeof type == 'string' && (index = type.indexOf(':')) != -1) {
			this[KEY_VALUE_CELLS]?.get(type.slice(index + 1))?.off(
				type.slice(0, index),
				listener,
				context
			);
		} else {
			let type$Listeners = this._$listeners.get(type);

			if (!type$Listeners) {
				return;
			}

			if (type$Listeners.length == 1) {
				if (
					type$Listeners[0].listener == listener &&
					type$Listeners[0].context === context
				) {
					this._$listeners.delete(type);
				}
			} else {
				for (let i = 0; ; i++) {
					if (
						type$Listeners[i].listener == listener &&
						type$Listeners[i].context === context
					) {
						type$Listeners.splice(i, 1);

						break;
					}

					if (i + 1 == type$Listeners.length) {
						break;
					}
				}
			}
		}
	}

	once(type: string | symbol, listener: TListener, context?: any): TListener {
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
					data?: Record<string, any>;
			  }
			| string
			| symbol,
		data?: Record<string, any>
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

		if (!silently) {
			if (transactionLevel != 0) {
				for (let i = transactionEvents.length; ; ) {
					if (i == 0) {
						if (evt.data) {
							evt.data['prevEvent'] = null;
						} else {
							evt.data = { prevEvent: null };
						}

						transactionEvents.push(evt as IEvent);

						break;
					}

					let event = transactionEvents[--i];

					if (event.target == this && event.type === evt.type) {
						if (evt.data) {
							evt.data['prevEvent'] = event;
						} else {
							evt.data = { prevEvent: event };
						}

						transactionEvents[i] = evt as IEvent;

						break;
					}
				}
			} else {
				this.handleEvent(evt as IEvent);
			}
		}

		return evt as IEvent;
	}

	handleEvent(evt: IEvent) {
		let type$Listeners = this._$listeners.get(evt.type);

		if (!type$Listeners) {
			return;
		}

		if (type$Listeners.length == 1) {
			if (this._tryEventListener(type$Listeners[0], evt) === false) {
				evt.propagationStopped = true;
			}
		} else {
			type$Listeners = type$Listeners.slice();

			for (let i = 0; i < type$Listeners.length; i++) {
				if (this._tryEventListener(type$Listeners[i], evt) === false) {
					evt.propagationStopped = true;
				}
			}
		}
	}

	_tryEventListener($listener: I$Listener, evt: IEvent) {
		try {
			return $listener.listener.call($listener.context, evt);
		} catch (err) {
			config.logError(err);
		}
	}
}
