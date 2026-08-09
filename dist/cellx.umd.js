(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@riim/event')) : typeof define === 'function' && define.amd ? define(['exports', '@riim/event'], factory) : (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.cellx = {}, global._riim_event));
})(this, function (exports, _riim_event) {
  Object.defineProperty(exports, Symbol.toStringTag, {
    value: 'Module'
  });

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
  //#region src/keys.ts
  var KEY_ERROR_EVENT = Symbol("errorEvent");
  var KEY_LISTENER_WRAPPERS = Symbol("listenerWrappers");

  //#endregion
  //#region src/reaction.ts
  function reaction(source, fn, cellOptions) {
    var cell = new Cell({
      ...cellOptions,
      pull: source instanceof Cell ? () => source.value : Array.isArray(source) ? () => source.map(cell => cell.value) : source
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
        afterRelease: _afterRelease
      } = Cell_CommonState;
      Cell_CommonState.afterRelease = null;
      for (var i = 0; i < _afterRelease.length; i++) _afterRelease[i]();
    }
  }

  //#endregion
  //#region src/track.ts
  var DependencyFilter = {
    allExceptUntracked: dependency => Cell_CommonState.inUntrackedCounter == 0,
    onlyTracked: dependency => Cell_CommonState.inTrackedCounter > 0
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
  var CellState = /* @__PURE__ */function (CellState) {
    CellState["ACTUAL"] = "actual";
    CellState["DIRTY"] = "dirty";
    CellState["CHECK"] = "check";
    return CellState;
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
  var Cell = class Cell {
    static {
      this.EVENT_CHANGE = "change";
    }
    static {
      this.EVENT_ERROR = "error";
    }
    static get currentlyPulling() {
      return Cell_CommonState.currentCell != null;
    }
    static {
      this.autorun = autorun;
    }
    static {
      this.reaction = reaction;
    }
    static {
      this.release = release;
    }
    static {
      this.afterRelease = afterRelease;
    }
    get writable() {
      return this._writable;
    }
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
    get initialized() {
      return this._initialized;
    }
    get active() {
      return this._active;
    }
    get state() {
      return this._state;
    }
    constructor(options) {
      this._currentDependency = null;
      this._nextDependent = null;
      this._lastDependent = null;
      this._error$ = null;
      this._error = null;
      this._bound = false;
      this._active = false;
      this._currentlyPulling = false;
      this._updateId = -1;
      this._onChange = null;
      this._onError = null;
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
        if (this._pull.length > 0) {
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
    on(type, listener) {
      if (this._nextDependency !== null) this._actualize();
      if (type == Cell.EVENT_CHANGE) (this._onChange ??= (0, _riim_event.event)(this.context))(listener);else (this._onError ??= (0, _riim_event.event)(this.context))(listener);
      this._activate();
      return this;
    }
    off(type, listener) {
      if (this._nextDependency !== null) this._actualize();
      var onChangeListeners = this._onChange?.[_riim_event.LISTENERS];
      var onErrorListeners = this._onError?.[_riim_event.LISTENERS];
      var hasListeners = onChangeListeners && onChangeListeners.size > 0 || onErrorListeners && onErrorListeners.size > 0;
      var onEvent = type == Cell.EVENT_CHANGE ? this._onChange : this._onError;
      if (onEvent) (0, _riim_event.unsubscribe)(onEvent, listener);
      if (hasListeners && !this._nextDependent) {
        onChangeListeners = this._onChange?.[_riim_event.LISTENERS];
        onErrorListeners = this._onError?.[_riim_event.LISTENERS];
        if ((!onChangeListeners || onChangeListeners.size == 0) && (!onErrorListeners || onErrorListeners.size == 0)) {
          this._deactivate();
          this._reap?.call(this.context);
        }
      }
      return this;
    }
    onChange(listener) {
      return this.on(Cell.EVENT_CHANGE, listener);
    }
    offChange(listener) {
      return this.off(Cell.EVENT_CHANGE, listener);
    }
    onError(listener) {
      return this.on(Cell.EVENT_ERROR, listener);
    }
    offError(listener) {
      return this.off(Cell.EVENT_ERROR, listener);
    }
    subscribe(listener) {
      var wrappers = listener[KEY_LISTENER_WRAPPERS] ??= /* @__PURE__ */new Map();
      if (wrappers.has(this)) return this;
      function wrapper(evt) {
        return listener.call(this, evt.data["error"] ?? null, evt);
      }
      wrappers.set(this, wrapper);
      return this.on(Cell.EVENT_CHANGE, wrapper).on(Cell.EVENT_ERROR, wrapper);
    }
    unsubscribe(listener) {
      var wrappers = listener[KEY_LISTENER_WRAPPERS];
      var wrapper = wrappers?.get(this);
      if (!wrapper) return this;
      wrappers.delete(this);
      return this.off(Cell.EVENT_CHANGE, wrapper).off(Cell.EVENT_ERROR, wrapper);
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
      if (!this._nextDependent && (!this._onChange?.[_riim_event.LISTENERS] || this._onChange[_riim_event.LISTENERS].size == 0) && (!this._onError?.[_riim_event.LISTENERS] || this._onError[_riim_event.LISTENERS].size == 0)) {
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
      if (this._onChange) (0, _riim_event.fireEvent)(this._onChange, {
        target: this,
        type: Cell.EVENT_CHANGE,
        data: {
          sourceEvent: evt
        }
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
              if ((cell._onChange?.[_riim_event.LISTENERS] && cell._onChange[_riim_event.LISTENERS].size > 0 || cell._onError?.[_riim_event.LISTENERS] && cell._onError[_riim_event.LISTENERS].size > 0) && Cell_CommonState.pendingCells.push(cell) == 1) nextTick(release);
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
          value.then(value => this._push(value), err => this._fail(err));
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
      if (this._nextDependent || this._onChange?.[_riim_event.LISTENERS] && this._onChange[_riim_event.LISTENERS].size > 0 || this._onError?.[_riim_event.LISTENERS] && this._onError[_riim_event.LISTENERS].size > 0) {
        for (var holder = this, _dependency2 = this._nextDependency; _dependency2;) if (_dependency2.state == -1) {
          _dependency2.cell._deleteDependent(this);
          _dependency2 = holder._nextDependency = _dependency2._nextDependency;
        } else {
          if (_dependency2.state == 1) _dependency2.cell._addDependent(this);
          holder = _dependency2;
          _dependency2 = _dependency2._nextDependency;
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
        if (!Cell_CommonState.transactionStates && this._onChange) (0, _riim_event.fireEvent)(this._onChange, {
          target: this,
          type: Cell.EVENT_CHANGE,
          data: {
            value,
            prevValue
          }
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
      err[KEY_ERROR_EVENT] ??= {
        target: this,
        type: Cell.EVENT_ERROR,
        data: {
          error: err
        }
      };
      if (this._onError) (0, _riim_event.fireEvent)(this._onError, err[KEY_ERROR_EVENT]);
      return isWaitError;
    }
    wait() {
      throw new WaitError();
    }
    reap() {
      for (var dependent = this._nextDependent; dependent; dependent = dependent._nextDependent) dependent.cell.reap();
      this._error$?.reap();
      this._onChange?.[_riim_event.LISTENERS]?.clear();
      this._onError?.[_riim_event.LISTENERS]?.clear();
      this._deactivate();
      this._reap?.call(this.context);
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
    if (Cell_CommonState.pendingCells.length > 0) release();
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
    }] of Cell_CommonState.transactionStates) if (!_cell._compareValues(_cell._value, _value)) {
      if (_cell._onChange) (0, _riim_event.fireEvent)(_cell._onChange, {
        value: _cell._value,
        prevValue: _value
      });
    }
    Cell_CommonState.transactionStates = null;
    if (Cell_CommonState.pendingCells.length > 0) release();
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
      set(value) {
        cell.set(value);
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