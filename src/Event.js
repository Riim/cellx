(function() {
	/**
	 * @class cellx.Event
	 * @extends {Object}
	 * @typesign new (type: string, canBubble: boolean = true): cellx.Event;
	 */
	function Event(type, canBubble) {
		this.type = type;

		if (canBubble === false) {
			this.bubbles = false;
		}
	}

	assign(Event.prototype, {
		/**
		 * Объект, к которому применено событие.
		 * @type {?Object}
		 * @writable
		 */
		target: null,

		/**
		 * @type {string}
		 */
		type: undefined,

		/**
		 * @type {int|undefined}
		 * @writable
		 */
		timestamp: undefined,

		/**
		 * Дополнительная информация по событию.
		 * @type {?Object}
		 * @writable
		 */
		detail: null,

		/**
		 * Является ли событие всплывающим.
		 */
		bubbles: true,

		/**
		 * Распространение события на другие объекты остановлено.
		 */
		isPropagationStopped: false,
		/**
		 * Распространение события на другие объекты и его обработка на текущем остановлены.
		 */
		isImmediatePropagationStopped: false,

		/**
		 * Останавливает распространение события на другие объекты.
		 * @typesign ();
		 */
		stopPropagation: function() {
			this.isPropagationStopped = true;
		},

		/**
		 * Останавливает распространение события на другие объекты, а также его обработку на текущем.
		 * @typesign ();
		 */
		stopImmediatePropagation: function() {
			this.isPropagationStopped = true;
			this.isImmediatePropagationStopped = true;
		}
	});

	cellx.Event = Event;
})();
