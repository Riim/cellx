import {
	type Cell,
	Cell_runtimeState,
	Flags,
	type ILink,
	type IReactiveNode,
	checkDependencies,
	enqueueEffect,
	trimDependencies
} from './Cell';
import { WaitError } from './WaitError';
import { config } from './config';

export interface IEffectOptions<Context = any> {
	context?: Context;
	dependencyFilter?: (dependency: Cell) => any;
}

class EffectNode<Context> implements IReactiveNode {
	protected context: Context;
	_dependencyFilter: ((dependency: Cell) => any) | null;
	_fn: ((this: Context, dispose: () => void) => void) | null;
	readonly _dispose: () => void;

	_pullVersion = 0;

	_nextDependency: ILink | null = null;
	_currentDependency: ILink | null = null;
	readonly _nextDependent = null;

	_flags: number = Flags.DIRTY | Flags.ACTIVE | Flags.EFFECT;

	constructor(fn: (this: Context, dispose: () => void) => void, options?: IEffectOptions<Context>) {
		this.context = (options?.context ?? null) as Context;
		this._dependencyFilter = options?.dependencyFilter ?? null;
		this._fn = fn;
		this._dispose = () => {
			this.disconnect();
		};
	}

	_actualize(): boolean {
		if (!(this._flags & Flags.ACTIVE) || this._flags & (Flags.PULLING | Flags.CHECKING)) {
			return false;
		}

		this._flags |= Flags.CHECKING;

		try {
			if (this._flags & Flags.DIRTY || (this._flags & Flags.PENDING && checkDependencies(this))) {
				if (this._flags & Flags.ACTIVE) {
					this._run();
				}
			} else {
				this._flags &= ~Flags.PENDING;
			}
		} catch (err) {
			if (!(err instanceof WaitError)) {
				config.logError(
					err instanceof Error ? err : Error(err === undefined ? undefined : String(err))
				);
			}
		} finally {
			this._flags &= ~Flags.CHECKING;
		}

		return false;
	}

	protected _run() {
		let prevCell = Cell_runtimeState.currentCell;
		Cell_runtimeState.currentCell = this;

		this._pullVersion++;
		this._flags = (this._flags & ~(Flags.DIRTY | Flags.PENDING)) | Flags.PULLING;

		try {
			this._fn!.call(this.context, this._dispose);
		} finally {
			Cell_runtimeState.currentCell = prevCell;
			this._flags &= ~Flags.PULLING;

			if (!(this._flags & Flags.ACTIVE)) {
				this._currentDependency = null;
			}

			trimDependencies(this);

			// Вложенный release мог уже забрать запись очереди у ещё выполняющегося effect.
			if (this._flags & (Flags.DIRTY | Flags.PENDING)) {
				enqueueEffect(this);
			}
		}
	}

	disconnect(): this {
		if (!(this._flags & Flags.ACTIVE)) {
			return this;
		}

		this._fn = null;
		this._flags &= ~(Flags.PENDING | Flags.DIRTY | Flags.ACTIVE);

		if (this._flags & Flags.PULLING) {
			// Курсор жив до выхода из формулы, но обратных подписок уже нет.
			for (let link = this._nextDependency; link; link = link._nextDependency) {
				link.dependency._deleteDependent(link);
			}
		} else {
			this._currentDependency = null;
			trimDependencies(this);
		}

		return this;
	}
}

export function effect<Context = null>(
	fn: (this: Context, dispose: () => void) => void,
	options?: IEffectOptions<Context>
): () => void {
	let node = new EffectNode(fn, options);

	node._actualize();

	return node._dispose;
}
