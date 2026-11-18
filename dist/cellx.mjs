import { LISTENERS, event, fireEvent } from "@riim/event";
//#region src/WaitError.ts
var WaitError = class WaitError extends Error {
  static instance = new WaitError();
};
//#endregion
//#region src/config.ts
var config = {
  logError: /* istanbul ignore next */(...args) => {
    console.error(...args);
  }
};
function configure(options) {
  return Object.assign(config, options);
}
//#endregion
//#region src/effect.ts
var EffectNode = class {
  context;
  _dependencyFilter;
  _fn;
  _dispose;
  _pullVersion = 0;
  _nextDependency = null;
  _currentDependency = null;
  _nextDependent = null;
  _flags = 82;
  constructor(fn, options) {
    this.context = options?.context ?? null;
    this._dependencyFilter = options?.dependencyFilter ?? null;
    this._fn = fn;
    this._dispose = () => {
      this.disconnect();
    };
  }
  _actualize() {
    if (!(this._flags & 16) || this._flags & 12) return false;
    this._flags |= 4;
    try {
      if (this._flags & 2 || this._flags & 1 && checkDependencies(this)) {
        if (this._flags & 16) this._run();
      } else this._flags &= -2;
    } catch (err) {
      if (!(err instanceof WaitError)) config.logError(err instanceof Error ? err : Error(err === void 0 ? void 0 : String(err)));
    } finally {
      this._flags &= -5;
    }
    return false;
  }
  _run() {
    var prevCell = Cell_runtimeState.currentCell;
    Cell_runtimeState.currentCell = this;
    this._pullVersion++;
    this._flags = this._flags & -4 | 8;
    try {
      this._fn.call(this.context, this._dispose);
    } finally {
      Cell_runtimeState.currentCell = prevCell;
      this._flags &= -9;
      if (!(this._flags & 16)) this._currentDependency = null;
      trimDependencies(this);
      if (this._flags & 3) enqueueEffect(this);
    }
  }
  disconnect() {
    if (!(this._flags & 16)) return this;
    this._fn = null;
    this._flags &= -20;
    if (this._flags & 8) for (var link = this._nextDependency; link; link = link._nextDependency) link.dependency._deleteDependent(link);else {
      this._currentDependency = null;
      trimDependencies(this);
    }
    return this;
  }
};
function effect(fn, options) {
  var node = new EffectNode(fn, options);
  node._actualize();
  return node._dispose;
}
//#endregion
//#region src/release.ts
var releaseDepth = 0;
function release() {
  if (Cell_runtimeState.pulling > 0) throw Error("Cannot call release() while computing");
  releaseDepth++;
  try {
    while (Cell_runtimeState.pendingCellsIndex < Cell_runtimeState.pendingCellsCount) {
      var node = Cell_runtimeState.pendingCells[Cell_runtimeState.pendingCellsIndex];
      Cell_runtimeState.pendingCells[Cell_runtimeState.pendingCellsIndex++] = void 0;
      node._flags &= -33;
      node._actualize();
    }
  } finally {
    if (Cell_runtimeState.pendingCellsIndex === Cell_runtimeState.pendingCellsCount) Cell_runtimeState.pendingCellsIndex = Cell_runtimeState.pendingCellsCount = 0;
    releaseDepth--;
  }
  if (releaseDepth === 0) {
    releaseDepth++;
    try {
      while (Cell_runtimeState.afterRelease && Cell_runtimeState.pendingCellsCount === 0) {
        var {
          afterRelease: _afterRelease
        } = Cell_runtimeState;
        Cell_runtimeState.afterRelease = null;
        for (var i = 0, l = _afterRelease.length; i < l; i++) try {
          _afterRelease[i]();
        } catch (error) {
          config.logError(error);
        }
      }
    } finally {
      releaseDepth--;
      if (Cell_runtimeState.pendingCellsCount > 0 || Cell_runtimeState.afterRelease) scheduleRelease();
    }
  }
}
var releaseScheduled = false;
function scheduledRelease() {
  releaseScheduled = false;
  release();
}
function scheduleRelease() {
  if (!releaseScheduled && releaseDepth === 0) {
    releaseScheduled = true;
    queueMicrotask(scheduledRelease);
  }
}
//#endregion
//#region src/track.ts
var trackedCell = null;
var DependencyFilter = {
  onlyTracked: dependency => trackedCell !== null && trackedCell === Cell_runtimeState.currentCell
};
function untracked(fn) {
  var prevUntrackedCell = Cell_runtimeState.untrackedCell;
  Cell_runtimeState.untrackedCell = Cell_runtimeState.currentCell;
  try {
    return fn();
  } finally {
    Cell_runtimeState.untrackedCell = prevUntrackedCell;
  }
}
function tracked(fn) {
  var prevTrackedCell = trackedCell;
  trackedCell = Cell_runtimeState.currentCell;
  try {
    return fn();
  } finally {
    trackedCell = prevTrackedCell;
  }
}
//#endregion
//#region src/utils/isPromiseLike.ts
function isPromiseLike(value) {
  return !!value && typeof value["then"] === "function";
}
function createLink(dependency, prevDependency, nextDependency, dependent) {
  return {
    dependency,
    _prevDependency: prevDependency,
    _nextDependency: nextDependency,
    dependent,
    _prevDependent: null,
    _nextDependent: null,
    dependencyVersion: dependency._version,
    dependentPullVersion: dependent._pullVersion,
    prevDependents: null
  };
}
var Cell_runtimeState = {
  pendingCells: [],
  pendingCellsIndex: 0,
  pendingCellsCount: 0,
  pulling: 0,
  currentCell: null,
  untrackedCell: null,
  globalVersion: 0,
  afterRelease: null
};
function checkDependencies(node) {
  var globalVersion;
  do {
    globalVersion = Cell_runtimeState.globalVersion;
    for (var link = node._nextDependency; link; link = link._nextDependency) if (link.dependency._actualize(link) || link.dependency._version !== link.dependencyVersion) return true;
  } while (globalVersion !== Cell_runtimeState.globalVersion);
  return false;
}
function enqueueEffect(node) {
  if ((node._flags & 48) === 16) {
    node._flags |= 32;
    Cell_runtimeState.pendingCells[Cell_runtimeState.pendingCellsCount++] = node;
    scheduleRelease();
  }
}
function trimDependencies(node) {
  var current = node._currentDependency;
  var link = (current ?? node)._nextDependency;
  if (link) {
    (current ?? node)._nextDependency = null;
    do {
      var next = link._nextDependency;
      link.dependency._deleteDependent(link);
      link._prevDependency = link._nextDependency = null;
      link = next;
    } while (link);
  }
  node._currentDependency = null;
}
var Cell = class {
  static get pulling() {
    return Cell_runtimeState.currentCell !== null;
  }
  context;
  _compute;
  _assertValue;
  _value;
  _error = null;
  _globalVersion = -1;
  _version = 0;
  _pullVersion = 0;
  _nextDependency = null;
  _nextDependent = null;
  _lastDependent = null;
  _flags;
  _rareState = null;
  constructor(valueOrCompute, options) {
    this.context = options?.context ?? null;
    this._assertValue = options?.assertValue ?? null;
    if (typeof valueOrCompute === "function") {
      this._dependencyFilter = options?.dependencyFilter ?? null;
      this._compute = valueOrCompute;
      this._async = options?.async === true;
      this._put = options?.put ?? null;
      this._value = void 0;
      this._currentDependency = null;
      if (this._async) this._pullId = this._appliedPullId = 0;
      this._flags = 2;
    } else {
      this._compute = null;
      this._assertValue?.(valueOrCompute, void 0);
      this._value = this._pendingValue = valueOrCompute;
      this._flags = 0;
    }
    if (options?.onObserved) this.onObserved(options.onObserved);
    if (options?.onUnobserved) this.onUnobserved(options.onUnobserved);
    if (options?.onError) this.onError(options.onError);
    if (options?.onChange) this.onChange(options.onChange);
  }
  _getRareState() {
    return this._rareState ??= {
      errorCell: null,
      onObserved: null,
      onUnobserved: null,
      pendingEvents: 0
    };
  }
  onChange(handler) {
    var initialized = false;
    var prevValue;
    return effect(() => {
      this.track();
      var value = this._value;
      var changed = initialized && value !== prevValue && !this._error;
      prevValue = value;
      initialized = true;
      if (changed) untracked(() => handler.call(this.context, value));
    });
  }
  onError(handler) {
    var initialized = false;
    var prevError;
    return effect(() => {
      var err = this.error;
      var changed = initialized && err !== prevError;
      prevError = err;
      initialized = true;
      if (changed && err) untracked(() => handler.call(this.context, err));
    });
  }
  get onObserved() {
    return this._getRareState().onObserved ??= event(this.context);
  }
  get onUnobserved() {
    return this._getRareState().onUnobserved ??= event(this.context);
  }
  _scheduleObservation(observed) {
    var rareState = this._rareState;
    var key = observed ? "onObserved" : "onUnobserved";
    if (!rareState?.[key]?.[LISTENERS]?.size) return;
    var flag = observed ? 1 : 2;
    if (rareState.pendingEvents & flag) return;
    rareState.pendingEvents |= flag;
    queueMicrotask(() => {
      try {
        if (!!this._nextDependent === observed && rareState[key]?.[LISTENERS]?.size) fireEvent(rareState[key]);
      } catch (err) {
        config.logError(err);
      } finally {
        rareState.pendingEvents &= ~flag;
      }
    });
  }
  _addDependent(link) {
    if (link._prevDependent || this._nextDependent === link) return;
    if (!(this._flags & 16)) {
      this._actualize();
      if (!(link.dependent._flags & 16)) return;
    }
    ((link._prevDependent = this._lastDependent) ?? this)._nextDependent = this._lastDependent = link;
    this._activate();
  }
  _deleteDependent(link) {
    var prev = link._prevDependent;
    var next = link._nextDependent;
    if (prev) prev._nextDependent = next;else if (this._nextDependent === link) this._nextDependent = next;else return;
    if (next) next._prevDependent = prev;else this._lastDependent = prev;
    link._prevDependent = link._nextDependent = null;
    if (!this._nextDependent) this._deactivate();
  }
  _activate() {
    if (this._flags & 16) return;
    this._flags |= 16;
    this._scheduleObservation(true);
    for (var dependency = this._nextDependency; dependency; dependency = dependency._nextDependency) {
      dependency.dependency._addDependent(dependency);
      if (!(this._flags & 16)) break;
    }
  }
  _deactivate() {
    for (var dependency = this._nextDependency; dependency; dependency = dependency._nextDependency) dependency.dependency._deleteDependent(dependency);
    this._flags &= -17;
    this._scheduleObservation(false);
  }
  _invalidateDependents(waiting, state = 2) {
    var list = this._nextDependent;
    if (!list || list === waiting && !list._nextDependent) return;
    for (var stack = null;;) {
      var link = list;
      do {
        var node = link.dependent;
        var flags = node._flags;
        if (flags & 16 && (!(flags & 8) || link.dependentPullVersion === node._pullVersion)) {
          node._flags = flags | state;
          if (flags & 64) enqueueEffect(node);else if (!(flags & 3) && node._nextDependent) {
            node._nextDependent.prevDependents = stack;
            stack = node._nextDependent;
          }
        }
      } while (link = link._nextDependent);
      if (!stack) break;
      list = stack;
      stack = list.prevDependents;
      list.prevDependents = null;
      state = 1;
    }
  }
  actualize() {
    var prevCell = Cell_runtimeState.currentCell;
    Cell_runtimeState.currentCell = null;
    try {
      this._actualize();
      return this;
    } finally {
      Cell_runtimeState.currentCell = prevCell;
    }
  }
  _actualize(waiting) {
    if (!this._compute) {
      if (this._flags & 2) {
        this._flags &= -3;
        return this._publish(this._pendingValue, null, waiting);
      }
      return false;
    }
    var flags = this._flags;
    if (flags & 12) throw Error("Circular computation");
    if (!(flags & 3) && (flags & 16 || this._globalVersion === Cell_runtimeState.globalVersion)) return false;
    this._flags |= 4;
    try {
      if (flags & 2 || checkDependencies(this)) return this._pull(waiting);
      this._flags &= -2;
      this._globalVersion = Cell_runtimeState.globalVersion;
      return false;
    } finally {
      this._flags &= -5;
    }
  }
  get value() {
    return this.get();
  }
  set value(value) {
    this.set(value);
  }
  get error() {
    if (Cell_runtimeState.currentCell) return (this._getRareState().errorCell ??= new ErrorCell(this)).get();
    this._actualize();
    return this._error;
  }
  get() {
    this.track();
    if (Cell_runtimeState.currentCell && this._error) throw this._error;
    return this._value;
  }
  track() {
    if (this._flags !== 16) this._actualize();
    var node = Cell_runtimeState.currentCell;
    if (!node || node._flags & 64 && !(node._flags & 16) || (node._dependencyFilter ? !node._dependencyFilter(this) : node === Cell_runtimeState.untrackedCell)) return;
    var current = node._currentDependency;
    var next = (current ?? node)._nextDependency;
    if (next?.dependency === this) {
      next.dependencyVersion = this._version;
      next.dependentPullVersion = node._pullVersion;
      node._currentDependency = next;
    } else if (current?.dependency !== this) {
      var link = this._lastDependent;
      if (link?.dependent !== node) {
        link = (current ?? node)._nextDependency = node._currentDependency = createLink(this, current, next, node);
        if (next) next._prevDependency = link;
        if (node._flags & 16) this._addDependent(link);
      } else if (link.dependentPullVersion !== node._pullVersion) this._moveDependency(link, node, current, next);
    }
    if (this._flags & 3) this._invalidateDependents();
  }
  _moveDependency(link, node, current, next) {
    (link._prevDependency ?? node)._nextDependency = link._nextDependency;
    if (link._nextDependency) link._nextDependency._prevDependency = link._prevDependency;
    link._prevDependency = current;
    link._nextDependency = next;
    link.dependencyVersion = this._version;
    link.dependentPullVersion = node._pullVersion;
    (current ?? node)._nextDependency = node._currentDependency = link;
    if (next) next._prevDependency = link;
  }
  pull() {
    if (!this._compute) return false;
    if (this._flags & 12) throw Error("Circular computation");
    var prevCell = Cell_runtimeState.currentCell;
    Cell_runtimeState.currentCell = null;
    this._flags |= 4;
    var value = this._value;
    try {
      if (this._pull()) this._globalVersion = ++Cell_runtimeState.globalVersion;
      return this._error ? this._error instanceof WaitError : this._value !== value;
    } finally {
      this._flags &= -5;
      Cell_runtimeState.currentCell = prevCell;
    }
  }
  _pull(waiting) {
    var {
      currentCell: prevCell,
      globalVersion
    } = Cell_runtimeState;
    Cell_runtimeState.pulling++;
    Cell_runtimeState.currentCell = this;
    this._pullVersion++;
    this._flags = this._flags & -4 | 8;
    var value = this._value;
    var error = null;
    var pullId = this._async ? ++this._pullId : 0;
    try {
      var result = this._compute.call(this.context, value);
      if (this._async && isPromiseLike(result)) {
        Promise.resolve(result).then(value => {
          if (pullId > this._appliedPullId) {
            this._appliedPullId = pullId;
            this._globalVersion = ++Cell_runtimeState.globalVersion;
            this._flags &= -4;
            this._publish(value, null);
          }
        }, err => {
          if (pullId > this._appliedPullId) {
            if (!(err instanceof WaitError)) this._appliedPullId = pullId;
            this._globalVersion = ++Cell_runtimeState.globalVersion;
            this._flags &= -4;
            this._publish(value, err);
            if (!(err instanceof WaitError)) config.logError(err);
          }
        });
        error = WaitError.instance;
      } else value = result;
    } catch (err) {
      error = err instanceof Error ? err : Error(err === void 0 ? void 0 : String(err));
    } finally {
      this._flags &= -9;
      Cell_runtimeState.currentCell = prevCell;
      Cell_runtimeState.pulling--;
      trimDependencies(this);
    }
    if (globalVersion !== (this._globalVersion = Cell_runtimeState.globalVersion)) this._flags |= 1;
    if (this._async && !(error instanceof WaitError)) this._appliedPullId = pullId;
    var changed = this._publish(value, error, waiting);
    if (error && !(error instanceof WaitError) && this._async) config.logError(error);
    return changed;
  }
  _publish(value, error, waiting) {
    var errorChanged = error !== this._error;
    if (error ? !errorChanged : !errorChanged && value === this._value) return false;
    this._value = value;
    this._error = error;
    this._version++;
    if (errorChanged) this._rareState?.errorCell?._push(error);
    this._invalidateDependents(waiting);
    return true;
  }
  set(value) {
    if (this._compute && !this._put) throw Error("Cannot write to a computed cell");
    this._assertValue?.(value, this._compute ? this._value : this._pendingValue);
    if (this._compute) this._put.call(this.context, value, this._value);else if (value !== this._pendingValue) {
      Cell_runtimeState.globalVersion++;
      this._pendingValue = value;
      this._flags |= 2;
      this._invalidateDependents(void 0, 1);
    }
    return this;
  }
  disconnect() {
    while (this._nextDependent) this._nextDependent.dependent.disconnect();
    this._rareState?.errorCell?.disconnect();
    if (this._flags & 16) this._deactivate();
    this._scheduleObservation(false);
    return this;
  }
};
var ErrorCell = class extends Cell {
  constructor(owner) {
    super(owner._error);
    this._nextDependency = createLink(owner, null, null, this);
  }
  _actualize() {
    if (this._flags & 4) throw Error("Circular computation");
    var version = this._version;
    var owner = this._nextDependency.dependency;
    this._flags |= 4;
    try {
      owner._actualize(this._nextDependency);
      this._nextDependency.dependencyVersion = owner._version;
      this._globalVersion = Cell_runtimeState.globalVersion;
      this._flags &= -4;
      if (owner._flags & 3) this._flags |= 1;
      return this._version !== version;
    } finally {
      this._flags &= -5;
    }
  }
  _push(value) {
    if (value !== this._value) {
      this._value = value;
      this._version++;
      this._invalidateDependents();
    }
  }
};
//#endregion
//#region src/afterRelease.ts
function afterRelease(cb) {
  (Cell_runtimeState.afterRelease ??= []).push(cb);
  scheduleRelease();
}
//#endregion
//#region src/reaction.ts
function reaction(source, fn, cellOptions) {
  var cell = new Cell(source instanceof Cell ? () => source.value : source, cellOptions);
  var disposer = () => {
    cell.disconnect();
  };
  cell.onChange(function (value) {
    var prevCell = Cell_runtimeState.currentCell;
    Cell_runtimeState.currentCell = null;
    try {
      return fn.call(this, value, disposer);
    } finally {
      Cell_runtimeState.currentCell = prevCell;
    }
  });
  return disposer;
}
//#endregion
//#region src/batch.ts
var batchDepth = 0;
function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    if (--batchDepth === 0) release();
  }
}
//#endregion
//#region src/cellx.ts
function cellx(valueOrCompute, options) {
  return new Cell(valueOrCompute, options);
}
//#endregion
export { Cell, DependencyFilter, WaitError, afterRelease, batch, cellx, configure, effect, reaction, release, tracked, untracked };