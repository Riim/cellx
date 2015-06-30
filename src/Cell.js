(function() {
	var Map = cellx.Map;
	var Set = cellx.Set;
	var nextTick = cellx.nextTick;
	var Event = cellx.Event;
	var EventEmitter = cellx.EventEmitter;

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

	var handledCell = null;
	var calculatedCell = null;

	/**
	 * @type {Set<cellx.Cell>}
	 */
	var detectedMasters = null;

	var releaseVersion = 1;

	/**
	 * @typesign (cell: cellx.Cell);
	 */
	function registerOutdatedCell(cell) {
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
	 * @typesign (cell: cellx.Cell);
	 */
	function registerOutdatedCellIf(cell) {
		if (cell._outdated) {
			return;
		}

		registerOutdatedCell(cell);
		cell._outdated = true;
	}

	/**
	 * @typesign ();
	 */
	function handleChanges() {
		state = STATE_CHANGES_HANDLING;

		for (var iterator = changes.entries(), step; !(step = iterator.next()).done;) {
			var cell = step.value[0];

			changes['delete'](cell);

			cell._slaves.forEach(registerOutdatedCellIf);

			if (handledCell === cell) {
				return;
			}

			var prevHandledCell = handledCell;
			handledCell = cell;

			cell._fixedValue = cell._value;
			cell._changed = true;

			cell._handleEvent(step.value[1].event);

			handledCell = prevHandledCell;

			if (state != STATE_CHANGES_HANDLING) {
				return;
			}
		}
	}

	/**
	 * @typesign ();
	 */
	function releaseChanges() {
		if (changes.size) {
			handleChanges();

			if (state != STATE_CHANGES_HANDLING) {
				return;
			}
		} else if (state == STATE_CHANGES_COMBINING) {
			return;
		}

		state = STATE_SLAVES_RECALCULATION;

		while (outdatedCells.length) {
			var cell = outdatedCells[outdatedCells.length - 1];

			if (cell._recalc()) {
				registerOutdatedCell(outdatedCells.pop());
			} else {
				outdatedCells.pop();
				cell._outdated = false;
			}

			if (changes.size) {
				handleChanges();

				if (state != STATE_CHANGES_HANDLING) {
					return;
				}

				state = STATE_SLAVES_RECALCULATION;
			}
		}

		releaseVersion++;
		state = STATE_CHANGES_COMBINING;
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

		/**
		 * @type {boolean}
		 */
		this.computed = typeof value == 'function' &&
			(opts.computed !== undefined ? opts.computed : value.constructor == Function);
		/**
		 * @type {boolean}
		 */
		this.pureComputed = opts.pureComputed === true;

		/**
		 * @type {?Object}
		 */
		this.owner = opts.owner || null;

		/**
		 * @type {*}
		 */
		this._value = undefined;
		/**
		 * @type {*}
		 */
		this._fixedValue = undefined;
		/**
		 * @type {*}
		 */
		this.initialValue = undefined;
		/**
		 * @type {?Function}
		 */
		this._formula = null;

		/**
		 * @type {?Function}
		 */
		this._read = opts.read || null;
		/**
		 * @type {?Function}
		 */
		this._write = opts.write || null;

		/**
		 * @type {?Function}
		 */
		this._validate = opts.validate || null;

		/**
		 * Ведущие ячейки.
		 * @type {Set<cellx.Cell>}
		 */
		this._masters = null;
		/**
		 * Ведомые ячейки.
		 * @type {Set<cellx.Cell>}
		 */
		this._slaves = new Set();

		/**
		 * @type {uint|undefined}
		 */
		this._maxMasterLevel = 0;

		this._version = 0;

		this._circularityDetectionCounter = 0;

		/**
		 * @type {?cellx.Event}
		 */
		this._lastErrorEvent = null;

		this._active = false;

		this._outdated = false;

		this._changed = false;

		if (this.computed) {
			this._formula = value;
		} else {
			if (this._validate) {
				this._validate.call(this.owner || this, value);
			}

			this._value = this._fixedValue = this.initialValue = value;

			if (value instanceof EventEmitter) {
				value.on('change', this._onValueChange, this);
			}
		}

		if (opts.onchange) {
			this.on('change', opts.onchange);
		}
		if (opts.onerror) {
			this.on('error', opts.onerror);
		}
	}
	extend(Cell, EventEmitter);

	assign(Cell.prototype, {
		/**
		 * @typesign (): boolean;
		 */
		changed: function() {
			if (changes.size) {
				releaseChanges();
			}

			return this._changed;
		},

		/**
		 * @override cellx.EventEmitter#on
		 */
		on: function(type, listener, context) {
			if (changes.size) {
				releaseChanges();
			}

			if (this.computed && !this._events.size && !this._slaves.size) {
				this._activate();
			}

			EventEmitter.prototype.on.call(this, type, listener, context);

			return this;
		},
		/**
		 * @override cellx.EventEmitter#off
		 */
		off: function(type, listener, context) {
			if (changes.size) {
				releaseChanges();
			}

			EventEmitter.prototype.off.call(this, type, listener, context);

			if (this.computed && !this._events.size && !this._slaves.size) {
				this._deactivate();
			}

			return this;
		},

		/**
		 * @override cellx.EventEmitter#_on
		 */
		_on: function(type, listener, context) {
			EventEmitter.prototype._on.call(this, type, listener, context || this.owner);
		},
		/**
		 * @override cellx.EventEmitter#_off
		 */
		_off: function(type, listener, context) {
			EventEmitter.prototype._off.call(this, type, listener, context || this.owner);
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
				this._activate();
			}

			this._slaves.add(slave);
		},

		/**
		 * @typesign (slave: cellx.Cell);
		 */
		_unregisterSlave: function(slave) {
			this._slaves['delete'](slave);

			if (this.computed && !this._events.size && !this._slaves.size) {
				this._deactivate();
			}
		},

		/**
		 * @typesign ();
		 */
		_activate: function() {
			if (this._version != releaseVersion) {
				var prevDetectedMasters = detectedMasters;
				detectedMasters = [];

				var result = this._tryFormula();

				this._masters = detectedMasters;
				detectedMasters = prevDetectedMasters;

				this._version = releaseVersion;

				if (result[0]) {
					this._value = this._fixedValue = result[1];
				} else {
					this._handleError(result[1]);
				}
			}

			var masters = this._masters;
			var maxMasterLevel = 0;

			for (var i = masters.length; i;) {
				var master = masters[--i];

				master._registerSlave(this);

				if (maxMasterLevel <= master._maxMasterLevel) {
					maxMasterLevel = master._maxMasterLevel + 1;
				}
			}

			this._maxMasterLevel = maxMasterLevel;

			this._active = true;
		},

		/**
		 * @typesign ();
		 */
		_deactivate: function() {
			var masters = this._masters;

			for (var i = masters.length; i;) {
				masters[--i]._unregisterSlave(this);
			}

			this._maxMasterLevel = undefined;

			this._active = false;
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
			if (detectedMasters && detectedMasters.indexOf(this) == -1) {
				detectedMasters.push(this);
			}

			// STATE_CHANGES_COMBINING - outdatedCells здесь точно нет.
			// STATE_CHANGES_HANDLING - если нет ни changes, ни outdatedCells, то релиз не нужен.
			// STATE_SLAVES_RECALCULATION - предположительно будут читаться ячейки с меньшим _maxMasterLevel,
			// если так, то при отсутствии изменений релиз не нужен, если нет, то в releaseChanges
			// ячейка пересортируется и _recalc вызвавший это чтение повторится позже.
			if (changes.size || (state == STATE_CHANGES_HANDLING && outdatedCells.length)) {
				releaseChanges();
			}

			if (this.computed && !this._active && this._version != releaseVersion) {
				var prevDetectedMasters = detectedMasters;
				detectedMasters = [];

				var result = this._tryFormula();

				this._masters = detectedMasters;
				detectedMasters = prevDetectedMasters;

				this._version = releaseVersion;

				if (result[0]) {
					this._value = this._fixedValue = result[1];
				} else {
					this._handleError(result[1]);
				}
			}

			return this._read ? this._read.call(this.owner || this, this._value) : this._value;
		},

		/**
		 * @typesign (value): boolean;
		 */
		write: function(value) {
			if (this.computed && !this._write) {
				throw new TypeError('Cannot write to read-only cell');
			}

			var oldValue = this._value;

			if (oldValue === value || (oldValue != oldValue && value != value)) {
				return false;
			}

			if (this._validate) {
				this._validate.call(this.owner || this, value);
			}

			if (this.computed) {
				this._write.call(this.owner || this, value);
			} else {
				this._value = value;

				if (oldValue instanceof EventEmitter) {
					oldValue.off('change', this._onValueChange, this);
				}
				if (value instanceof EventEmitter) {
					value.on('change', this._onValueChange, this);
				}

				if (
					(value === this._fixedValue || (value != value && this._fixedValue != this._fixedValue)) &&
						changes.get(this).cancellable
				) {
					changes['delete'](this);
				} else {
					addChange(this, {
						oldValue: oldValue,
						value: value
					});
				}
			}

			return true;
		},

		/**
		 * @typesign (): boolean;
		 */
		_recalc: function() {
			var pureComputed = this.pureComputed;

			if (!pureComputed) {
				if (this._version == releaseVersion) {
					if (++this._circularityDetectionCounter == 10) {
						this._handleError(new RangeError('Circular dependency detected'));
						return false;
					}
				} else {
					this._circularityDetectionCounter = 1;
				}
			}

			if (calculatedCell === this) {
				return false;
			}

			var prevCalculatedCell = calculatedCell;
			calculatedCell = this;

			var prevDetectedMasters;

			if (!pureComputed) {
				prevDetectedMasters = detectedMasters;
				detectedMasters = [];
			}

			var result = this._tryFormula();

			calculatedCell = prevCalculatedCell;

			if (!pureComputed) {
				var oldMasters = this._masters;

				var masters = this._masters = detectedMasters;
				detectedMasters = prevDetectedMasters;

				var isMasterListChanged = false;

				for (var i = oldMasters.length; i;) {
					if (masters.indexOf(oldMasters[--i]) == -1) {
						oldMasters[i]._unregisterSlave(this);
						isMasterListChanged = true;
					}
				}

				if (isMasterListChanged || oldMasters.length < masters.length) {
					var maxMasterLevel = 0;

					for (var j = masters.length; i;) {
						var master = masters[--j];

						if (oldMasters.indexOf(master) == -1) {
							master._registerSlave(this);
						}

						if (maxMasterLevel <= master._maxMasterLevel) {
							maxMasterLevel = master._maxMasterLevel + 1;
						}
					}

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

			this._version = releaseVersion + 1;

			if (result[0]) {
				var oldValue = this._value;
				var value = result[1];

				if (oldValue !== value && (oldValue == oldValue || value == value)) {
					this._value = value;

					addChange(this, {
						oldValue: oldValue,
						value: value
					});
				}
			} else {
				this._handleError(result[1]);
			}

			return false;
		},

		/**
		 * @typesign (): { 0: true, 1 };
		 * @typesign (): { 0: false, 1: Error };
		 */
		_tryFormula: function() {
			try {
				var value = this._formula.call(this.owner || this);

				if (this._validate) {
					this._validate.call(this.owner || this, value);
				}

				return [true, value];
			} catch (err) {
				return [false, err];
			}
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
				if (evt.isPropagationStopped) {
					break;
				}

				step.value._handleErrorEvent(evt);
			}
		},

		/**
		 * @typesign (): cellx.Cell;
		 */
		clear: function() {
			if (changes.size) {
				releaseChanges();
			}

			this._clear();

			return this;
		},

		/**
		 * @typesign ();
		 */
		_clear: function() {
			this.off();

			if (this._active) {
				this._slaves.forEach(function(slave) {
					slave._clear();
				});
			}
		}
	});

	cellx.Cell = Cell;
})();
