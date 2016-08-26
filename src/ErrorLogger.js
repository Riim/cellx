var ErrorLogger = {
	_handler: null,

	/**
	 * @typesign (handler: (...msg));
	 */
	setHandler: function setHandler(handler) {
		this._handler = handler;
	},

	/**
	 * @typesign (...msg);
	 */
	log: function log() {
		this._handler.apply(this, arguments);
	}
};

export default ErrorLogger;
