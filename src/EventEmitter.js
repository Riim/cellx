import ErrorLogger from './ErrorLogger';
import { hasOwn } from './JS/Object';
import Map from './JS/Map';
import Symbol from './JS/Symbol';
import createClass from './Utils/createClass';

var KEY_INNER = Symbol('inner');

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
var EventEmitter = createClass({
	Static: {
		KEY_INNER: KEY_INNER
	},

	constructor: function EventEmitter() {
		/**
		 * @type {Object<Array<{
		 *     listener: (evt: cellx~Event) -> ?boolean,
		 *     context
		 * }>>}
		 */
		this._events = new Map();
	},

	/**
	 * @typesign (
	 *     type: string,
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.EventEmitter;
	 *
	 * @typesign (
	 *     listeners: Object<(evt: cellx~Event) -> ?boolean>,
	 *     context?
	 * ) -> cellx.EventEmitter;
	 */
	on: function on(type, listener, context) {
		if (typeof type == 'object') {
			context = arguments.length >= 2 ? listener : this;

			var listeners = type;

			for (type in listeners) {
				if (hasOwn.call(listeners, type)) {
					this._on(type, listeners[type], context);
				}
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
	 *     listeners: Object<(evt: cellx~Event) -> ?boolean>,
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
					if (hasOwn.call(listeners, type)) {
						this._off(type, listeners[type], context);
					}
				}
			} else {
				this._off(type, listener, argCount >= 3 ? context : this);
			}
		} else if (this._events) {
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
			this['_' + type.slice(index + 1)].on(type.slice(0, index), listener, context);
		} else {
			var events = (this._events || (this._events = new Map())).get(type);

			if (!events) {
				events = [];
				this._events.set(type, events);
			}

			events.push({
				listener: listener,
				context: context
			});
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
			this['_' + type.slice(index + 1)].off(type.slice(0, index), listener, context);
		} else {
			var events = this._events && this._events.get(type);

			if (!events) {
				return;
			}

			for (var i = events.length; i;) {
				var evtConfig = events[--i];

				if (
					(evtConfig.listener == listener || evtConfig.listener[KEY_INNER] === listener) &&
						evtConfig.context === context
				) {
					events.splice(i, 1);
					break;
				}
			}

			if (!events.length) {
				this._events.delete(type);
			}
		}
	},

	/**
	 * @typesign (
	 *     type: string,
	 *     listener: (evt: cellx~Event) -> ?boolean,
	 *     context?
	 * ) -> cellx.EventEmitter;
	 */
	once: function once(type, listener, context) {
		if (arguments.length < 3) {
			context = this;
		}

		function wrapper() {
			this._off(type, wrapper, context);
			return listener.apply(this, arguments);
		}
		wrapper[KEY_INNER] = listener;

		this._on(type, wrapper, context);

		return this;
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
	 * View.prototype = Object.create(EventEmitter.prototype);
	 * View.prototype.constructor = View;
	 *
	 * View.prototype.getParent = function() {
	 *     var node = this.element;
	 *
	 *     while (node = node.parentNode) {
	 *         if (node._view) {
	 *             return node._view;
	 *         }
	 *     }
	 *
	 *     return null;
	 * };
	 *
	 * View.prototype._handleEvent = function(evt) {
	 *     EventEmitter.prototype._handleEvent.call(this, evt);
	 *
	 *     if (evt.bubbles !== false && !evt.isPropagationStopped) {
	 *         var parent = this.getParent();
	 *
	 *         if (parent) {
	 *             parent._handleEvent(evt);
	 *         }
	 *     }
	 * };
	 */
	_handleEvent: function _handleEvent(evt) {
		var events = this._events && this._events.get(evt.type);

		if (events) {
			events = events.slice();

			for (var i = 0, l = events.length; i < l; i++) {
				if (this._tryEventHandler(events[i], evt) === false) {
					evt.isPropagationStopped = true;
				}
			}
		}
	},

	_tryEventHandler: function _tryEventHandler(evtConfig, evt) {
		try {
			return evtConfig.listener.call(evtConfig.context, evt);
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
});

export default EventEmitter;
