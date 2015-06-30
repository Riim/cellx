(function() {
	var Map = cellx.Map;
	var Set = cellx.Set;
	var Event = cellx.Event;

	/**
	 * @class cellx.EventEmitter
	 * @extends {Object}
	 * @typesign new (): cellx.EventEmitter;
	 */
	function EventEmitter() {
		/**
		 * @type {Map<string, Set<{ listener: Function, context: Object }>>}
		 */
		this._events = new Map();
	}

	assign(EventEmitter.prototype, {
		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx.Event): boolean|undefined,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 *
		 * @typesign (
		 *     listeners: Object<(evt: cellx.Event): boolean|undefined>,
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
		 *     listener: (evt: cellx.Event): boolean|undefined,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 *
		 * @typesign (
		 *     listeners: Object<(evt: cellx.Event): boolean|undefined>,
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
				this._events.clear();
			}

			return this;
		},

		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx.Event): boolean|undefined,
		 *     context?: Object
		 * );
		 */
		_on: function(type, listener, context) {
			var events = (this._events || (this._events = new Map())).get(type);

			if (events) {
				events.add({ listener: listener, context: context || this });
			} else {
				this._events.set(type, new Set([{ listener: listener, context: context || this }]));
			}
		},
		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx.Event): boolean|undefined,
		 *     context?: Object
		 * );
		 */
		_off: function(type, listener, context) {
			var events = this._events || (this._events = new Map()).get(type);

			if (!events) {
				return;
			}

			if (!context) {
				context = this;
			}

			for (var iterator = events.values(), step; !(step = iterator.next()).done;) {
				var evt = step.value;

				if (evt.context == context) {
					var evtListener = evt.listener;

					if (
						evtListener == listener ||
							(evtListener.hasOwnProperty(KEY_INNER) && evtListener[KEY_INNER] == listener)
					) {
						events['delete'](evt);
						break;
					}
				}
			}
		},

		/**
		 * @typesign (
		 *     type: string,
		 *     listener: (evt: cellx.Event): boolean|undefined,
		 *     context?: Object
		 * ): cellx.EventEmitter;
		 */
		once: function(type, listener, context) {
			function wrap() {
				this._off(type, wrap, context);
				listener.apply(this, arguments);
			}
			wrap[KEY_INNER] = listener;

			this._on(type, wrap, context);

			return this;
		},

		/**
		 * @typesign (evt: cellx.Event, detail?: Object): cellx.Event;
		 * @typesign (type: string, detail?: Object): cellx.Event;
		 */
		emit: function(evt, detail) {
			if (typeof evt == 'string') {
				evt = new Event(evt);
			} else if (evt.hasOwnProperty(KEY_USED)) {
				throw new TypeError('Attempt to use an object that is no longer usable');
			}

			evt[KEY_USED] = true;

			evt.target = this;
			evt.timestamp = now();

			if (detail) {
				evt.detail = detail;
			}

			this._handleEvent(evt);

			return evt;
		},

		/**
		 * @typesign (evt: cellx.Event);
		 */
		_handleEvent: function(evt) {
			var type = evt.type;
			var events = this._events && this._events.get(type);

			if (!events) {
				return;
			}

			for (var iterator = events.values(), step; !(step = iterator.next()).done;) {
				if (evt.isImmediatePropagationStopped) {
					break;
				}

				try {
					if (step.value.listener.call(step.value.context, evt) === false) {
						evt.stopPropagation();
					}
				} catch (err) {
					this._logError(err);
				}
			}
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
