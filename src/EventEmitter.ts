import { error } from '@riim/logger';
import { Map } from '@riim/map-set-polyfill';

export interface IEvent<T extends EventEmitter = EventEmitter> {
	target: T;
	type: string;
	bubbles?: boolean;
	isPropagationStopped?: boolean;
	data: {
		[name: string]: any;
	};
}

export type TListener<T extends EventEmitter = EventEmitter> = (evt: IEvent<T>) => any;

export interface IRegisteredEvent {
	listener: TListener;
	context: any;
}

let currentlySubscribing = false;

let transactionLevel = 0;
let transactionEvents = new Map<EventEmitter, { [type: string]: IEvent }>();

export class EventEmitter {
	static get currentlySubscribing(): boolean {
		return currentlySubscribing;
	}
	static set currentlySubscribing(value: boolean) {
		currentlySubscribing = value;
	}

	static transact(callback: Function) {
		transactionLevel++;

		try {
			callback();
		} catch (err) {
			error(err);
		}

		if (--transactionLevel) {
			return;
		}

		let events = transactionEvents;

		transactionEvents = new Map();

		events.forEach((events, target) => {
			for (let type in events) {
				target.handleEvent(events[type]);
			}
		});
	}

	_events: Map<string, IRegisteredEvent | Array<IRegisteredEvent>>;

	constructor() {
		this._events = new Map();
	}

	getEvents(): { [type: string]: Array<IRegisteredEvent> };
	getEvents(type: string): Array<IRegisteredEvent>;
	getEvents(type?: string) {
		let events: any;

		if (type) {
			events = this._events.get(type);

			if (!events) {
				return [];
			}

			return Array.isArray(events) ? events : [events];
		}

		events = Object.create(null);

		this._events.forEach((typeEvents, type) => {
			events[type] = Array.isArray(typeEvents) ? typeEvents : [typeEvents];
		});

		return events;
	}

	on(type: string, listener: TListener, context?: any): this;
	on(listeners: { [type: string]: TListener }, context?: any): this;
	on(type: string | { [type: string]: TListener }, listener?: any, context?: any) {
		if (typeof type == 'object') {
			context = listener !== undefined ? listener : this;

			let listeners = type;

			for (type in listeners) {
				this._on(type, listeners[type], context);
			}
		} else {
			this._on(type, listener, context !== undefined ? context : this);
		}

		return this;
	}

	off(type: string, listener: TListener, context?: any): this;
	off(listeners?: { [type: string]: TListener }, context?: any): this;
	off(type?: string | { [type: string]: TListener }, listener?: any, context?: any) {
		if (type) {
			if (typeof type == 'object') {
				context = listener !== undefined ? listener : this;

				let listeners = type;

				for (type in listeners) {
					this._off(type, listeners[type], context);
				}
			} else {
				this._off(type, listener, context !== undefined ? context : this);
			}
		} else {
			this._events.clear();
		}

		return this;
	}

	_on(type: string, listener: TListener, context: any) {
		let index = type.indexOf(':');

		if (index != -1) {
			let propName = type.slice(index + 1);

			currentlySubscribing = true;
			(
				(this as any)[propName + 'Cell'] ||
				((this as any)[propName], (this as any)[propName + 'Cell'])
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

	_off(type: string, listener: TListener, context: any) {
		let index = type.indexOf(':');

		if (index != -1) {
			let propName = type.slice(index + 1);

			(
				(this as any)[propName + 'Cell'] ||
				((this as any)[propName], (this as any)[propName + 'Cell'])
			).off(type.slice(0, index), listener, context);
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

	once(type: string, listener: TListener, context?: any): TListener {
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
					type: string;
					bubbles?: boolean;
					isPropagationStopped?: boolean;
					data?: {
						[name: string]: any;
					};
				}
			| string,
		data?: { [name: string]: any }
	): IEvent {
		if (typeof evt == 'string') {
			evt = {
				target: this,
				type: evt
			};
		} else if (!evt.target) {
			evt.target = this;
		} else if (evt.target != this) {
			throw new TypeError('Event cannot be emitted on this object');
		}

		if (data) {
			evt.data = data;
		}

		if (transactionLevel) {
			let events = transactionEvents.get(this);

			if (!events) {
				events = Object.create(null) as { [type: string]: IEvent };
				transactionEvents.set(this, events);
			}

			(evt.data || (evt.data = {})).prev = events[evt.type] || null;
			events[evt.type] = evt as IEvent;
		} else {
			this.handleEvent(evt as IEvent);
		}

		return evt as IEvent;
	}

	handleEvent(evt: IEvent) {
		let events = this._events.get(evt.type);

		if (!events) {
			return;
		}

		if (Array.isArray(events)) {
			let eventCount = events.length;

			if (eventCount == 1) {
				if (this._tryEventListener(events[0], evt) === false) {
					evt.isPropagationStopped = true;
				}
			} else {
				events = events.slice();

				for (let i = 0; i < eventCount; i++) {
					if (this._tryEventListener(events[i], evt) === false) {
						evt.isPropagationStopped = true;
					}
				}
			}
		} else if (this._tryEventListener(events, evt) === false) {
			evt.isPropagationStopped = true;
		}
	}

	_tryEventListener(emEvt: IRegisteredEvent, evt: IEvent): any {
		try {
			return emEvt.listener.call(emEvt.context, evt);
		} catch (err) {
			error(err);
		}
	}
}
