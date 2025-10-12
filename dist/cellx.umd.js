(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.cellx = {}));
})(this, function (exports) {
  //#region src/config.ts
  var config = {
    logError: (...args) => {
      console.error(...args);
    },
    compareValues: Object.is
  };
  function configure(options) {
    return Object.assign(config, options);
  }

  //#endregion
  //#region src/EventEmitter.ts
  var EventEmitter_CommonState = {
    inBatchCounter: 0,
    batchedEvents: [],
    inSilentlyCounter: 0
  };
  var EventEmitter = class {
    static batch(fn) {
      EventEmitter_CommonState.inBatchCounter++;
      try {
        fn();
      } finally {
        if (--EventEmitter_CommonState.inBatchCounter == 0) {
          var events = EventEmitter_CommonState.batchedEvents;
          EventEmitter_CommonState.batchedEvents = [];
          for (var i = 0; i < events.length; i++) events[i].target.triggerEvent(events[i]);
        }
      }
    }
    static silently(fn) {
      EventEmitter_CommonState.inSilentlyCounter++;
      try {
        fn();
      } finally {
        EventEmitter_CommonState.inSilentlyCounter--;
      }
    }
    _listeners = /* @__PURE__ */new Map();
    getListeners(type) {
      return type ? this._listeners.get(type) ?? [] : this._listeners;
    }
    on(type, listener, context) {
      if (typeof type == "object") {
        context = listener !== void 0 ? listener : this;
        var listeners = type;
        for (type in listeners) if (Object.prototype.hasOwnProperty.call(listeners, type)) this._on(type, listeners[type], context);
        for (var type$1 of Object.getOwnPropertySymbols(listeners)) this._on(type$1, listeners[type$1], context);
      } else this._on(type, listener, context !== void 0 ? context : this);
      return this;
    }
    off(type, listener, context) {
      if (type) {
        if (typeof type == "object") {
          context = listener !== void 0 ? listener : this;
          var listeners = type;
          for (type in listeners) if (Object.prototype.hasOwnProperty.call(listeners, type)) this._off(type, listeners[type], context);
          for (var type$1 of Object.getOwnPropertySymbols(listeners)) this._off(type$1, listeners[type$1], context);
        } else this._off(type, listener, context !== void 0 ? context : this);
      } else this._listeners.clear();
      return this;
    }
    _on(type, listener, context) {
      var typeListeners = this._listeners.get(type);
      var $listener = {
        listener,
        context
      };
      if (typeListeners) typeListeners.push($listener);else this._listeners.set(type, [$listener]);
    }
    _off(type, listener, context) {
      var typeListeners = this._listeners.get(type);
      if (!typeListeners) return;
      if (typeListeners.length == 1) {
        if (typeListeners[0].listener == listener && typeListeners[0].context === context) this._listeners.delete(type);
      } else for (var i = 0;; i++) {
        if (typeListeners[i].listener == listener && typeListeners[i].context === context) {
          typeListeners.splice(i, 1);
          break;
        }
        if (i + 1 == typeListeners.length) break;
      }
    }
    once(type, listener, context) {
      if (context === void 0) context = this;
      function wrapper(evt) {
        this._off(type, wrapper, context);
        return listener.call(this, evt);
      }
      this._on(type, wrapper, context);
      return wrapper;
    }
    emit(evt, data) {
      if (typeof evt == "object") {
        if (!evt.target) evt.target = this;else if (evt.target != this) throw TypeError("Event cannot be emitted on this target");
      } else evt = {
        target: this,
        type: evt
      };
      if (data) evt.data = data;
      if (EventEmitter_CommonState.inSilentlyCounter == 0) if (EventEmitter_CommonState.inBatchCounter != 0) for (var i = EventEmitter_CommonState.batchedEvents.length;;) {
        if (i == 0) {
          if (evt.data) evt.data["prevEvent"] = null;else evt.data = {
            prevEvent: null
          };
          EventEmitter_CommonState.batchedEvents.push(evt);
          break;
        }
        var event = EventEmitter_CommonState.batchedEvents[--i];
        if (event.target == this && event.type === evt.type) {
          if (evt.data) evt.data["prevEvent"] = event;else evt.data = {
            prevEvent: event
          };
          EventEmitter_CommonState.batchedEvents[i] = evt;
          break;
        }
      } else this.triggerEvent(evt);
      return evt;
    }
    triggerEvent(evt) {
      var typeListeners = this._listeners.get(evt.type);
      if (!typeListeners) return;
      if (typeListeners.length == 1) {
        if (this._tryEventListener(typeListeners[0], evt) === false) evt.propagationStopped = true;
      } else {
        typeListeners = typeListeners.slice();
        for (var i = 0; i < typeListeners.length; i++) if (this._tryEventListener(typeListeners[i], evt) === false) evt.propagationStopped = true;
      }
    }
    _tryEventListener($listener, evt) {
      try {
        return $listener.listener.call($listener.context, evt);
      } catch (err) {
        config.logError(err);
      }
    }
  };

  //#endregion
  //#region src/WaitError.ts
  var WaitError = class extends Error {};

  //#endregion
  //#region src/afterRelease.ts
  function afterRelease(cb) {
    (Cell_CommonState.afterRelease ?? (Cell_CommonState.afterRelease = [])).push(cb);
  }

  //#endregion
  //#region src/autorun.ts
  function autorun(fn, cellOptions) {
    var disposer;
    new Cell({
      onChange: () => {},
      ...cellOptions,
      pull: function (cell, value) {
        return fn.call(this, value, disposer ??= () => {
          cell.dispose();
        });
      }
    });
    return disposer;
  }

  //#endregion
  //#region src/keys.ts
  var KEY_ERROR_EVENT = Symbol("errorEvent");
  var KEY_LISTENER_WRAPPERS = Symbol("listenerWrappers");

  //#endregion
  //#region src/reaction.ts
  function reaction(source, fn, cellOptions) {
    var cell = new Cell({
      ...cellOptions,
      pull: source instanceof Cell ? () => source.value : Array.isArray(source) ? () => source.map(cell$1 => cell$1.value) : source
    });
    var disposer = () => {
      cell.dispose();
    };
    cell.onChange(function ({
      data
    }) {
      return fn.call(this, data.value, data.prevValue, disposer);
    });
    return disposer;
  }

  //#endregion
  //#region src/release.ts
  function release() {
    while (Cell_CommonState.pendingCellsIndex < Cell_CommonState.pendingCells.length) {
      var cell = Cell_CommonState.pendingCells[Cell_CommonState.pendingCellsIndex++];
      if (cell._active) cell.actualize();
    }
    Cell_CommonState.pendingCells.length = 0;
    Cell_CommonState.pendingCellsIndex = 0;
    if (Cell_CommonState.afterRelease) {
      var {
        afterRelease: afterRelease$1
      } = Cell_CommonState;
      Cell_CommonState.afterRelease = null;
      for (var i = 0; i < afterRelease$1.length; i++) afterRelease$1[i]();
    }
  }

  //#endregion
  //#region src/track.ts
  var DependencyFilter = {
    allExceptUntracked: dependency => Cell_CommonState.inUntrackedCounter == 0,
    onlyTracked: dependency => Cell_CommonState.inTrackedCounter != 0
  };
  function untracked(fn) {
    Cell_CommonState.inUntrackedCounter++;
    try {
      return fn();
    } finally {
      Cell_CommonState.inUntrackedCounter--;
    }
  }
  function tracked(fn) {
    Cell_CommonState.inTrackedCounter++;
    try {
      return fn();
    } finally {
      Cell_CommonState.inTrackedCounter--;
    }
  }

  //#endregion
  //#region src/utils/isEventEmitterLike.ts
  function isEventEmitterLike(value) {
    return !!value && typeof value["on"] == "function" && typeof value["off"] == "function" && typeof value["emit"] == "function";
  }

  //#endregion
  //#region src/utils/isPromiseLike.ts
  function isPromiseLike(value) {
    return !!value && typeof value["then"] == "function";
  }

  //#endregion
  //#region src/utils/nextTick.ts
  /* istanbul ignore next */
  var nextTick = globalThis.process?.nextTick ?? (() => {
    var resolvedPromise = Promise.resolve();
    return cb => {
      resolvedPromise.then(cb);
    };
  })();

  //#endregion
  //#region src/Cell.ts
  var CellState = /* @__PURE__ */function (CellState$1) {
    CellState$1["ACTUAL"] = "actual";
    CellState$1["DIRTY"] = "dirty";
    CellState$1["CHECK"] = "check";
    return CellState$1;
  }({});
  var Cell_CommonState = {
    pendingCells: [],
    pendingCellsIndex: 0,
    currentCell: null,
    lastUpdateId: 0,
    afterRelease: null,
    transactionStates: null,
    inUntrackedCounter: 0,
    inTrackedCounter: 0
  };
  var $error = null;
  var Cell = class Cell extends EventEmitter {
    static EVENT_CHANGE = "change";
    static EVENT_ERROR = "error";
    static get currentlyPulling() {
      return Cell_CommonState.currentCell != null;
    }
    static autorun = autorun;
    static reaction = reaction;
    static release = release;
    static afterRelease = afterRelease;
    context;
    meta;
    _writable;
    get writable() {
      return this._writable;
    }
    _pull;
    _dependencyFilter;
    _validateValue;
    _put;
    _compareValues;
    _reap;
    _nextDependency;
    _currentDependency = null;
    _nextDependent = null;
    _lastDependent = null;
    getDependencies() {
      var dependencies = [];
      for (var dependency = this._nextDependency; dependency; dependency = dependency._nextDependency) dependencies.push(dependency.cell);
      return dependencies;
    }
    getDependents() {
      var dependents = [];
      for (var dependent = this._nextDependent; dependent; dependent = dependent._nextDependent) dependents.push(dependent.cell);
      return dependents;
    }
    _value;
    _error$ = null;
    _error = null;
    _bound = false;
    _initialized;
    get initialized() {
      return this._initialized;
    }
    _active = false;
    get active() {
      return this._active;
    }
    _state;
    get state() {
      return this._state;
    }
    _currentlyPulling = false;
    _updateId = -1;
    constructor(options) {
      super();
      this.context = options.context ?? null;
      this.meta = options.meta ?? null;
      this._pull = options.pull ?? null;
      this._dependencyFilter = options.dependencyFilter ?? DependencyFilter.allExceptUntracked;
      this._validateValue = options.validate ?? null;
      this._put = options.put ?? null;
      this._compareValues = options.compareValues ?? config.compareValues;
      this._reap = options.reap ?? null;
      var {
        value
      } = options;
      if (this._pull) {
        if (value !== void 0) {
          this._validateValue?.(value, void 0);
          if (isEventEmitterLike(value)) value.on("change", this._onValueChange, this);
        }
        this._writable = options.writable ?? !!this._put;
        this._nextDependency = void 0;
        this._initialized = false;
        this._state = CellState.DIRTY;
        if (this._pull.length != 0) {
          this.push = this.push.bind(this);
          this.fail = this.fail.bind(this);
          this._bound = true;
        }
      } else {
        this._validateValue?.(value, void 0);
        if (isEventEmitterLike(value)) value.on("change", this._onValueChange, this);
        this._writable = options.writable ?? true;
        this._nextDependency = null;
        this._initialized = true;
        this._state = CellState.ACTUAL;
      }
      this._value = value;
      if (options.onChange) this.on(Cell.EVENT_CHANGE, options.onChange);
      if (options.onError) this.on(Cell.EVENT_ERROR, options.onError);
    }
    on(type, listener, context) {
      if (this._nextDependency !== null) this._actualize();
      if (typeof type == "object") super.on(type, listener !== void 0 ? listener : this.context);else super.on(type, listener, context !== void 0 ? context : this.context);
      this._activate();
      return this;
    }
    off(type, listener, context) {
      if (this._nextDependency !== null) this._actualize();
      var hasListeners = this._listeners.has(Cell.EVENT_CHANGE) || this._listeners.has(Cell.EVENT_ERROR);
      if (type) {
        if (typeof type == "object") super.off(type, listener !== void 0 ? listener : this.context);else super.off(type, listener, context !== void 0 ? context : this.context);
      } else super.off();
      if (hasListeners && !this._nextDependent && (this._listeners.size == 0 || !this._listeners.has(Cell.EVENT_CHANGE) && !this._listeners.has(Cell.EVENT_ERROR))) {
        this._deactivate();
        this._reap?.call(this.context);
      }
      return this;
    }
    onChange(listener, context) {
      return this.on(Cell.EVENT_CHANGE, listener, context);
    }
    offChange(listener, context) {
      return this.off(Cell.EVENT_CHANGE, listener, context);
    }
    onError(listener, context) {
      return this.on(Cell.EVENT_ERROR, listener, context);
    }
    offError(listener, context) {
      return this.off(Cell.EVENT_ERROR, listener, context);
    }
    subscribe(listener, context) {
      var wrappers = listener[KEY_LISTENER_WRAPPERS] ?? (listener[KEY_LISTENER_WRAPPERS] = /* @__PURE__ */new Map());
      if (wrappers.has(this)) return this;
      function wrapper(evt) {
        return listener.call(this, evt.data["error"] ?? null, evt);
      }
      wrappers.set(this, wrapper);
      if (context === void 0) context = this.context;
      return this.on(Cell.EVENT_CHANGE, wrapper, context).on(Cell.EVENT_ERROR, wrapper, context);
    }
    unsubscribe(listener, context) {
      var wrappers = listener[KEY_LISTENER_WRAPPERS];
      var wrapper = wrappers?.get(this);
      if (!wrapper) return this;
      wrappers.delete(this);
      if (context === void 0) context = this.context;
      return this.off(Cell.EVENT_CHANGE, wrapper, context).off(Cell.EVENT_ERROR, wrapper, context);
    }
    _addDependent(dependent) {
      (this._lastDependent ?? this)._nextDependent = this._lastDependent = {
        cell: dependent,
        _nextDependent: null,
        prevDependents: null
      };
      this._activate();
    }
    _deleteDependent(dependent) {
      var currentDependent = this._nextDependent;
      if (currentDependent.cell == dependent) {
        if (!(this._nextDependent = currentDependent._nextDependent)) this._lastDependent = null;
      } else for (var prevDependent;;) {
        prevDependent = currentDependent;
        currentDependent = currentDependent._nextDependent;
        if (!currentDependent) break;
        if (currentDependent.cell == dependent) {
          if (!(prevDependent._nextDependent = currentDependent._nextDependent)) this._lastDependent = prevDependent;
          break;
        }
      }
      if (!this._nextDependent && (this._listeners.size == 0 || !this._listeners.has(Cell.EVENT_CHANGE) && !this._listeners.has(Cell.EVENT_ERROR))) {
        this._deactivate();
        this._reap?.call(this.context);
      }
    }
    _activate() {
      if (this._active) return;
      var dependency = this._nextDependency;
      if (dependency) {
        do dependency.cell._addDependent(this); while (dependency = dependency._nextDependency);
        this._active = true;
        this._state = CellState.ACTUAL;
      }
    }
    _deactivate() {
      var dependency = this._nextDependency;
      if (dependency) {
        do dependency.cell._deleteDependent(this); while (dependency = dependency._nextDependency);
        this._active = false;
        this._state = CellState.DIRTY;
      }
    }
    _onValueChange(evt) {
      this._updateId = ++Cell_CommonState.lastUpdateId;
      this._addToRelease();
      this.emit(Cell.EVENT_CHANGE, {
        sourceEvent: evt
      });
    }
    _addToRelease() {
      var directDependents = this._nextDependent;
      if (!directDependents) return;
      for (var stack = directDependents;;) {
        var dependents = stack;
        stack = stack.prevDependents;
        dependents.prevDependents = null;
        for (var dependent = dependents; dependent; dependent = dependent._nextDependent) {
          var dirty = dependents == directDependents;
          var {
            cell
          } = dependent;
          if (cell._state == CellState.ACTUAL) {
            cell._state = dirty ? CellState.DIRTY : CellState.CHECK;
            if (cell._nextDependent) {
              cell._nextDependent.prevDependents = stack;
              stack = cell._nextDependent;
              if ((cell._listeners.has(Cell.EVENT_CHANGE) || cell._listeners.has(Cell.EVENT_ERROR)) && Cell_CommonState.pendingCells.push(cell) == 1) nextTick(release);
            } else if (Cell_CommonState.pendingCells.push(cell) == 1) nextTick(release);
          } else if (dirty) cell._state = CellState.DIRTY;
        }
        if (!stack) break;
      }
    }
    actualize() {
      if (Cell_CommonState.transactionStates) throw Error("Cannot actualize in a transaction");
      return this._actualize();
    }
    _actualize() {
      if (this._state == CellState.CHECK) for (var dependency = this._nextDependency;;) {
        if (dependency.cell._actualize()._error) {
          this._fail(dependency.cell._error);
          break;
        }
        if (this._state == CellState.DIRTY) {
          this.pull();
          break;
        }
        if (!(dependency = dependency._nextDependency)) {
          this._error$?.set(null);
          this._error = null;
          this._state = CellState.ACTUAL;
          break;
        }
      } else if (this._state == CellState.DIRTY) this.pull();
      return this;
    }
    get value() {
      return this.get();
    }
    set value(value) {
      this.set(value);
    }
    get error() {
      if (Cell_CommonState.transactionStates) {
        if (!this._initialized) throw Error("Cannot read an uninitialized cell in a transaction");
        return this._error;
      }
      if (this._state != CellState.ACTUAL && this._updateId != Cell_CommonState.lastUpdateId) this._actualize();
      return Cell_CommonState.currentCell ? (this._error$ ?? (this._error$ = new Cell({
        value: this._error
      }))).get() : this._error;
    }
    get() {
      if (Cell_CommonState.transactionStates) {
        if (!this._initialized) throw Error("Cannot read an uninitialized cell in a transaction");
        return this._value;
      }
      if (this._state != CellState.ACTUAL && this._updateId != Cell_CommonState.lastUpdateId) this._actualize();
      var {
        currentCell
      } = Cell_CommonState;
      if (currentCell?._dependencyFilter(this)) {
        var currentDependency = currentCell._currentDependency;
        if (currentDependency) {
          var dependency = currentDependency._nextDependency;
          if (dependency) {
            if (dependency.cell == this) {
              currentCell._currentDependency = dependency;
              dependency.state = 0;
            } else if (currentDependency.cell != this) for (var prevDependency;;) {
              prevDependency = dependency;
              if (dependency = dependency._nextDependency) {
                if (dependency.cell == this) {
                  prevDependency._nextDependency = dependency._nextDependency;
                  dependency._nextDependency = currentDependency._nextDependency;
                  currentDependency._nextDependency = currentCell._currentDependency = dependency;
                  dependency.state = 0;
                  break;
                }
              } else {
                for (dependency = currentCell._nextDependency;; dependency = dependency._nextDependency) {
                  if (dependency == currentDependency) {
                    currentDependency._nextDependency = currentCell._currentDependency = {
                      cell: this,
                      _nextDependency: currentDependency._nextDependency,
                      state: 1
                    };
                    break;
                  }
                  if (dependency.cell == this) break;
                }
                break;
              }
            }
          } else if (currentDependency.cell != this) for (dependency = currentCell._nextDependency;; dependency = dependency._nextDependency) {
            if (dependency == currentDependency) {
              currentDependency._nextDependency = currentCell._currentDependency = {
                cell: this,
                _nextDependency: null,
                state: 1
              };
              break;
            }
            if (dependency.cell == this) break;
          }
        } else {
          var _dependency = currentCell._nextDependency;
          if (_dependency) {
            if (_dependency.cell == this) {
              currentCell._currentDependency = _dependency;
              _dependency.state = 0;
            } else for (var _prevDependency = _dependency;;) {
              _dependency = _dependency._nextDependency;
              if (!_dependency) {
                currentCell._nextDependency = currentCell._currentDependency = {
                  cell: this,
                  _nextDependency: currentCell._nextDependency,
                  state: 1
                };
                break;
              }
              if (_dependency.cell == this) {
                _prevDependency._nextDependency = _dependency._nextDependency;
                _dependency._nextDependency = currentCell._nextDependency;
                currentCell._nextDependency = currentCell._currentDependency = _dependency;
                _dependency.state = 0;
                break;
              }
              _prevDependency = _dependency;
            }
          } else currentCell._nextDependency = currentCell._currentDependency = {
            cell: this,
            _nextDependency: null,
            state: 1
          };
        }
      }
      if (this._error && currentCell) throw this._error;
      return this._value;
    }
    pull() {
      if (!this._pull) return false;
      if (Cell_CommonState.transactionStates) throw Error("Cannot call a pull in a transaction");
      if (this._currentlyPulling) throw Error("Circular pulling");
      var dependency = this._nextDependency;
      if (dependency) do dependency.state = -1; while (dependency = dependency._nextDependency);else if (dependency === void 0) this._nextDependency = null;
      this._currentlyPulling = true;
      var prevCell = Cell_CommonState.currentCell;
      Cell_CommonState.currentCell = this;
      var value;
      $error = null;
      try {
        value = this._bound ? this._pull.call(this.context, this, this._value) : this._pull.call(this.context);
        if (isPromiseLike(value)) {
          value.then(value$1 => this._push(value$1), err => this._fail(err));
          $error = {
            error: new WaitError()
          };
        }
      } catch (err) {
        $error = {
          error: err
        };
      }
      Cell_CommonState.currentCell = prevCell;
      this._currentlyPulling = false;
      this._currentDependency = null;
      if (this._nextDependent || this._listeners.has(Cell.EVENT_CHANGE) || this._listeners.has(Cell.EVENT_ERROR)) {
        for (var holder = this, dependency$1 = this._nextDependency; dependency$1;) if (dependency$1.state == -1) {
          dependency$1.cell._deleteDependent(this);
          dependency$1 = holder._nextDependency = dependency$1._nextDependency;
        } else {
          if (dependency$1.state == 1) dependency$1.cell._addDependent(this);
          holder = dependency$1;
          dependency$1 = dependency$1._nextDependency;
        }
        if (this._nextDependency) this._active = true;else {
          this._active = false;
          this._state = CellState.ACTUAL;
        }
      } else this._state = this._nextDependency ? CellState.DIRTY : CellState.ACTUAL;
      return $error ? this._fail($error.error, true) : this._push(value, true);
    }
    set(value) {
      if (!this._writable) throw Error("Cannot write to a non-writable cell");
      if (!this._initialized) this.pull();
      this._validateValue?.(value, this._value);
      if (this._put) {
        if (!this._bound) {
          this.push = this.push.bind(this);
          this.fail = this.fail.bind(this);
          this._bound = true;
        }
        if (this._put.length >= 3) this._put.call(this.context, this, value, this._value);else this._put.call(this.context, this, value);
      } else this._push(value);
      return this;
    }
    push(value) {
      if (Cell_CommonState.transactionStates) throw Error("Cannot call a push in a transaction");
      return this._push(value);
    }
    _push(value, fromPull) {
      this._initialized = true;
      var prevValue = this._value;
      var err = this._error;
      if (Cell_CommonState.transactionStates && !Cell_CommonState.transactionStates.has(this)) Cell_CommonState.transactionStates.set(this, {
        value: prevValue,
        error: err,
        state: this._state,
        updateId: this._updateId
      });
      var changed = !this._compareValues(value, prevValue);
      if (changed) {
        this._value = value;
        if (isEventEmitterLike(prevValue)) prevValue.off("change", this._onValueChange, this);
        if (isEventEmitterLike(value)) value.on("change", this._onValueChange, this);
      }
      if (err) {
        this._error$?.set(null);
        this._error = null;
      }
      if (this._active) this._state = CellState.ACTUAL;
      this._updateId = fromPull ? Cell_CommonState.lastUpdateId : ++Cell_CommonState.lastUpdateId;
      if (changed) {
        this._addToRelease();
        if (!Cell_CommonState.transactionStates) this.emit(Cell.EVENT_CHANGE, {
          value,
          prevValue
        });
      }
      return changed;
    }
    fail(err) {
      if (Cell_CommonState.transactionStates) throw Error("Cannot call a fail in a transaction");
      return this._fail(err);
    }
    _fail(err, fromPull) {
      this._initialized = true;
      if (!(err instanceof Error)) err = Error(err);
      this._error$?.set(err);
      this._error = err;
      if (this._active) this._state = CellState.ACTUAL;
      this._updateId = fromPull ? Cell_CommonState.lastUpdateId : ++Cell_CommonState.lastUpdateId;
      var isWaitError = err instanceof WaitError;
      if (!isWaitError && $error) {
        $error = null;
        if (this.meta?.["id"] !== void 0) config.logError(`[${this.meta?.["id"]}]`, err);else config.logError(err);
      }
      this.triggerEvent(err[KEY_ERROR_EVENT] ?? (err[KEY_ERROR_EVENT] = {
        target: this,
        type: Cell.EVENT_ERROR,
        data: {
          error: err
        }
      }));
      return isWaitError;
    }
    wait() {
      throw new WaitError();
    }
    reap() {
      this.off();
      this._error$?.reap();
      for (var dependent = this._nextDependent; dependent; dependent = dependent._nextDependent) dependent.cell.reap();
      return this;
    }
    dispose() {
      return this.reap();
    }
  };

  //#endregion
  //#region src/batch.ts
  function batch(fn) {
    var result = fn();
    release();
    return result;
  }

  //#endregion
  //#region src/transaction.ts
  function transaction(fn, onFailure) {
    if (Cell_CommonState.transactionStates) return fn();
    if (Cell_CommonState.pendingCells.length != 0) release();
    Cell_CommonState.transactionStates = /* @__PURE__ */new Map();
    var result;
    try {
      result = fn();
    } catch (err) {
      for (var [cell, {
        value,
        error,
        state,
        updateId
      }] of Cell_CommonState.transactionStates) {
        cell._value = value;
        cell._error$?.set(error);
        cell._error = error;
        cell._state = state;
        cell._updateId = updateId;
      }
      Cell_CommonState.pendingCells.length = 0;
      Cell_CommonState.transactionStates = null;
      if (onFailure) return onFailure(err);
      throw err;
    }
    for (var [_cell, {
      value: _value
    }] of Cell_CommonState.transactionStates) if (!_cell._compareValues(_cell._value, _value)) _cell.emit(Cell.EVENT_CHANGE, {
      value: _cell._value,
      prevValue: _value
    });
    Cell_CommonState.transactionStates = null;
    if (Cell_CommonState.pendingCells.length != 0) release();
    return result;
  }

  //#endregion
  //#region src/define.ts
  function defineObservableProperty(obj, key, value) {
    var cell = new Cell({
      value,
      context: obj
    });
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      get() {
        return cell.get();
      },
      set(value$1) {
        cell.set(value$1);
      }
    });
    return obj;
  }
  function defineObservableProperties(obj, props) {
    for (var key of Object.keys(props)) defineObservableProperty(obj, key, props[key]);
    return obj;
  }
  function define(obj, keyOrProps, value) {
    if (typeof keyOrProps == "object") defineObservableProperties(obj, keyOrProps);else defineObservableProperty(obj, keyOrProps, value);
    return obj;
  }

  //#endregion
  //#region src/cellx.ts
  function observable(value, options) {
    return new Cell({
      ...options,
      pull: void 0,
      value
    });
  }
  function computed(pullFn, options) {
    return new Cell({
      ...options,
      pull: pullFn
    });
  }
  function cellx(valueOrPullFn, options) {
    return typeof valueOrPullFn == "function" ? computed(valueOrPullFn, options) : observable(valueOrPullFn, options);
  }

  //#endregion
  exports.Cell = Cell;
  exports.CellState = CellState;
  exports.DependencyFilter = DependencyFilter;
  exports.EventEmitter = EventEmitter;
  exports.WaitError = WaitError;
  exports.afterRelease = afterRelease;
  exports.autorun = autorun;
  exports.batch = batch;
  exports.cellx = cellx;
  exports.computed = computed;
  exports.configure = configure;
  exports.define = define;
  exports.defineObservableProperties = defineObservableProperties;
  exports.defineObservableProperty = defineObservableProperty;
  exports.observable = observable;
  exports.reaction = reaction;
  exports.release = release;
  exports.tracked = tracked;
  exports.transaction = transaction;
  exports.untracked = untracked;
});