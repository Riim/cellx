(function() {
	/**
	 * @class cellx.Event
	 * @extends {Object}
	 * @typesign new (type: string, canBubble: boolean = true): cellx.Event;
	 */
	function Event(type, canBubble) {
		/**
		 * Объект, к которому применено событие.
		 * @type {?Object}
		 * @writable
		 */
		this.target = null;

		/**
		 * @type {string}
		 */
		this.type = type;

		/**
		 * @type {int|undefined}
		 * @writable
		 */
		this.timestamp = undefined;

		/**
		 * Дополнительная информация по событию.
		 * @type {?Object}
		 * @writable
		 */
		this.detail = null;

		/**
		 * Является ли событие всплывающим.
		 */
		this.bubbles = canBubble !== false;

		/**
		 * Распространение события на другие объекты остановлено.
		 */
		this.isPropagationStopped = false;
		/**
		 * Распространение события на другие объекты и его обработка на текущем остановлены.
		 */
		this.isImmediatePropagationStopped = false;
	}

	assign(Event.prototype, {
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
