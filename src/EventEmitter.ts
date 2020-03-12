import { Cell } from './Cell';
import { KEY_VALUE_CELLS } from './cellx';
import { logError } from './utils';

const hasOwn = Object.prototype.hasOwnProperty;

export interface IEvent<T extends EventEmitter = EventEmitter> {
	target: T;
	type: string | symbol;
	bubbles?: boolean;
	defaultPrevented?: boolean;
	propagationStopped?: boolean;
	data: Record<string, any>;
}

export type TListener<T extends EventEmitter = EventEmitter> = (evt: IEvent<T>) => any;

export interface IRegisteredEvent {
	listener: TListener;
	context: any;
}

let currentlySubscribing = false;

let transactionLevel = 0;
let transactionEvents: Array<IEvent> = [];

let silently = 0;

export class EventEmitter {
	static get currentlySubscribing(): boolean {
		return currentlySubscribing;
	}

	static transact(cb: Function) {
		transactionLevel++;

		try {
			cb();
		} catch (err) {
			logError(err);
		}

		if (--transactionLevel) {
			return;
		}

		let events = transactionEvents;

		transactionEvents = [];

		for (let evt of events) {
			evt.target.handleEvent(evt);
		}
	}

	static silently(cb: Function) {
		silently++;

		try {
			cb();
		} catch (err) {
			logError(err);
		}

		silently--;
	}

	_events = new Map<string | symbol, IRegisteredEvent | Array<IRegisteredEvent>>();

	getEvents(): Map<string | symbol, Array<IRegisteredEvent>>;
	getEvents(type: string | symbol): Array<IRegisteredEvent>;
	getEvents(type?: string | symbol) {
		if (type) {
			let events = this._events.get(type);

			if (!events) {
				return [];
			}

			return Array.isArray(events) ? events : [events];
		}

		let events = new Map<string | symbol, Array<IRegisteredEvent>>();

		for (let [type, typeEvents] of this._events) {
			events.set(type, Array.isArray(typeEvents) ? typeEvents : [typeEvents]);
		}

		return events;
	}

	on(type: string | symbol, listener: TListener, context?: any): this;
	on(listeners: Record<string | symbol, TListener>, context?: any): this;
	on(type: string | symbol | Record<string | symbol, TListener>, listener?: any, context?: any) {
		if (typeof type == 'object') {
			context = listener !== undefined ? listener : this;

			let listeners = type;

			for (type in listeners) {
				if (hasOwn.call(listeners, type)) {
					this._on(type, listeners[type], context);
				}
			}

			for (let type of Object.getOwnPropertySymbols(listeners)) {
				this._on(type, listeners[type as any], context);
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
					if (hasOwn.call(listeners, type)) {
						this._off(type, listeners[type], context);
					}
				}

				for (let type of Object.getOwnPropertySymbols(listeners)) {
					this._off(type, listeners[type as any], context);
				}
			} else {
				this._off(type, listener, context !== undefined ? context : this);
			}
		} else {
			this._events.clear();
		}

		return this;
	}

	_on(type: string | symbol, listener: TListener, context: any) {
		let index: number;

		if (typeof type == 'string' && (index = type.indexOf(':')) != -1) {
			let propName = type.slice(index + 1);

			currentlySubscribing = true;
			(
				(
					(this[KEY_VALUE_CELLS] as Map<string, Cell>) ||
					(this[KEY_VALUE_CELLS] = new Map())
				).get(propName) ||
				(this[propName], this[KEY_VALUE_CELLS] as Map<string, Cell>).get(propName)!
			).on(type.slice(0, index), listener, context);
			currentlySubscribing = false;
		} else {
			let events = this._events.get(type);
			let evt = { listener, context };

			if (!events) {
				this._events.set(type, evt);
			} else if (Array.isArray(events)) {
				events.push(evt);
			} else {
				this._events.set(type, [events, evt]);
			}
		}
	}

	_off(type: string | symbol, listener: TListener, context: any) {
		let index: number;

		if (typeof type == 'string' && (index = type.indexOf(':')) != -1) {
			let valueCell =
				this[KEY_VALUE_CELLS] &&
				(this[KEY_VALUE_CELLS] as Map<string, Cell>).get(type.slice(index + 1));

			if (valueCell) {
				valueCell.off(type.slice(0, index), listener, context);
			}
		} else {
			let events = this._events.get(type);

			if (!events) {
				return;
			}

			let evt;

			if (!Array.isArray(events)) {
				evt = events;
			} else if (events.length == 1) {
				evt = events[0];
			} else {
				for (let i = events.length; i; ) {
					evt = events[--i];

					if (evt.listener == listener && evt.context === context) {
						events.splice(i, 1);
						break;
					}
				}

				return;
			}

			if (evt.listener == listener && evt.context === context) {
				this._events.delete(type);
			}
		}
	}

	once(type: string | symbol, listener: TListener, context?: any): TListener {
		if (context === undefined) {
			context = this;
		}

		function wrapper(evt: IEvent) {
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
	): IEvent {
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
			if (transactionLevel) {
				for (let i = transactionEvents.length; ; ) {
					if (!i) {
						(evt.data || (evt.data = {})).prevEvent = null;
						transactionEvents.push(evt as IEvent);
						break;
					}

					let event = transactionEvents[--i];

					if (event.target == this && event.type === evt.type) {
						(evt.data || (evt.data = {})).prevEvent = event;
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
		let events = this._events.get(evt.type);

		if (!events) {
			return;
		}

		if (Array.isArray(events)) {
			if (events.length == 1) {
				if (this._tryEventListener(events[0], evt) === false) {
					evt.propagationStopped = true;
				}
			} else {
				events = events.slice();

				// tslint:disable-next-line:prefer-for-of
				for (let i = 0; i < events.length; i++) {
					if (this._tryEventListener(events[i], evt) === false) {
						evt.propagationStopped = true;
					}
				}
			}
		} else if (this._tryEventListener(events, evt) === false) {
			evt.propagationStopped = true;
		}
	}

	_tryEventListener(emEvt: IRegisteredEvent, evt: IEvent): any {
		try {
			return emEvt.listener.call(emEvt.context, evt);
		} catch (err) {
			logError(err);
		}
	}
}
