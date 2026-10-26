import { Bench, type ITaskFnParams } from '@riim/bench';
import { fib } from './utils';

const hardFibArg = +(process.argv[2] ?? 10);

export function hard() {
	return fib(hardFibArg);
}

type TUpdateEntries = (value1: number, value2: number, value3: number) => void;
type TSetup = (
	taskFnParams: ITaskFnParams,
	listener: (computedValue: number) => void
) => Promise<TUpdateEntries>;

const noop = () => {};

const setups: Array<[string, TSetup]> = [
	[
		'act',
		async ({ timeStart, timeEnd }, listener) => {
			const { act } = await import('@artalar/act');

			timeStart();

			const x = act(0);
			const y = act(0);
			const z = act(0);
			const a = act(() => x() + 1);
			const b = act(() => x() - y() + hard());
			const c = act(() => y() + z() - hard());
			const d = act(() => z() - 2);
			const e = act(() => a() + (a() % 6 < 3 ? b() : 0));
			const f = act(() => ((y() + hard()) % 7 < 3 ? a() : d()));
			const g = act(() => d() - (d() % 6 < 3 ? c() : 0));
			const h = act(() => (e() % 5 < g() % 9 ? f() : 0) + g());

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				x(value1);
				y(value2);
				z(value3);

				act.notify();
			};
		}
	],

	[
		'alien-signals',
		async ({ timeStart, timeEnd }, listener) => {
			const { computed, effect, endBatch, signal, startBatch } = await import('alien-signals');

			timeStart();

			const x = signal(0);
			const y = signal(0);
			const z = signal(0);
			const a = computed(() => x() + 1);
			const b = computed(() => x() - y() + hard());
			const c = computed(() => y() + z() - hard());
			const d = computed(() => z() - 2);
			const e = computed(() => a() + (a() % 6 < 3 ? b() : 0));
			const f = computed(() => ((y() + hard()) % 7 < 3 ? a() : d()));
			const g = computed(() => d() - (d() % 6 < 3 ? c() : 0));
			const h = computed(() => (e() % 5 < g() % 9 ? f() : 0) + g());

			effect(() => {
				listener(h());
			});

			timeEnd();

			return (value1, value2, value3) => {
				startBatch();

				x(value1);
				y(value2);
				z(value3);

				endBatch();
			};
		}
	],

	[
		'baconjs (static)',
		async ({ timeStart, timeEnd }, listener) => {
			const { Bus, combineWith } = await import('baconjs');

			timeStart();

			const stateBus = new Bus<[number, number, number]>();
			const state = stateBus.toProperty([0, 0, 0]);
			const x = state.map((values) => values[0]).skipDuplicates();
			const y = state.map((values) => values[1]).skipDuplicates();
			const z = state.map((values) => values[2]).skipDuplicates();
			const a = x.map((x) => x + 1);
			const b = combineWith(x, y, (x, y) => x - y + hard());
			const c = combineWith(y, z, (y, z) => y + z - hard());
			const d = z.map((z) => z - 2);
			const e = combineWith(a, b, (a, b) => a + (a % 6 < 3 ? b : 0));
			const f = combineWith(y, a, d, (y, a, d) => ((y + hard()) % 7 < 3 ? a : d));
			const g = combineWith(c, d, (c, d) => d - (d % 6 < 3 ? c : 0));
			const h = combineWith(e, f, g, (e, f, g) => (e % 5 < g % 9 ? f : 0) + g);

			h.onValue(listener);

			timeEnd();

			return (value1, value2, value3) => {
				stateBus.push([value1, value2, value3]);
			};
		}
	],

	[
		'cellx',
		async ({ timeStart, timeEnd }, listener) => {
			const { cellx, effect, release } = await import('cellx');

			timeStart();

			const x = cellx(0);
			const y = cellx(0);
			const z = cellx(0);
			const a = cellx(() => x.value + 1);
			const b = cellx(() => x.value - y.value + hard());
			const c = cellx(() => y.value + z.value - hard());
			const d = cellx(() => z.value - 2);
			const e = cellx(() => a.value + (a.value % 6 < 3 ? b.value : 0));
			const f = cellx(() => ((y.value + hard()) % 7 < 3 ? a.value : d.value));
			const g = cellx(() => d.value - (d.value % 6 < 3 ? c.value : 0));
			const h = cellx(() => (e.value % 5 < g.value % 9 ? f.value : 0) + g.value);

			effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				x.value = value1;
				y.value = value2;
				z.value = value3;

				release();
			};
		}
	],

	[
		'effector (static)',
		async ({ timeStart, timeEnd }, listener) => {
			const { combine, createEvent, createStore, launch } = await import('effector');

			timeStart();

			const xEvent = createEvent<number>();
			const yEvent = createEvent<number>();
			const zEvent = createEvent<number>();
			const x = createStore(0).on(xEvent, (state, x) => x);
			const y = createStore(0).on(yEvent, (state, y) => y);
			const z = createStore(0).on(zEvent, (state, z) => z);
			const a = x.map((x) => x + 1);
			const b = combine(x, y, (x, y) => x - y + hard());
			const c = combine(y, z, (y, z) => y + z - hard());
			const d = z.map((z) => z - 2);
			const e = combine(a, b, (a, b) => a + (a % 6 < 3 ? b : 0));
			const f = combine(y, a, d, (y, a, d) => ((y + hard()) % 7 < 3 ? a : d));
			const g = combine(c, d, (c, d) => d - (d % 6 < 3 ? c : 0));
			const h = combine(e, f, g, (e, f, g) => (e % 5 < g % 9 ? f : 0) + g);

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				launch({
					target: [xEvent, yEvent, zEvent],
					params: [value1, value2, value3]
				});
			};
		}
	],

	[
		'flyd (static)',
		async ({ timeStart, timeEnd }, listener) => {
			const { default: flyd } = await import('flyd');

			timeStart();

			const state = flyd.stream<[number, number, number]>([0, 0, 0]);
			const x = flyd.combine((state) => state()[0], [state]);
			const y = flyd.combine((state) => state()[1], [state]);
			const z = flyd.combine((state) => state()[2], [state]);
			const a = flyd.combine((x) => x() + 1, [x]);
			const b = flyd.combine((x, y) => x() - y() + hard(), [x, y]);
			const c = flyd.combine((y, z) => y() + z() - hard(), [y, z]);
			const d = flyd.combine((z) => z() - 2, [z]);
			const e = flyd.combine((a, b) => a() + (a() % 6 < 3 ? b() : 0), [a, b]);
			const f = flyd.combine((y, a, d) => ((y() + hard()) % 7 < 3 ? a() : d()), [y, a, d]);
			const g = flyd.combine((c, d) => d() - (d() % 6 < 3 ? c() : 0), [c, d]);
			const h = flyd.combine((e, f, g) => (e() % 5 < g() % 9 ? f() : 0) + g(), [e, f, g]);

			flyd.on(listener, h);

			timeEnd();

			return (value1, value2, value3) => {
				state([value1, value2, value3]);
			};
		}
	],

	[
		'frp-ts (static)',
		async ({ timeStart, timeEnd }, listener) => {
			const { action, combine, newAtom } = await import('@frp-ts/core');

			timeStart();

			const x = newAtom(0);
			const y = newAtom(0);
			const z = newAtom(0);
			const a = combine(x, (x) => x + 1);
			const b = combine(x, y, (x, y) => x - y + hard());
			const c = combine(y, z, (y, z) => y + z - hard());
			const d = combine(z, (z) => z - 2);
			const e = combine(a, b, (a, b) => a + (a % 6 < 3 ? b : 0));
			const f = combine(y, a, d, (y, a, d) => ((y + hard()) % 7 < 3 ? a : d));
			const g = combine(c, d, (c, d) => d - (d % 6 < 3 ? c : 0));
			const h = combine(e, f, g, (e, f, g) => (e % 5 < g % 9 ? f : 0) + g);

			h.subscribe({ next: () => listener(h.get()) });

			timeEnd();

			return (value1, value2, value3) => {
				action(() => {
					x.set(value1);
					y.set(value2);
					z.set(value3);
				});
			};
		}
	],

	[
		'maverick-signals',
		async ({ timeStart, timeEnd }, listener) => {
			const { computed, effect, signal, tick } = await import('@maverick-js/signals');

			timeStart();

			const x = signal(0);
			const y = signal(0);
			const z = signal(0);
			const a = computed(() => x() + 1);
			const b = computed(() => x() - y() + hard());
			const c = computed(() => y() + z() - hard());
			const d = computed(() => z() - 2);
			const e = computed(() => a() + (a() % 6 < 3 ? b() : 0));
			const f = computed(() => ((y() + hard()) % 7 < 3 ? a() : d()));
			const g = computed(() => d() - (d() % 6 < 3 ? c() : 0));
			const h = computed(() => (e() % 5 < g() % 9 ? f() : 0) + g());

			effect(() => listener(h()));

			timeEnd();

			return (value1, value2, value3) => {
				x.set(value1);
				y.set(value2);
				z.set(value3);

				tick();
			};
		}
	],

	[
		'mobx',
		async ({ timeStart, timeEnd }, listener) => {
			const { computed, observable, reaction, runInAction } = await import('mobx');

			timeStart();

			const x = observable.box(0);
			const y = observable.box(0);
			const z = observable.box(0);
			const a = computed(() => x.get() + 1);
			const b = computed(() => x.get() - y.get() + hard());
			const c = computed(() => y.get() + z.get() - hard());
			const d = computed(() => z.get() - 2);
			const e = computed(() => a.get() + (a.get() % 6 < 3 ? b.get() : 0));
			const f = computed(() => ((y.get() + hard()) % 7 < 3 ? a.get() : d.get()));
			const g = computed(() => d.get() - (d.get() % 6 < 3 ? c.get() : 0));
			const h = computed(() => (e.get() % 5 < g.get() % 9 ? f.get() : 0) + g.get());

			reaction(() => h.get(), listener);

			timeEnd();

			return (value1, value2, value3) => {
				runInAction(() => {
					x.set(value1);
					y.set(value2);
					z.set(value3);
				});
			};
		}
	],

	[
		'mol_wire_lib',
		async ({ timeStart, timeEnd }, listener) => {
			const {
				default: { $mol_wire_atom: Atom }
			} = await import('mol_wire_lib');

			timeStart();

			const x = new Atom('x', (next: number = 0) => next);
			const y = new Atom('y', (next: number = 0) => next);
			const z = new Atom('z', (next: number = 0) => next);
			const a = new Atom('a', () => x.sync() + 1);
			const b = new Atom('b', () => x.sync() - y.sync() + hard());
			const c = new Atom('c', () => y.sync() + z.sync() - hard());
			const d = new Atom('d', () => z.sync() - 2);
			const e = new Atom('e', () => a.sync() + (a.sync() % 6 < 3 ? b.sync() : 0));
			const f = new Atom('f', () => ((y.sync() + hard()) % 7 < 3 ? a.sync() : d.sync()));
			const g = new Atom('g', () => d.sync() - (d.sync() % 6 < 3 ? c.sync() : 0));
			const h = new Atom('h', () => (e.sync() % 5 < g.sync() % 9 ? f.sync() : 0) + g.sync());

			listener(h.sync());

			timeEnd();

			return (value1, value2, value3) => {
				x.put(value1);
				y.put(value2);
				z.put(value3);

				// the batch doing the same https://github.com/hyoo-ru/mam_mol/blob/c9cf0faf966c8bb3d0e76339527ef03e03d273e8/wire/fiber/fiber.ts#L31
				listener(h.sync());
			};
		}
	],

	[
		'nanostores (static)',
		async ({ timeStart, timeEnd }, listener) => {
			const { atom, batched, computed } = await import('nanostores');

			timeStart();

			const x = atom(0);
			const y = atom(0);
			const z = atom(0);
			const a = computed(x, (x) => x + 1);
			const b = batched([x, y], (x, y) => x - y + hard());
			const c = batched([y, z], (y, z) => y + z - hard());
			const d = computed(z, (z) => z - 2);
			const e = batched([a, b], (a, b) => a + (a % 6 < 3 ? b : 0));
			const f = batched([y, a, d], (y, a, d) => ((y + hard()) % 7 < 3 ? a : d));
			const g = batched([c, d], (c, d) => d - (d % 6 < 3 ? c : 0));
			const h = batched([e, f, g], (e, f, g) => (e % 5 < g % 9 ? f : 0) + g);

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				x.set(value1);
				y.set(value2);
				z.set(value3);

				h.get();
			};
		}
	],

	[
		'oby',
		async ({ timeStart, timeEnd }, listener) => {
			const { effect, memo, observable, tick } = await import('oby');

			timeStart();

			const x = observable(0);
			const y = observable(0);
			const z = observable(0);
			const a = memo(() => x() + 1);
			const b = memo(() => x() - y() + hard());
			const c = memo(() => y() + z() - hard());
			const d = memo(() => z() - 2);
			const e = memo(() => a() + (a() % 6 < 3 ? b() : 0));
			const f = memo(() => ((y() + hard()) % 7 < 3 ? a() : d()));
			const g = memo(() => d() - (d() % 6 < 3 ? c() : 0));
			const h = memo(() => (e() % 5 < g() % 9 ? f() : 0) + g());

			effect(() => listener(h()));
			tick();

			timeEnd();

			return (value1, value2, value3) => {
				x(value1);
				y(value2);
				z(value3);
				tick();
			};
		}
	],

	[
		'preact-signals',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, effect, signal } = await import('@preact/signals-core');

			timeStart();

			const x = signal(0);
			const y = signal(0);
			const z = signal(0);
			const a = computed(() => x.value + 1);
			const b = computed(() => x.value - y.value + hard());
			const c = computed(() => y.value + z.value - hard());
			const d = computed(() => z.value - 2);
			const e = computed(() => a.value + (a.value % 6 < 3 ? b.value : 0));
			const f = computed(() => ((y.value + hard()) % 7 < 3 ? a.value : d.value));
			const g = computed(() => d.value - (d.value % 6 < 3 ? c.value : 0));
			const h = computed(() => (e.value % 5 < g.value % 9 ? f.value : 0) + g.value);

			effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					x.value = value1;
					y.value = value2;
					z.value = value3;
				});
			};
		}
	],

	[
		'reatom',
		async ({ timeStart, timeEnd }, listener) => {
			const { atom, batch, computed, effect } = await import('@reatom/core');

			timeStart();

			const x = atom(0);
			const y = atom(0);
			const z = atom(0);
			const a = computed(() => x() + 1);
			const b = computed(() => x() - y() + hard());
			const c = computed(() => y() + z() - hard());
			const d = computed(() => z() - 2);
			const e = computed(() => a() + (a() % 6 < 3 ? b() : 0));
			const f = computed(() => ((y() + hard()) % 7 < 3 ? a() : d()));
			const g = computed(() => d() - (d() % 6 < 3 ? c() : 0));
			const h = computed(() => (e() % 5 < g() % 9 ? f() : 0) + g());

			effect(() => listener(h()));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					x.set(value1);
					y.set(value2);
					z.set(value3);
				}, true);
			};
		}
	],

	[
		'rxjs (static)',
		async ({ timeStart, timeEnd }, listener) => {
			const { BehaviorSubject, combineLatest, distinctUntilChanged, map, shareReplay } =
				await import('rxjs');
			const memo = (
				dependencies: Array<import('rxjs').Observable<number>>,
				calculate: (...values: number[]) => number
			) =>
				combineLatest(dependencies).pipe(
					map((values) => calculate(...values)),
					distinctUntilChanged(),
					shareReplay({ bufferSize: 1, refCount: true })
				);
			const select = (state: import('rxjs').Observable<[number, number, number]>, index: number) =>
				state.pipe(
					map((values) => values[index]),
					distinctUntilChanged(),
					shareReplay({ bufferSize: 1, refCount: true })
				);

			timeStart();

			const state = new BehaviorSubject<[number, number, number]>([0, 0, 0]);
			const x = select(state, 0);
			const y = select(state, 1);
			const z = select(state, 2);
			const a = memo([x], (x) => x + 1);
			const b = memo([x, y], (x, y) => x - y + hard());
			const c = memo([y, z], (y, z) => y + z - hard());
			const d = memo([z], (z) => z - 2);
			const e = memo([a, b], (a, b) => a + (a % 6 < 3 ? b : 0));
			const f = memo([y, a, d], (y, a, d) => ((y + hard()) % 7 < 3 ? a : d));
			const g = memo([c, d], (c, d) => d - (d % 6 < 3 ? c : 0));
			const h = memo([e, f, g], (e, f, g) => (e % 5 < g % 9 ? f : 0) + g);

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				state.next([value1, value2, value3]);
			};
		}
	],

	[
		's-js',
		async ({ timeStart, timeEnd }, listener) => {
			const { default: S } = await import('s-js');

			timeStart();

			const [x, y, z] = S.root(() => {
				const x = S.data(0);
				const y = S.data(0);
				const z = S.data(0);
				const a = S(() => x() + 1);
				const b = S(() => x() - y() + hard());
				const c = S(() => y() + z() - hard());
				const d = S(() => z() - 2);
				const e = S(() => a() + (a() % 6 < 3 ? b() : 0));
				const f = S(() => ((y() + hard()) % 7 < 3 ? a() : d()));
				const g = S(() => d() - (d() % 6 < 3 ? c() : 0));
				const h = S(() => (e() % 5 < g() % 9 ? f() : 0) + g());

				S.on(h, () => listener(h()));

				return [x, y, z];
			});

			timeEnd();

			return (value1, value2, value3) => {
				S.freeze(() => {
					x(value1);
					y(value2);
					z(value3);
				});
			};
		}
	],

	[
		'signal-polyfill',
		async ({ timeStart, timeEnd }, listener) => {
			const { Signal } = await import('signal-polyfill');
			const watcher = new Signal.subtle.Watcher(noop);
			const flush = () => {
				for (const signal of watcher.getPending()) {
					signal.get();
				}
				watcher.watch();
			};

			timeStart();

			const x = new Signal.State(0);
			const y = new Signal.State(0);
			const z = new Signal.State(0);
			const a = new Signal.Computed(() => x.get() + 1);
			const b = new Signal.Computed(() => x.get() - y.get() + hard());
			const c = new Signal.Computed(() => y.get() + z.get() - hard());
			const d = new Signal.Computed(() => z.get() - 2);
			const e = new Signal.Computed(() => a.get() + (a.get() % 6 < 3 ? b.get() : 0));
			const f = new Signal.Computed(() => ((y.get() + hard()) % 7 < 3 ? a.get() : d.get()));
			const g = new Signal.Computed(() => d.get() - (d.get() % 6 < 3 ? c.get() : 0));
			const h = new Signal.Computed(() => (e.get() % 5 < g.get() % 9 ? f.get() : 0) + g.get());
			const observer = new Signal.Computed(() => listener(h.get()));

			watcher.watch(observer);
			observer.get();

			timeEnd();

			return (value1, value2, value3) => {
				x.set(value1);
				y.set(value2);
				z.set(value3);
				flush();
			};
		}
	],

	[
		'solid-js',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, createEffect, createMemo, createSignal } =
				await import('solid-js/dist/solid.cjs');

			timeStart();

			const [x, setX] = createSignal(0);
			const [y, setY] = createSignal(0);
			const [z, setZ] = createSignal(0);
			const a = createMemo(() => x() + 1);
			const b = createMemo(() => x() - y() + hard());
			const c = createMemo(() => y() + z() - hard());
			const d = createMemo(() => z() - 2);
			const e = createMemo(() => a() + (a() % 6 < 3 ? b() : 0));
			const f = createMemo(() => ((y() + hard()) % 7 < 3 ? a() : d()));
			const g = createMemo(() => d() - (d() % 6 < 3 ? c() : 0));
			const h = createMemo(() => (e() % 5 < g() % 9 ? f() : 0) + g());

			createEffect(() => listener(h()));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					setX(value1);
					setY(value2);
					setZ(value3);
				});
			};
		}
	],

	[
		'spred',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, writable } = await import('spred');

			timeStart();

			const x = writable(0);
			const y = writable(0);
			const z = writable(0);
			const a = computed(() => x.get() + 1);
			const b = computed(() => x.get() - y.get() + hard());
			const c = computed(() => y.get() + z.get() - hard());
			const d = computed(() => z.get() - 2);
			const e = computed(() => a.get() + (a.get() % 6 < 3 ? b.get() : 0));
			const f = computed(() => ((y.get() + hard()) % 7 < 3 ? a.get() : d.get()));
			const g = computed(() => d.get() - (d.get() % 6 < 3 ? c.get() : 0));
			const h = computed(() => (e.get() % 5 < g.get() % 9 ? f.get() : 0) + g.get());

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					x.set(value1);
					y.set(value2);
					z.set(value3);
				});
			};
		}
	],

	[
		'tldraw-state',
		async ({ timeStart, timeEnd }, listener) => {
			const { atom, computed, react, transact } = await import('@tldraw/state');

			timeStart();

			const x = atom('x', 0);
			const y = atom('y', 0);
			const z = atom('z', 0);
			const a = computed('a', () => x.get() + 1);
			const b = computed('b', () => x.get() - y.get() + hard());
			const c = computed('c', () => y.get() + z.get() - hard());
			const d = computed('d', () => z.get() - 2);
			const e = computed('e', () => a.get() + (a.get() % 6 < 3 ? b.get() : 0));
			const f = computed('f', () => ((y.get() + hard()) % 7 < 3 ? a.get() : d.get()));
			const g = computed('g', () => d.get() - (d.get() % 6 < 3 ? c.get() : 0));
			const h = computed('h', () => (e.get() % 5 < g.get() % 9 ? f.get() : 0) + g.get());

			react('listener', () => listener(h.get()));

			timeEnd();

			return (value1, value2, value3) => {
				transact(() => {
					x.set(value1);
					y.set(value2);
					z.set(value3);
				});
			};
		}
	],

	[
		'usignal',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, effect, signal } = await import('usignal');

			timeStart();

			const x = signal(0);
			const y = signal(0);
			const z = signal(0);
			const a = computed(() => x.value + 1);
			const b = computed(() => x.value - y.value + hard());
			const c = computed(() => y.value + z.value - hard());
			const d = computed(() => z.value - 2);
			const e = computed(() => a.value + (a.value % 6 < 3 ? b.value : 0));
			const f = computed(() => ((y.value + hard()) % 7 < 3 ? a.value : d.value));
			const g = computed(() => d.value - (d.value % 6 < 3 ? c.value : 0));
			const h = computed(() => (e.value % 5 < g.value % 9 ? f.value : 0) + g.value);

			effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					x.value = value1;
					y.value = value2;
					z.value = value3;
				});
			};
		}
	],

	[
		'vue-reactivity',
		async ({ timeStart, timeEnd }, listener) => {
			const { computed, effect, shallowRef } = await import('@vue/reactivity');

			timeStart();

			const x = shallowRef(0);
			const y = shallowRef(0);
			const z = shallowRef(0);
			const a = computed(() => x.value + 1);
			const b = computed(() => x.value - y.value + hard());
			const c = computed(() => y.value + z.value - hard());
			const d = computed(() => z.value - 2);
			const e = computed(() => a.value + (a.value % 6 < 3 ? b.value : 0));
			const f = computed(() => ((y.value + hard()) % 7 < 3 ? a.value : d.value));
			const g = computed(() => d.value - (d.value % 6 < 3 ? c.value : 0));
			const h = computed(() => (e.value % 5 < g.value % 9 ? f.value : 0) + g.value);

			const runner = effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				runner.effect.pause();

				try {
					x.value = value1;
					y.value = value2;
					z.value = value3;
				} finally {
					runner.effect.resume();
				}
			};
		}
	],

	[
		'webreflection-signal',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, effect, signal } = await import('@webreflection/signal');

			timeStart();

			const x = signal(0);
			const y = signal(0);
			const z = signal(0);
			const a = computed(() => x.value + 1);
			const b = computed(() => x.value - y.value + hard());
			const c = computed(() => y.value + z.value - hard());
			const d = computed(() => z.value - 2);
			const e = computed(() => a.value + (a.value % 6 < 3 ? b.value : 0));
			const f = computed(() => ((y.value + hard()) % 7 < 3 ? a.value : d.value));
			const g = computed(() => d.value - (d.value % 6 < 3 ? c.value : 0));
			const h = computed(() => (e.value % 5 < g.value % 9 ? f.value : 0) + g.value);

			effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					x.value = value1;
					y.value = value2;
					z.value = value3;
				});
			};
		}
	],

	[
		'whatsup',
		async ({ timeStart, timeEnd }, listener) => {
			const { autorun, computed, observable, runInAction } = await import('whatsup');

			timeStart();

			const x = observable(0);
			const y = observable(0);
			const z = observable(0);
			const a = computed(() => x() + 1);
			const b = computed(() => x() - y() + hard());
			const c = computed(() => y() + z() - hard());
			const d = computed(() => z() - 2);
			const e = computed(() => a() + (a() % 6 < 3 ? b() : 0));
			const f = computed(() => ((y() + hard()) % 7 < 3 ? a() : d()));
			const g = computed(() => d() - (d() % 6 < 3 ? c() : 0));
			const h = computed(() => (e() % 5 < g() % 9 ? f() : 0) + g());

			autorun(() => listener(h()));

			timeEnd();

			return (value1, value2, value3) => {
				runInAction(() => {
					x(value1);
					y(value2);
					z(value3);
				});
			};
		}
	]
];

(async () => {
	let value: number;

	const listener = (val: any) => {
		value = val;
	};

	const linkingBench = new Bench<number>({
		name: 'Linking',
		checkReturnedValues: (values) => {
			if (new Set(values.map((value) => value[1])).size !== 1) {
				console.log(values);
				throw 'Returned values is not equal';
			}
		}
	});

	for (let [name, setup] of setups) {
		linkingBench.add(name, async (params) => {
			await setup(params, listener);
			return value;
		});
	}

	await linkingBench.run({
		warmupTime: 500,
		iterations: 500
	});

	console.log(linkingBench.name, '(iterations=500)');
	console.table(linkingBench.table({ verbose: false }));

	await linkingBench.run({
		memoryUsage: true,
		iterations: 30
	});

	console.log(linkingBench.name, '(memoryUsage)');
	console.table(linkingBench.memoryUsageTable());

	// ====

	const updationBench = new Bench<number>({
		name: 'Updation',
		checkReturnedValues: (values) => {
			if (new Set(values.map((value) => value[1])).size !== 1) {
				console.log(values);
				throw 'Returned values is not equal';
			}
		}
	});

	for (let [name, setup] of setups) {
		let update = await setup(
			{
				iteration: -1,
				timeStart: noop,
				timeEnd: noop
			},
			listener
		);

		update(-1, -1, -1);

		updationBench.add(name, ({ iteration }) => {
			update(iteration % 100, (iteration + 1) % 100, (iteration + 2) % 100);
			return value;
		});
	}

	let iterations = [100, 1000, 5000];

	for (let i = 0; i < 3; i++) {
		await updationBench.run({
			warmupTime: i === 0 ? 3000 : 1000,
			iterations: iterations[i]
		});

		console.log(updationBench.name, `(iterations=${iterations[i]})`);
		console.table(updationBench.table({ verbose: false }));
	}

	await updationBench.run({
		memoryUsage: true,
		time: 5000
	});

	console.log(updationBench.name, '(memoryUsage)');
	console.table(updationBench.memoryUsageTable());
})();
