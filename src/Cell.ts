import { LISTENERS, type TEvent, event, fireEvent } from '@riim/event';
import { WaitError } from './WaitError';
import { config } from './config';
import { effect } from './effect';
import { scheduleRelease } from './release';
import { untracked } from './track';
import { isPromiseLike } from './utils/isPromiseLike';

export type TCellValue<T> = T extends Cell<infer U, any> ? U : T;

export type TCellCompute<Value = any, Context = any> = (
	this: Context,
	value: NoInfer<Value> | undefined
) => Value;

export type TAsyncCellCompute<Value = any, Context = any> = (
	this: Context,
	value: NoInfer<Value> | undefined
) => Value | PromiseLike<Value>;

export type TCellPut<Value = any, Context = any> = (
	this: Context,
	nextValue: Value,
	value: Value | undefined
) => void;

export interface ICellOptionsBase<Value = any, Context = any> {
	context?: Context;
	dependencyFilter?: (dependency: Cell) => any;
	// compute
	// async
	assertValue?: (nextValue: NoInfer<Value>, value: NoInfer<Value> | undefined) => void;
	put?: TCellPut<NoInfer<Value>, Context>;
	onChange?: Parameters<Cell<NoInfer<Value>, Context>['onChange']>[0];
	onError?: Parameters<Cell<Value, Context>['onError']>[0];
	onObserved?: Parameters<Cell<Value, Context>['onObserved']>[0];
	onUnobserved?: Parameters<Cell<Value, Context>['onUnobserved']>[0];
}

export interface ICellOptions<Value = any, Context = any> extends ICellOptionsBase<Value, Context> {
	async?: false;
}

export interface IAsyncCellOptions<Value = any, Context = any> extends ICellOptionsBase<
	Value,
	Context
> {
	async: true;
}

export type TAnyCellOptions<Value = any, Context = any> =
	ICellOptions<Value, Context> | IAsyncCellOptions<Value, Context>;

interface ICellRareState<Context> {
	errorCell: ErrorCell | null;
	onObserved: TEvent<void, Context> | null;
	onUnobserved: TEvent<void, Context> | null;
	pendingEvents: number;
}

export const enum Flags {
	PENDING = 1,
	DIRTY = 2,
	CHECKING = 4,
	PULLING = 8,
	ACTIVE = 16,
	QUEUED = 32,
	EFFECT = 64
}

export interface IReactiveNode {
	_dependencyFilter: ((dependency: Cell) => any) | null;
	_pullVersion: number;
	_nextDependency: ILink | null;
	_currentDependency: ILink | null;
	_nextDependent: ILink | null;
	_flags: number;
	_actualize(waiting?: ILink): boolean;
	disconnect(): IReactiveNode;
}

export interface ILink {
	readonly dependency: Cell;
	_prevDependency: ILink | null;
	_nextDependency: ILink | null;

	readonly dependent: IReactiveNode;
	_prevDependent: ILink | null;
	_nextDependent: ILink | null;

	dependencyVersion: number;
	dependentPullVersion: number;

	prevDependents: ILink | null;
}

function createLink(
	dependency: Cell,
	prevDependency: ILink | null,
	nextDependency: ILink | null,
	dependent: IReactiveNode
): ILink {
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

export const Cell_runtimeState = {
	pendingCells: [] as Array<IReactiveNode | undefined>,
	pendingCellsIndex: 0,
	pendingCellsCount: 0,

	pulling: 0,
	currentCell: null as IReactiveNode | null,
	untrackedCell: null as IReactiveNode | null,

	globalVersion: 0,

	afterRelease: null as Array<() => void> | null
};

export function checkDependencies(node: IReactiveNode): boolean {
	let globalVersion: number;

	do {
		globalVersion = Cell_runtimeState.globalVersion;

		for (let link = node._nextDependency; link; link = link._nextDependency) {
			if (link.dependency._actualize(link) || link.dependency._version !== link.dependencyVersion) {
				return true;
			}
		}
	} while (globalVersion !== Cell_runtimeState.globalVersion);

	return false;
}

export function enqueueEffect(node: IReactiveNode): void {
	if ((node._flags & (Flags.ACTIVE | Flags.QUEUED)) === Flags.ACTIVE) {
		node._flags |= Flags.QUEUED;
		Cell_runtimeState.pendingCells[Cell_runtimeState.pendingCellsCount++] = node;
		scheduleRelease();
	}
}

export function trimDependencies(node: IReactiveNode): void {
	let current = node._currentDependency;
	let link = (current ?? node)._nextDependency;

	if (link) {
		(current ?? node)._nextDependency = null;

		do {
			let next: ILink | null = link._nextDependency;

			link.dependency._deleteDependent(link);
			link._prevDependency = link._nextDependency = null;
			link = next;
		} while (link);
	}

	node._currentDependency = null;
}

export class Cell<Value = any, Context = any> implements IReactiveNode {
	static get pulling() {
		return Cell_runtimeState.currentCell !== null;
	}

	readonly context: Context;
	declare _dependencyFilter: ((dependency: Cell) => any) | null;
	protected _compute: TAsyncCellCompute<Value, Context> | null;
	declare protected _async: boolean;
	protected _assertValue: ICellOptionsBase<Value, Context>['assertValue'] | null;
	declare protected _put: TCellPut<Value, Context> | null;

	protected _value: Value | undefined;
	_error: Error | null = null;

	protected _globalVersion = -1;
	_version = 0;
	_pullVersion = 0;

	_nextDependency: ILink | null = null;
	declare _currentDependency: ILink | null;
	_nextDependent: ILink | null = null;
	protected _lastDependent: ILink | null = null;

	_flags: number;

	declare protected _pullId: number;
	declare protected _appliedPullId: number;

	protected _rareState: ICellRareState<Context> | null = null;

	constructor(
		compute: TAsyncCellCompute<Value, Context>,
		options: IAsyncCellOptions<Value, Context>
	);
	constructor(
		valueOrCompute: Value | TCellCompute<Value, Context>,
		options?: ICellOptions<Value, Context>
	);
	constructor(
		valueOrCompute: Value | TAsyncCellCompute<Value, Context>,
		options?: TAnyCellOptions<Value, Context>
	) {
		this.context = (options?.context ?? null) as Context;
		this._assertValue = options?.assertValue ?? null;

		if (typeof valueOrCompute === 'function') {
			this._dependencyFilter = options?.dependencyFilter ?? null;
			this._compute = valueOrCompute as TAsyncCellCompute<Value, Context>;
			this._async = options?.async === true;
			this._put = options?.put ?? null;

			this._value = undefined;

			this._currentDependency = null;

			if (this._async) {
				this._pullId = this._appliedPullId = 0;
			}

			this._flags = Flags.DIRTY;
		} else {
			this._compute = null;
			this._assertValue?.(valueOrCompute, undefined);
			this._value = valueOrCompute;
			this._flags = 0;
		}

		if (options?.onObserved) {
			this.onObserved(options.onObserved);
		}
		if (options?.onUnobserved) {
			this.onUnobserved(options.onUnobserved);
		}
		if (options?.onError) {
			this.onError(options.onError);
		}
		if (options?.onChange) {
			this.onChange(options.onChange);
		}
	}

	protected _getRareState(): ICellRareState<Context> {
		return (this._rareState ??= {
			errorCell: null,
			onObserved: null,
			onUnobserved: null,
			pendingEvents: 0
		});
	}

	onChange(handler: (this: Context, value: Value) => void): () => void {
		let initialized = false;
		let prevValue: Value | undefined;

		return effect(() => {
			this.track();

			let value = this._value;
			let changed = initialized && value !== prevValue && !this._error;

			prevValue = value;
			initialized = true;

			if (changed) {
				untracked(() => handler.call(this.context, value!));
			}
		});
	}

	onError(handler: (this: Context, err: Error) => void): () => void {
		let initialized = false;
		let prevError: Error | null;

		return effect(() => {
			let err = this.error;
			let changed = initialized && err !== prevError;

			prevError = err;
			initialized = true;

			if (changed && err) {
				untracked(() => handler.call(this.context, err));
			}
		});
	}

	get onObserved(): TEvent<void, Context> {
		return (this._getRareState().onObserved ??= event(this.context));
	}

	get onUnobserved(): TEvent<void, Context> {
		return (this._getRareState().onUnobserved ??= event(this.context));
	}

	protected _scheduleObservation(observed: boolean): void {
		let rareState = this._rareState;
		let key = observed ? 'onObserved' : 'onUnobserved';

		if (!rareState?.[key]?.[LISTENERS]?.size) {
			return;
		}

		let flag = observed ? 1 : 2;

		if (rareState.pendingEvents & flag) {
			return;
		}
		rareState.pendingEvents |= flag;

		queueMicrotask(() => {
			try {
				if (!!this._nextDependent === observed && rareState[key]?.[LISTENERS]?.size) {
					fireEvent(rareState[key]);
				}
			} catch (err) {
				config.logError(err);
			} finally {
				rareState.pendingEvents &= ~flag;
			}
		});
	}

	_addDependent(link: ILink): void {
		// У уже подключённой связи либо есть предыдущий элемент, либо она является
		// головой списка.
		if (link._prevDependent || this._nextDependent === link) {
			return;
		}

		if (!(this._flags & Flags.ACTIVE)) {
			this._actualize();

			if (!(link.dependent._flags & Flags.ACTIVE)) {
				return;
			}
		}

		((link._prevDependent = this._lastDependent) ?? this)._nextDependent = this._lastDependent =
			link;

		this._activate();
	}

	_deleteDependent(link: ILink): void {
		let prev = link._prevDependent;
		let next = link._nextDependent;

		if (prev) {
			prev._nextDependent = next;
		} else if (this._nextDependent === link) {
			this._nextDependent = next;
		} else {
			return;
		}

		if (next) {
			next._prevDependent = prev;
		} else {
			this._lastDependent = prev;
		}

		link._prevDependent = link._nextDependent = null;

		if (!this._nextDependent) {
			this._deactivate();
		}
	}

	protected _activate(): void {
		if (this._flags & Flags.ACTIVE) {
			return;
		}
		this._flags |= Flags.ACTIVE;

		this._scheduleObservation(true);

		for (
			let dependency = this._nextDependency;
			dependency;
			dependency = dependency._nextDependency
		) {
			dependency.dependency._addDependent(dependency);

			if (!(this._flags & Flags.ACTIVE)) {
				break;
			}
		}
	}

	protected _deactivate(): void {
		for (
			let dependency = this._nextDependency;
			dependency;
			dependency = dependency._nextDependency
		) {
			dependency.dependency._deleteDependent(dependency);
		}

		this._flags &= ~Flags.ACTIVE;
		this._scheduleObservation(false);
	}

	protected _invalidateDependents(waiting?: ILink): void {
		let list = this._nextDependent;

		if (!list || (list === waiting && !list._nextDependent)) {
			return;
		}

		for (let stack: ILink | null = null, state = Flags.DIRTY; ;) {
			let link: ILink | null = list;

			do {
				let node = link.dependent;
				let flags = node._flags;

				if (
					flags & Flags.ACTIVE &&
					(!(flags & Flags.PULLING) ||
						// Если сейчас выполняется, то считаются только уже прочитанные связи.
						link.dependentPullVersion === node._pullVersion)
				) {
					node._flags = flags | state;

					if (flags & Flags.EFFECT) {
						enqueueEffect(node);
					} else if (!(flags & (Flags.PENDING | Flags.DIRTY)) && node._nextDependent) {
						node._nextDependent.prevDependents = stack;
						stack = node._nextDependent;
					}
				}
			} while ((link = link._nextDependent));

			if (!stack) {
				break;
			}

			list = stack;
			stack = list.prevDependents;
			list.prevDependents = null;
			state = Flags.PENDING;
		}
	}

	actualize(): this {
		let prevCell = Cell_runtimeState.currentCell;
		Cell_runtimeState.currentCell = null;

		try {
			this._actualize();
			return this;
		} finally {
			Cell_runtimeState.currentCell = prevCell;
		}
	}

	_actualize(waiting?: ILink): boolean {
		if (!this._compute) {
			return false;
		}

		let flags = this._flags;

		if (flags & (Flags.CHECKING | Flags.PULLING)) {
			throw Error('Circular computation');
		}

		if (
			!(flags & (Flags.DIRTY | Flags.PENDING)) &&
			(flags & Flags.ACTIVE || this._globalVersion === Cell_runtimeState.globalVersion)
		) {
			return false;
		}

		this._flags |= Flags.CHECKING;

		try {
			if (flags & Flags.DIRTY || checkDependencies(this)) {
				return this._pull(waiting);
			}

			this._flags &= ~Flags.PENDING;
			this._globalVersion = Cell_runtimeState.globalVersion;

			return false;
		} finally {
			this._flags &= ~Flags.CHECKING;
		}
	}

	get value(): Value {
		return this.get();
	}
	set value(value: Value) {
		this.set(value);
	}

	get error(): Error | null {
		if (Cell_runtimeState.currentCell) {
			return (this._getRareState().errorCell ??= new ErrorCell(this)).get();
		}

		this._actualize();

		return this._error;
	}

	get(): Value {
		this.track();

		if (Cell_runtimeState.currentCell && this._error) {
			throw this._error;
		}

		return this._value!;
	}

	track(): void {
		if (this._flags !== Flags.ACTIVE) {
			this._actualize();
		}

		let node = Cell_runtimeState.currentCell;

		if (
			!node ||
			(node._flags & Flags.EFFECT && !(node._flags & Flags.ACTIVE)) ||
			(node._dependencyFilter
				? !node._dependencyFilter(this)
				: node === Cell_runtimeState.untrackedCell)
		) {
			return;
		}

		let current = node._currentDependency;
		let next = (current ?? node)._nextDependency;

		if (next?.dependency === this) {
			next.dependencyVersion = this._version;
			next.dependentPullVersion = node._pullVersion;
			node._currentDependency = next;
		} else if (current?.dependency !== this) {
			let link = this._lastDependent;

			if (link?.dependent !== node) {
				link =
					(current ?? node)._nextDependency =
					node._currentDependency =
						createLink(this, current, next, node);

				if (next) {
					next._prevDependency = link;
				}

				if (node._flags & Flags.ACTIVE) {
					this._addDependent(link);
				}
			} else if (
				// Связь ещё не была прочитана в этом выполнении.
				link.dependentPullVersion !== node._pullVersion
			) {
				this._moveDependency(link, node, current, next);
			}
		}

		if (this._flags & (Flags.PENDING | Flags.DIRTY)) {
			this._invalidateDependents();
		}
	}

	protected _moveDependency(
		link: ILink,
		node: IReactiveNode,
		current: ILink | null,
		next: ILink | null
	): void {
		(link._prevDependency ?? node)._nextDependency = link._nextDependency;

		if (link._nextDependency) {
			link._nextDependency._prevDependency = link._prevDependency;
		}

		link._prevDependency = current;
		link._nextDependency = next;
		link.dependencyVersion = this._version;
		link.dependentPullVersion = node._pullVersion;
		(current ?? node)._nextDependency = node._currentDependency = link;

		if (next) {
			next._prevDependency = link;
		}
	}

	pull(): boolean {
		if (!this._compute) {
			return false;
		}
		if (this._flags & (Flags.CHECKING | Flags.PULLING)) {
			throw Error('Circular computation');
		}

		let prevCell = Cell_runtimeState.currentCell;
		Cell_runtimeState.currentCell = null;

		this._flags |= Flags.CHECKING;

		let value = this._value;

		try {
			if (this._pull()) {
				this._globalVersion = ++Cell_runtimeState.globalVersion;
			}

			return this._error ? this._error instanceof WaitError : this._value !== value;
		} finally {
			this._flags &= ~Flags.CHECKING;
			Cell_runtimeState.currentCell = prevCell;
		}
	}

	protected _pull(waiting?: ILink): boolean {
		let { currentCell: prevCell, globalVersion } = Cell_runtimeState;

		Cell_runtimeState.pulling++;
		Cell_runtimeState.currentCell = this;

		this._pullVersion++;
		this._flags = (this._flags & ~(Flags.PENDING | Flags.DIRTY)) | Flags.PULLING;

		let value = this._value;
		let error: Error | null = null;
		let pullId = this._async ? ++this._pullId : 0;

		try {
			let result = this._compute!.call(this.context, value);

			if (this._async && isPromiseLike(result)) {
				Promise.resolve(result).then(
					(value) => {
						if (pullId > this._appliedPullId) {
							this._appliedPullId = pullId;
							this._globalVersion = ++Cell_runtimeState.globalVersion;
							this._flags &= ~(Flags.PENDING | Flags.DIRTY);
							this._publish(value, null);
						}
					},
					(err) => {
						if (pullId > this._appliedPullId) {
							if (!(err instanceof WaitError)) {
								this._appliedPullId = pullId;
							}

							this._globalVersion = ++Cell_runtimeState.globalVersion;
							this._flags &= ~(Flags.PENDING | Flags.DIRTY);
							this._publish(value, err);

							if (!(err instanceof WaitError)) {
								config.logError(err);
							}
						}
					}
				);
				error = WaitError.instance;
			} else {
				value = result as Value;
			}
		} catch (err) {
			error = err instanceof Error ? err : Error(err === undefined ? undefined : String(err));
		} finally {
			this._flags &= ~Flags.PULLING;
			Cell_runtimeState.currentCell = prevCell;
			Cell_runtimeState.pulling--;
			trimDependencies(this);
		}

		if (globalVersion !== (this._globalVersion = Cell_runtimeState.globalVersion)) {
			this._flags |= Flags.PENDING;
		}

		if (this._async && !(error instanceof WaitError)) {
			this._appliedPullId = pullId;
		}

		let changed = this._publish(value, error, waiting);

		if (error && !(error instanceof WaitError) && this._async) {
			config.logError(error);
		}

		return changed;
	}

	protected _publish(value: Value | undefined, error: Error | null, waiting?: ILink): boolean {
		let errorChanged = error !== this._error;

		if (error ? !errorChanged : !errorChanged && value === this._value) {
			return false;
		}

		this._value = value;
		this._error = error;
		this._version++;

		if (errorChanged) {
			this._rareState?.errorCell?._push(error);
		}

		this._invalidateDependents(waiting);

		return true;
	}

	set(value: Value): this {
		if (this._compute && !this._put) {
			throw Error('Cannot write to a computed cell');
		}

		this._assertValue?.(value, this._value);

		if (this._compute) {
			this._put!.call(this.context, value, this._value);
		} else if (value !== this._value) {
			Cell_runtimeState.globalVersion++;
			this._value = value;
			this._version++;
			this._invalidateDependents();
		}

		return this;
	}

	disconnect(): this {
		while (this._nextDependent) {
			this._nextDependent.dependent.disconnect();
		}

		this._rareState?.errorCell?.disconnect();

		if (this._flags & Flags.ACTIVE) {
			this._deactivate();
		}

		this._scheduleObservation(false);

		return this;
	}
}

class ErrorCell extends Cell<Error | null> {
	declare _nextDependency: ILink;

	constructor(owner: Cell) {
		super(owner._error);
		this._nextDependency = createLink(owner, null, null, this);
	}

	override _actualize(): boolean {
		if (this._flags & Flags.CHECKING) {
			throw Error('Circular computation');
		}

		let version = this._version;
		let owner = this._nextDependency.dependency;

		this._flags |= Flags.CHECKING;

		try {
			owner._actualize(this._nextDependency);
			this._nextDependency.dependencyVersion = owner._version;
			this._globalVersion = Cell_runtimeState.globalVersion;
			this._flags &= ~(Flags.PENDING | Flags.DIRTY);

			if (owner._flags & (Flags.PENDING | Flags.DIRTY)) {
				this._flags |= Flags.PENDING;
			}

			return this._version !== version;
		} finally {
			this._flags &= ~Flags.CHECKING;
		}
	}

	_push(value: Error | null): void {
		if (value !== this._value) {
			this._value = value;
			this._version++;
			this._invalidateDependents();
		}
	}
}
