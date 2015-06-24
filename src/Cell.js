(function() {
	var Map = cellx.Map;
	var Set = cellx.Set;
	var nextTick = cellx.nextTick;
	var Event = cellx.Event;
	var EventEmitter = cellx.EventEmitter;

	var onEvent = EventEmitter.prototype.on;
	var offEvent = EventEmitter.prototype.off;
	var _onEvent = EventEmitter.prototype._on;
	var _offEvent = EventEmitter.prototype._off;

	var STATE_CHANGES_COMBINING = 0;
	var STATE_CHANGES_HANDLING = 1;
	var STATE_SLAVES_RECALCULATION = 2;

	var state = STATE_CHANGES_COMBINING;

	/**
	 * @type {Map<cellx.Cell, { event: cellx.Event, cancellable: boolean }>}
	 */
	var changes = new Map();
	/**
	 * @type {Array<cellx.Cell>}
	 */
	var outdatedCells = [];
	var outdatedCellSet = new Set();

	/**
	 * @type {Map<cellx.Cell, uint>}
	 */
	var circularityDetectionCounter = new Map();

	var releaseVersion = 0;

	/**
	 * @typesign (cell: cellx.Cell, skipSet: boolean);
	 */
	function registerOutdatedCell(cell, skipSet) {
		if (!skipSet) {
			if (outdatedCellSet.has(cell)) {
				return;
			}

			outdatedCellSet.add(cell);
		}

		if (outdatedCells.length) {
			var maxMasterLevel = cell._maxMasterLevel;
			var low = 0;
			var high = outdatedCells.length;

			while (low != high) {
				var mid = (low + high) >> 1;

				if (maxMasterLevel < outdatedCells[mid]._maxMasterLevel) {
					low = mid + 1;
				} else {
					high = mid;
				}
			}

			outdatedCells.splice(low, 0, cell);
		} else {
			outdatedCells.push(cell);
		}
	}

	/**
	 * @typesign ();
	 */
	function handleChanges() {
		state = STATE_CHANGES_HANDLING;

		do {
			for (var iterator = changes.entries(), step; !(step = iterator.next()).done;) {
				var cell = step.value[0];

				changes['delete'](cell);
				cell._slaves.forEach(function(slave) {
					registerOutdatedCell(slave, false);
				});

				cell._fixedValue = cell._value;
				cell._changed = true;

				cell._handleEvent(step.value[1].event);

				if (state != STATE_CHANGES_HANDLING) {
					return;
				}
			}
		} while (changes.size);
	}

	/**
	 * @typesign ();
	 */
	function releaseChanges() {
		if (
			(state == STATE_CHANGES_COMBINING || state == STATE_CHANGES_HANDLING) && changes.size ||
				state == STATE_SLAVES_RECALCULATION
		) {
			handleChanges();

			if (state != STATE_CHANGES_HANDLING) {
				return;
			}
		} else if (state == STATE_CHANGES_COMBINING) {
			return;
		}

		state = STATE_SLAVES_RECALCULATION;

		for (var outdatedCellCount; outdatedCellCount = outdatedCells.length;) {
			var cell = outdatedCells[outdatedCellCount - 1];

			if (cell._recalc()) {
				registerOutdatedCell(outdatedCells.pop(), true);
			} else {
				if (state != STATE_SLAVES_RECALCULATION) {
					return;
				}

				outdatedCells.pop();
				outdatedCellSet['delete'](cell);
			}

			if (changes.size) {
				handleChanges();

				if (state != STATE_CHANGES_HANDLING) {
					return;
				}

				state = STATE_SLAVES_RECALCULATION;
			}
		}

		state = STATE_CHANGES_COMBINING;
		circularityDetectionCounter.clear();

		releaseVersion++;
	}

	/**
	 * @typesign (cell: cellx.Cell, change: cellx.Event|Object, cancellable: boolean = true);
	 */
	function addChange(cell, change, cancellable) {
		var evt;

		if (change instanceof Event) {
			evt = change;
		} else {
			evt = new Event('change');
			evt.target = cell;
			evt.timestamp = now();
			evt.detail = change;
		}

		if (changes.size) {
			change = changes.get(cell);

			if (change) {
				(evt.detail || (evt.detail = {})).prevEvent = change.event;
				change.event = evt;

				if (cancellable === false) {
					change.cancellable = false;
				}

				return;
			}
		} else {
			if (state == STATE_CHANGES_COMBINING) {
				nextTick(releaseChanges);
			}
		}

		changes.set(cell, {
			event: evt,
			cancellable: cancellable !== false
		});
	}

	var detectedMasters = [];

	/**
	 * @class cellx.Cell
	 * @extends {cellx.EventEmitter}
	 *
	 * @example
	 * var a = new Cell(1);
	 * var b = new Cell(2);
	 * var c = new Cell(function() {
	 *     return a.read() + b.read();
	 * });
	 *
	 * c.on('change', function() {
	 *     console.log('c = ' + c.read());
	 * });
	 *
	 * console.log(c.read());
	 * // => 3
	 *
	 * a.write(5);
	 * b.write(10);
	 * // => 'c = 15'
	 *
	 * @typesign new (value?, opts?: {
	 *     owner?: Object,
	 *     read?: (value): *,
	 *     validate?: (value): *,
	 *     onchange?: (evt: cellx.Event),
	 *     onerror?: (evt: cellx.Event),
	 *     computed?: false
	 * }): cellx.Cell;
	 *
	 * @typesign new (formula: (): *, opts?: {
	 *     owner?: Object,
	 *     read?: (value): *,
	 *     write?: (value),
	 *     validate?: (value): *,
	 *     onchange?: (evt: cellx.Event),
	 *     onerror?: (evt: cellx.Event),
	 *     computed?: true,
	 *     pureComputed: boolean = false
	 * }): cellx.Cell;
	 */
	function Cell(value, opts) {
		EventEmitter.call(this);

		if (!opts) {
			opts = {};
		}

		var owner;

		if (opts.owner) {
			owner = this.owner = opts.owner;
		}

		var formula;

		if (
			typeof value == 'function' &&
				(opts.computed !== undefined ? opts.computed : value.constructor == Function)
		) {
			formula = this._formula = value;
		}

		if (opts.read) {
			this._read = opts.read;
		}
		if (opts.write) {
			this._write = opts.write;
		}

		if (opts.validate) {
			this._validate = opts.validate;
		}

		this._slaves = new Set();

		if (opts.onchange) {
			this.on('change', opts.onchange, owner);
		}
		if (opts.onerror) {
			this.on('error', opts.onerror, owner);
		}

		if (formula) {
			this.computed = true;

			if (this._events.size) {
				this._startUpdating();
			}
		} else {
			this._value = this._fixedValue = this.initialValue = value;

			if (value instanceof EventEmitter) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (opts.pureComputed) {
			this.pureComputed = true;
		}
	}
	extend(Cell, EventEmitter);

	assign(Cell.prototype, {
		/**
		 * @type {?Object}
		 */
		owner: null,

		/**
		 * @type {*}
		 */
		_value: undefined,
		/**
		 * @type {*}
		 */
		_fixedValue: undefined,
		/**
		 * @type {*}
		 */
		initialValue: undefined,
		/**
		 * @type {?Function}
		 */
		_formula: null,

		/**
		 * @type {?Function}
		 */
		_read: null,
		/**
		 * @type {?Function}
		 */
		_write: null,

		/**
		 * @type {?Function}
		 */
		_validate: null,

		/**
		 * Ведущие ячейки.
		 * @type {Set<cellx.Cell>}
		 */
		_masters: null,
		/**
		 * Ведомые ячейки.
		 * @type {Set<cellx.Cell>}
		 */
		_slaves: null,

		/**
		 * @type {int|undefined}
		 */
		_maxMasterLevel: undefined,

		/**
		 * @type {?cellx.Event}
		 */
		_lastErrorEvent: null,

		/**
		 * @type {uint|undefined}
		 */
		_version: undefined,

		computed: false,

		pureComputed: false,

		_changed: false,

		/**
		 * @typesign (): boolean;
		 */
		changed: function() {
			if (changes.size) {
				releaseChanges();
			}

			return this._changed;
		},

		_currentlyClearing: false,

		/**
		 * @override cellx.EventEmitter#on
		 */
		on: function(type, listener, context) {
			if (changes.size) {
				releaseChanges();
			}

			if (this.computed && !this._events.size && !this._slaves.size) {
				this._startUpdating();
			}

			return onEvent.call(this, type, listener, context);
		},
		/**
		 * @override cellx.EventEmitter#off
		 */
		off: function(type, listener, context) {
			if (changes.size) {
				releaseChanges();
			}

			offEvent.call(this, type, listener, context);

			if (this.computed && !this._events.size && !this._slaves.size) {
				this._stopUpdating();
			}

			return this;
		},

		/**
		 * @override cellx.EventEmitter#_on
		 */
		_on: function(type, listener, context) {
			_onEvent.call(this, type, listener, context || this.owner);
		},
		/**
		 * @override cellx.EventEmitter#_off
		 */
		_off: function(type, listener, context) {
			_offEvent.call(this, type, listener, context || this.owner);
		},

		/**
		 * @typesign (listener: (evt: cellx.Event): boolean|undefined): cellx.Cell;
		 */
		subscribe: function(listener) {
			function wrap(evt) {
				listener.call(this, evt.type == 'change' ? null : evt.detail.error, evt);
			}
			wrap[KEY_INNER] = listener;

			this
				.on('change', wrap)
				.on('error', wrap);

			return this;
		},

		/**
		 * @typesign (listener: (evt: cellx.Event): boolean|undefined): cellx.Cell;
		 */
		unsubscribe: function(listener) {
			this
				.off('change', listener)
				.off('error', listener);

			return this;
		},

		/**
		 * @typesign (slave: cellx.Cell);
		 */
		_registerSlave: function(slave) {
			if (this.computed && !this._events.size && !this._slaves.size) {
				this._startUpdating();
			}

			this._slaves.add(slave);
		},

		/**
		 * @typesign (slave: cellx.Cell);
		 */
		_unregisterSlave: function(slave) {
			this._slaves['delete'](slave);

			if (this.computed && !this._events.size && !this._slaves.size) {
				this._stopUpdating();
			}
		},

		/**
		 * @typesign (evt: cellx.Event);
		 */
		_onValueChange: function(evt) {
			addChange(this, evt, this._value !== this._fixedValue);
		},

		/**
		 * @typesign (): *;
		 */
		read: function() {
			if (detectedMasters.length) {
				detectedMasters[0].add(this);
			}

			if (state == STATE_CHANGES_HANDLING || changes.size) {
				releaseChanges();
			}

			var value = this._value;

			if (this.computed && this._version != releaseVersion && !this._events.size) {
				try {
					value = this._value = this._fixedValue = this._formula.call(this.owner || this);
				} catch (err) {
					this._handleError(err);
				}

				this._version = releaseVersion;
			}

			if (this._read) {
				return this.computed ? this._read.call(this.owner || this, value) : this._read(value);
			}

			return value;
		},

		/**
		 * @typesign (value): boolean;
		 */
		write: function(value) {
			var oldValue = this._value;

			if (svz(oldValue, value)) {
				return false;
			}

			if (this.computed && !this._write) {
				throw new TypeError('Cannot write to read-only cell');
			}

			if (this._validate) {
				this._validate.call(this.owner || this, value);
			}

			if (this.computed) {
				this._write.call(this.owner || this, value);
			} else {
				this._value = value;

				if (svz(value, this._fixedValue) && changes.get(this).cancellable) {
					changes['delete'](this);
					return true;
				}

				if (oldValue instanceof EventEmitter) {
					oldValue.off('change', this._onValueChange, this);
				}
				if (value instanceof EventEmitter) {
					value.on('change', this._onValueChange, this);
				}

				addChange(this, {
					oldValue: oldValue,
					value: value
				});
			}

			return true;
		},

		/**
		 * @typesign ();
		 */
		_startUpdating: function() {
			detectedMasters.unshift(new Set());

			try {
				this._value = this._fixedValue = this._formula.call(this.owner || this);
			} catch (err) {
				this._handleError(err);
			}

			this._masters = detectedMasters.shift();

			var maxMasterLevel = 1;

			this._masters.forEach(function(master) {
				master._registerSlave(this);

				if (maxMasterLevel <= master._maxMasterLevel) {
					maxMasterLevel = master._maxMasterLevel + 1;
				}
			}, this);

			this._maxMasterLevel = maxMasterLevel;
			this._version = releaseVersion;
		},

		/**
		 * @typesign ();
		 */
		_stopUpdating: function() {
			this._masters.forEach(function(master) {
				master._unregisterSlave(this);
			}, this);

			this._masters = null;
			this._maxMasterLevel = undefined;
		},

		/**
		 * @typesign (): boolean;
		 */
		_recalc: function() {
			var pureComputed = this.pureComputed;

			var value;
			var err;

			if (!pureComputed) {
				var callCount = circularityDetectionCounter.get(this);

				if (callCount === 10) {
					this._handleError(new RangeError('Circular dependency detected'));
					return false;
				}

				circularityDetectionCounter.set(this, (callCount || 0) + 1);

				detectedMasters.unshift(new Set());
			}

			try {
				value = this._formula.call(this.owner || this);

				if (state != STATE_SLAVES_RECALCULATION) {
					if (!pureComputed) {
						detectedMasters.shift();
					}

					return false;
				}

				if (this._validate) {
					this._validate(value);

					if (state != STATE_SLAVES_RECALCULATION) {
						if (!pureComputed) {
							detectedMasters.shift();
						}

						return false;
					}
				}
			} catch (error) {
				err = error;
			}

			if (!pureComputed) {
				var oldMasters = this._masters;
				var masters = this._masters = detectedMasters.shift();
				var removedMasterCount = 0;

				oldMasters.forEach(function(master) {
					if (!masters.has(master)) {
						master._unregisterSlave(this);
						removedMasterCount++;
					}
				}, this);

				if (oldMasters.size - removedMasterCount < masters.size) {
					var maxMasterLevel = 1;

					masters.forEach(function(master) {
						if (!oldMasters.has(master)) {
							master._registerSlave(this);
						}

						if (maxMasterLevel <= master._maxMasterLevel) {
							maxMasterLevel = master._maxMasterLevel + 1;
						}
					}, this);

					if (this._maxMasterLevel != maxMasterLevel) {
						if (
							this._maxMasterLevel < maxMasterLevel && outdatedCells.length > 1 &&
								maxMasterLevel > outdatedCells[outdatedCells.length - 2]._maxMasterLevel
						) {
							this._maxMasterLevel = maxMasterLevel;
							return true;
						}

						this._maxMasterLevel = maxMasterLevel;
					}
				}
			}

			if (err) {
				this._handleError(err);
			} else {
				var oldValue = this._value;

				if (!svz(oldValue, value)) {
					this._value = value;

					addChange(this, {
						oldValue: oldValue,
						value: value
					});
				}
			}

			this._version = releaseVersion + 1;

			return false;
		},

		/**
		 * @typesign (err);
		 */
		_handleError: function(err) {
			var evt = new Event('error');
			evt.target = this;
			evt.timestamp = now();
			evt.detail = { error: err };

			this._handleErrorEvent(evt);
		},

		/**
		 * @typesign (evt: cellx.Event);
		 */
		_handleErrorEvent: function(evt) {
			if (this._lastErrorEvent === evt) {
				return;
			}

			this._lastErrorEvent = evt;

			this._handleEvent(evt);

			for (var iterator = this._slaves.values(), step; !(step = iterator.next()).done;) {
				if (evt.propagationStopped) {
					break;
				}

				step.value._handleErrorEvent(evt);
			}
		},

		/**
		 * @typesign ();
		 */
		clear: function() {
			if (changes.size) {
				releaseChanges();
			}

			this._clear();
		},

		/**
		 * @typesign ();
		 */
		_clear: function() {
			if (this._currentlyClearing) {
				return;
			}

			this._currentlyClearing = true;

			this._slaves.forEach(function(slave) {
				slave._clear();
			});

			this.off();

			this._currentlyClearing = false;
		}
	});

	cellx.Cell = Cell;
})();
