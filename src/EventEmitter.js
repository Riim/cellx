import { error } from '@riim/logger';
import { Map } from '@riim/map-set-polyfill';

/**
 * @typedef {{
 *     target?: Object,
 *     type: string,
 *     bubbles?: boolean,
 *     isPropagationStopped?: boolean
 * }} cellx~Event
 */

/**
 * @typedef {(evt: cellx~Event) -> ?boolean} cellx~Listener
 */

/**
 * @typedef {{
 *     listener: cellx~Listener,
 *     context
 * }} cellx~RegisteredEvent
 */

/**
 * @class cellx.EventEmitter
 * @extends {Object}
 * @typesign new EventEmitter();
 */
export default function EventEmitter() {
	/**
	 * @type {{ [type: string]: cellx~RegisteredEvent | Array<cellx~RegisteredEvent> }}
	 */
	this._events = new Map();
}

EventEmitter.currentlySubscribing = false;

EventEmitter.prototype = {
	constructor: EventEmitter,

	/**
	 * @typesign () -> { [type: string]: Array<cellx~RegisteredEvent> };
	 * @typesign (type: string) -> Array<cellx~RegisteredEvent>;
	 */
	getEvents: function getEvents(type) {
		var events;

		if (type) {
			events = this._events.get(type);

			if (!events) {
				return [];
			}

			return Array.isArray(events) ? events : [events];
		}

		events = Object.create(null);

		this._events.forEach(function(typeEvents, type) {
			events[type] = Array.isArray(typeEvents) ? typeEvents : [typeEvents];
		});

		return events;
	},

	/**
	 * @typesign (type: string, listener: cellx~Listener, context?) -> this;
	 * @typesign (listeners: { [type: string]: cellx~Listener }, context?) -> this;
	 */
	on: function on(type, listener, context) {
		if (typeof type == 'object') {
			context = listener !== undefined ? listener : this;

			var listeners = type;

			for (type in listeners) {
				this._on(type, listeners[type], context);
			}
		} else {
			this._on(type, listener, context !== undefined ? context : this);
		}

		return this;
	},

	/**
	 * @typesign (type: string, listener: cellx~Listener, context?) -> this;
	 * @typesign (listeners?: { [type: string]: cellx~Listener }, context?) -> this;
	 */
	off: function off(type, listener, context) {
		if (type) {
			if (typeof type == 'object') {
				context = listener !== undefined ? listener : this;

				var listeners = type;

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
	},

	/**
	 * @typesign (type: string, listener: cellx~Listener, context);
	 */
	_on: function _on(type, listener, context) {
		var index = type.indexOf(':');

		if (index != -1) {
			var propName = type.slice(index + 1);

			EventEmitter.currentlySubscribing = true;
			(this[propName + 'Cell'] || (this[propName], this[propName + 'Cell']))
				.on(type.slice(0, index), listener, context);
			EventEmitter.currentlySubscribing = false;
		} else {
			var events = this._events.get(type);
			var evt = { listener, context };

			if (!events) {
				this._events.set(type, evt);
			} else if (Array.isArray(events)) {
				events.push(evt);
			} else {
				this._events.set(type, [events, evt]);
			}
		}
	},

	/**
	 * @typesign (type: string, listener: cellx~Listener, context);
	 */
	_off: function _off(type, listener, context) {
		var index = type.indexOf(':');

		if (index != -1) {
			var propName = type.slice(index + 1);

			(this[propName + 'Cell'] || (this[propName], this[propName + 'Cell']))
				.off(type.slice(0, index), listener, context);
		} else {
			var events = this._events.get(type);

			if (!events) {
				return;
			}

			var evt;

			if (!Array.isArray(events)) {
				evt = events;
			} else if (events.length == 1) {
				evt = events[0];
			} else {
				for (var i = events.length; i;) {
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
	},

	/**
	 * @typesign (type: string, listener: cellx~Listener, context?) -> cellx~Listener;
	 */
	once: function once(type, listener, context) {
		if (context === undefined) {
			context = this;
		}

		function wrapper(evt) {
			this._off(type, wrapper, context);
			return listener.call(this, evt);
		}

		this._on(type, wrapper, context);

		return wrapper;
	},

	/**
	 * @typesign (evt: cellx~Event) -> cellx~Event;
	 * @typesign (type: string) -> cellx~Event;
	 */
	emit: function emit(evt) {
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

		this._handleEvent(evt);

		return evt;
	},

	/**
	 * @typesign (evt: cellx~Event);
	 */
	_handleEvent: function _handleEvent(evt) {
		var events = this._events.get(evt.type);

		if (!events) {
			return;
		}

		if (Array.isArray(events)) {
			var eventCount = events.length;

			if (eventCount == 1) {
				if (this._tryEventListener(events[0], evt) === false) {
					evt.isPropagationStopped = true;
				}
			} else {
				events = events.slice();

				for (var i = 0; i < eventCount; i++) {
					if (this._tryEventListener(events[i], evt) === false) {
						evt.isPropagationStopped = true;
					}
				}
			}
		} else if (this._tryEventListener(events, evt) === false) {
			evt.isPropagationStopped = true;
		}
	},

	/**
	 * @typesign (emEvt: cellx~RegisteredEvent, evt: cellx~Event);
	 */
	_tryEventListener: function _tryEventListener(emEvt, evt) {
		try {
			return emEvt.listener.call(emEvt.context, evt);
		} catch (err) {
			error(err);
		}
	}
};
