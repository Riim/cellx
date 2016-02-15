/**
 * @typedef {{
 *     target?: Object,
 *     type: string,
 *     bubbles?: boolean,
 *     isPropagationStopped?: boolean
 * }} cellx~Event
 */

var EventEmitter;

(function() {

	var KEY_INNER = '__cellx_EventEmitter_inner__';

	if (global.Symbol && typeof Symbol.iterator == 'symbol') {
		KEY_INNER = Symbol(KEY_INNER);
	}

	/**
	 * @class cellx.EventEmitter
	 * @extends {Object}
	 * @typesign new () -> cellx.EventEmitter;
	 */
	EventEmitter = createClass({
		Static: {
			KEY_INNER: KEY_INNER
		},

		constructor: function EventEmitter() {
			/**
			 * @type {Object<Array<{ listener: (evt: cellx~Event) -> boolean|undefined, context: Object }>>}
			 */
			this._events = Object.create(null);
		},

		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event) -> boolean|undefined,
		 *     context?: Object
		 * ) -> cellx.EventEmitter;
		 *
		 * @typesign (
		 *     listeners: Object<(evt: cellx~Event) -> boolean|undefined>,
		 *     context?: Object
		 * ) -> cellx.EventEmitter;
		 */
		on: function on(type, listener, context) {
			if (typeof type == 'object') {
				context = listener;

				var listeners = type;

				for (type in listeners) {
					if (hasOwn.call(listeners, type)) {
						this._on(type, listeners[type], context);
					}
				}
			} else {
				this._on(type, listener, context);
			}

			return this;
		},
		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event) -> boolean|undefined,
		 *     context?: Object
		 * ) -> cellx.EventEmitter;
		 *
		 * @typesign (
		 *     listeners: Object<(evt: cellx~Event) -> boolean|undefined>,
		 *     context?: Object
		 * ) -> cellx.EventEmitter;
		 *
		 * @typesign () -> cellx.EventEmitter;
		 */
		off: function off(type, listener, context) {
			if (type) {
				if (typeof type == 'object') {
					context = listener;

					var listeners = type;

					for (type in listeners) {
						if (hasOwn.call(listeners, type)) {
							this._off(type, listeners[type], context);
						}
					}
				} else {
					this._off(type, listener, context);
				}
			} else if (this._events) {
				this._events = Object.create(null);
			}

			return this;
		},

		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event) -> boolean|undefined,
		 *     context?: Object
		 * );
		 */
		_on: function _on(type, listener, context) {
			var index = type.indexOf(':');

			if (index != -1) {
				this['_' + type.slice(index + 1)]('on', type.slice(0, index), listener, context);
			} else {
				var events = (this._events || (this._events = Object.create(null)))[type];

				if (!events) {
					events = this._events[type] = [];
				}

				events.push({
					listener: listener,
					context: context || this
				});
			}
		},
		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event) -> boolean|undefined,
		 *     context?: Object
		 * );
		 */
		_off: function _off(type, listener, context) {
			var index = type.indexOf(':');

			if (index != -1) {
				this['_' + type.slice(index + 1)]('off', type.slice(0, index), listener, context);
			} else {
				var events = this._events && this._events[type];

				if (!events) {
					return;
				}

				if (!context) {
					context = this;
				}

				for (var i = events.length; i;) {
					var evt = events[--i];

					if (evt.context == context && (evt.listener == listener || evt.listener[KEY_INNER] === listener)) {
						events.splice(i, 1);
						break;
					}
				}

				if (!events.length) {
					delete this._events[type];
				}
			}
		},

		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event) -> boolean|undefined,
		 *     context?: Object
		 * ) -> cellx.EventEmitter;
		 */
		once: function once(type, listener, context) {
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
		 *     var parent = this.getParent();
		 *
		 *     if (parent && evt.bubbles !== false && !evt.isPropagationStopped) {
		 *         parent._handleEvent(evt);
		 *     }
		 * };
		 */
		_handleEvent: function _handleEvent(evt) {
			var events = this._events && this._events[evt.type];

			if (events) {
				events = events.slice();

				for (var i = 0, l = events.length; i < l; i++) {
					try {
						if (events[i].listener.call(events[i].context, evt) === false) {
							evt.isPropagationStopped = true;
						}
					} catch (err) {
						this._logError(err);
					}
				}
			}
		},

		/**
		 * @typesign (...msg);
		 */
		_logError: function _logError() {
			cellx._logError.apply(cellx, arguments);
		}
	});

	cellx.EventEmitter = EventEmitter;

})();
