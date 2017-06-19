import ErrorLogger from './ErrorLogger';
import Map from './JS/Map';

var IS_EVENT = {};

/**
 * @typedef {{
 *     listener: (evt: cellx~Event) -> ?boolean,
 *     context
 * }} cellx~EmitterEvent
 */

/**
 * @typedef {{
 *     target?: Object,
 *     type: string,
 *     bubbles?: boolean,
 *     isPropagationStopped?: boolean
 * }} cellx~Event
 */

/**
 * @class cellx.EventEmitter
 * @extends {Object}
 * @typesign new EventEmitter() -> cellx.EventEmitter;
 */
export default function EventEmitter() {
	/**
	 * @type {{ [type: string]: cellx~EmitterEvent | Array<cellx~EmitterEvent> }}
	 */
	this._events = new Map();
}

EventEmitter.currentlySubscribing = false;

EventEmitter.prototype = {
	constructor: EventEmitter,

	/**
	 * @typesign () -> { [type: string]: Array<cellx~EmitterEvent> };
	 * @typesign (type: string) -> Array<cellx~EmitterEvent>;
	 */
	getEvents: function getEvents(type) {
		var events;

		if (type) {
			events = this._events.get(type);

			if (!events) {
				return [];
			}

			return events._isEvent === IS_EVENT ? [events] : events;
		}

		events = Object.create(null);

		this._events.forEach(function(typeEvents, type) {
			events[type] = typeEvents._isEvent === IS_EVENT ? [typeEvents] : typeEvents;
		});

		return events;
	},

	/**
	 * @typesign (
	 *     type: string,
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.EventEmitter;
	 *
	 * @typesign (
	 *     listeners: { [type: string]: (evt: cellx~Event) -> ?boolean },
	 *     context?
	 * ) -> cellx.EventEmitter;
	 */
	on: function on(type, listener, context) {
		if (typeof type == 'object') {
			context = arguments.length >= 2 ? listener : this;

			var listeners = type;

			for (type in listeners) {
				this._on(type, listeners[type], context);
			}
		} else {
			this._on(type, listener, arguments.length >= 3 ? context : this);
		}

		return this;
	},
	/**
	 * @typesign (
	 *     type: string,
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.EventEmitter;
	 *
	 * @typesign (
	 *     listeners: { [type: string]: (evt: cellx~Event) -> ?boolean },
	 *     context?
	 * ) -> cellx.EventEmitter;
	 *
	 * @typesign () -> cellx.EventEmitter;
	 */
	off: function off(type, listener, context) {
		var argCount = arguments.length;

		if (argCount) {
			if (typeof type == 'object') {
				context = argCount >= 2 ? listener : this;

				var listeners = type;

				for (type in listeners) {
					this._off(type, listeners[type], context);
				}
			} else {
				this._off(type, listener, argCount >= 3 ? context : this);
			}
		} else {
			this._events.clear();
		}

		return this;
	},

	/**
	 * @typesign (
	 *     type: string,
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context
	 * );
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
			var evt = {
				_isEvent: IS_EVENT,
				listener,
				context
			};

			if (!events) {
				this._events.set(type, evt);
			} else if (events._isEvent === IS_EVENT) {
				this._events.set(type, [events, evt]);
			} else {
				events.push(evt);
			}
		}
	},
	/**
	 * @typesign (
	 *     type: string,
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context
	 * );
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

			var isEvent = events._isEvent === IS_EVENT;
			var evt;

			if (isEvent || events.length == 1) {
				evt = isEvent ? events : events[0];

				if (evt.listener == listener && evt.context === context) {
					this._events.delete(type);
				}
			} else {
				for (var i = events.length; i;) {
					evt = events[--i];

					if (evt.listener == listener && evt.context === context) {
						events.splice(i, 1);
						break;
					}
				}
			}
		}
	},

	/**
	 * @typesign (
	 *     type: string,
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> (evt: cellx~Event) -> ?boolean;
	 */
	once: function once(type, listener, context) {
		if (arguments.length < 3) {
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
	 *
	 * For override:
	 * @example
	 * function View(el) {
	 *     this.element = el;
	 *     el._view = this;
	 * }
	 *
	 * View.prototype = {
	 *     __proto__: EventEmitter.prototype,
	 *     constructor: View,
	 *
	 *     getParent: function() {
	 *         var node = this.element;
	 *
	 *         while (node = node.parentNode) {
	 *             if (node._view) {
	 *                 return node._view;
	 *             }
	 *         }
	 *
	 *         return null;
	 *     },
	 *
	 *     _handleEvent: function(evt) {
	 *         EventEmitter.prototype._handleEvent.call(this, evt);
	 *
	 *         if (evt.bubbles !== false && !evt.isPropagationStopped) {
	 *             var parent = this.getParent();
	 *
	 *             if (parent) {
	 *                 parent._handleEvent(evt);
	 *             }
	 *         }
	 *     }
	 * };
	 */
	_handleEvent: function _handleEvent(evt) {
		var events = this._events.get(evt.type);

		if (!events) {
			return;
		}

		if (events._isEvent === IS_EVENT) {
			if (this._tryEventListener(events, evt) === false) {
				evt.isPropagationStopped = true;
			}
		} else {
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
		}
	},

	/**
	 * @typesign (emEvt: cellx~EmitterEvent, evt: cellx~Event);
	 */
	_tryEventListener: function _tryEventListener(emEvt, evt) {
		try {
			return emEvt.listener.call(emEvt.context, evt);
		} catch (err) {
			this._logError(err);
		}
	},

	/**
	 * @typesign (...msg);
	 */
	_logError: function _logError() {
		ErrorLogger.log.apply(ErrorLogger, arguments);
	}
};
