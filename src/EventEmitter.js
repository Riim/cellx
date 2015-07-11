/**
 * @typedef {{ target?: Object, type: string }} cellx~Event
 */

(function() {
	var Dictionary = cellx.Dictionary;

	/**
	 * @class cellx.EventEmitter
	 * @extends {Object}
	 * @typesign new (): cellx.EventEmitter;
	 */
	function EventEmitter() {
		/**
		 * @type {cellx.Dictionary<Array<{ listener: Function, context: Object }>>}
		 */
		this._events = new Dictionary();
	}

	assign(EventEmitter.prototype, {
		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event): boolean|undefined,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 *
		 * @typesign (
		 *     listeners: Object<(evt: cellx~Event): boolean|undefined>,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 */
		on: function(type, listener, context) {
			if (typeof type == 'object') {
				context = listener;

				var listeners = type;

				for (type in listeners) {
					this._on(type, listeners[type], context);
				}
			} else {
				this._on(type, listener, context);
			}

			return this;
		},
		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event): boolean|undefined,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 *
		 * @typesign (
		 *     listeners: Object<(evt: cellx~Event): boolean|undefined>,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 *
		 * @typesign (): cellx.EventEmitter;
		 */
		off: function(type, listener, context) {
			if (type) {
				if (typeof type == 'object') {
					context = listener;

					var listeners = type;

					for (type in listeners) {
						this._off(type, listeners[type], context);
					}
				} else {
					this._off(type, listener, context);
				}
			} else if (this._events) {
				this._events = new Dictionary();
			}

			return this;
		},

		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event): boolean|undefined,
		 *     context?: Object
		 * );
		 */
		_on: function(type, listener, context) {
			var events = (this._events || (this._events = new Dictionary()))[type];

			if (!events) {
				events = this._events[type] = [];
			}

			events.push({
				listener: listener,
				context: context || this
			});
		},
		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event): boolean|undefined,
		 *     context?: Object
		 * );
		 */
		_off: function(type, listener, context) {
			var events = this._events && this._events[type];

			if (!events) {
				return;
			}

			if (!context) {
				context = this;
			}

			for (var i = events.length; i;) {
				if (events[--i].context == context) {
					var lst = events[i].listener;

					if (lst == listener || (lst.hasOwnProperty(KEY_INNER) && lst[KEY_INNER] == listener)) {
						events.splice(i, 1);
						break;
					}
				}
			}

			if (!events.length) {
				delete this._events[type];
			}
		},

		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx~Event): boolean|undefined,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 */
		once: function(type, listener, context) {
			function wrap() {
				this._off(type, wrap, context);
				return listener.apply(this, arguments);
			}
			wrap[KEY_INNER] = listener;

			this._on(type, wrap, context);

			return this;
		},

		/**
		 * @typesign (evt: { type: string }): cellx~Event;
		 * @typesign (type: string): cellx~Event;
		 */
		emit: function(evt) {
			if (typeof evt == 'string') {
				evt = {
					target: this,
					type: evt
				};
			} else if (evt.target === undefined) {
				evt.target = this;
			}

			var events = this._events && this._events[evt.type];

			if (!events) {
				return evt;
			}

			events = events.slice();

			for (var i = 0, l = events.length; i < l; i++) {
				try {
					if (events[i].listener.call(events[i].context, evt) === false) {
						evt.isPropagationStopped = true;
						break;
					}
				} catch (err) {
					this._logError(err);
				}
			}

			return evt;
		},

		/**
		 * @typesign (err);
		 */
		_logError: function(err) {
			cellx.logError(err);
		}
	});

	cellx.EventEmitter = EventEmitter;
})();
