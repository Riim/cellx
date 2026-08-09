import { Bench, ITaskFnParams } from '@riim/bench';
import { hard } from './utils';

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

			const entry1 = act(0);
			const entry2 = act(0);
			const entry3 = act(0);
			const a = act(() => entry1() + 1);
			const b = act(() => entry1() - entry2() + hard());
			const c = act(() => entry2() + entry3() - hard());
			const d = act(() => entry3() - 1);
			const e = act(() => a() + (a() % 2 == 0 ? b() : 0));
			const f = act(() => ((entry2() + hard()) % 2 == 0 ? a() : d()));
			const g = act(() => d() - (d() % 2 == 0 ? c() : 0));
			const h = act(() => (e() % 2 == 0 ? f() : 0) + g());

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				entry1(value1);
				entry2(value2);
				entry3(value3);

				act.notify();
			};
		}
	],

	[
		'frp-ts',
		async ({ timeStart, timeEnd }, listener) => {
			const { action, combine, newAtom } = await import('@frp-ts/core');

			timeStart();

			const entry1 = newAtom(0);
			const entry2 = newAtom(0);
			const entry3 = newAtom(0);
			const a = combine(entry1, (entry1) => entry1 + 1);
			const b = combine(entry1, entry2, (entry1, entry2) => entry1 - entry2 + hard());
			const c = combine(entry2, entry3, (entry2, entry3) => entry2 + entry3 - hard());
			const d = combine(entry3, (entry3) => entry3 - 1);
			const e = combine(a, b, (a, b) => a + (a % 2 == 0 ? b : 0));
			const f = combine(entry2, a, d, (entry2, a, d) => ((entry2 + hard()) % 2 == 0 ? a : d));
			const g = combine(c, d, (c, d) => d - (d % 2 == 0 ? c : 0));
			const h = combine(e, f, g, (e, f, g) => (e % 2 == 0 ? f : 0) + g);

			h.subscribe({ next: () => listener(h.get()) });

			timeEnd();

			return (value1, value2, value3) => {
				action(() => {
					entry1.set(value1);
					entry2.set(value2);
					entry3.set(value3);
				});
			};
		}
	],

	[
		'preact-signals',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, effect, signal } = await import('@preact/signals-core');

			timeStart();

			const entry1 = signal(0);
			const entry2 = signal(0);
			const entry3 = signal(0);
			const a = computed(() => entry1.value + 1);
			const b = computed(() => entry1.value - entry2.value + hard());
			const c = computed(() => entry2.value + entry3.value - hard());
			const d = computed(() => entry3.value - 1);
			const e = computed(() => a.value + (a.value % 2 == 0 ? b.value : 0));
			const f = computed(() => ((entry2.value + hard()) % 2 == 0 ? a.value : d.value));
			const g = computed(() => d.value - (d.value % 2 == 0 ? c.value : 0));
			const h = computed(() => (e.value % 2 == 0 ? f.value : 0) + g.value);

			effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					entry1.value = value1;
					entry2.value = value2;
					entry3.value = value3;
				});
			};
		}
	],

	[
		'reatom',
		async ({ timeStart, timeEnd }, listener) => {
			const { atom, batch, createCtx } = await import('@reatom/core');

			timeStart();

			const entry1 = atom(0);
			const entry2 = atom(0);
			const entry3 = atom(0);
			const a = atom((ctx) => ctx.spy(entry1) + 1);
			const b = atom((ctx) => ctx.spy(entry1) - ctx.spy(entry2) + hard());
			const c = atom((ctx) => ctx.spy(entry2) + ctx.spy(entry3) - hard());
			const d = atom((ctx) => ctx.spy(entry3) - 1);
			const e = atom((ctx) => ctx.spy(a) + (ctx.spy(a) % 2 == 0 ? ctx.spy(b) : 0));
			const f = atom((ctx) => ((ctx.spy(entry2) + hard()) % 2 == 0 ? ctx.spy(a) : ctx.spy(d)));
			const g = atom((ctx) => ctx.spy(d) - (ctx.spy(d) % 2 == 0 ? ctx.spy(c) : 0));
			const h = atom((ctx) => (ctx.spy(e) % 2 == 0 ? ctx.spy(f) : 0) + ctx.spy(g));

			const ctx = createCtx();

			ctx.subscribe(h, listener);

			timeEnd();

			return (value1, value2, value3) => {
				batch(ctx, () => {
					entry1(ctx, value1);
					entry2(ctx, value2);
					entry3(ctx, value3);
				});
			};
		}
	],

	[
		'webreflection-signal',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, effect, signal } = await import('@webreflection/signal');

			timeStart();

			const entry1 = signal(0);
			const entry2 = signal(0);
			const entry3 = signal(0);
			const a = computed(() => entry1.value + 1);
			const b = computed(() => entry1.value - entry2.value + hard());
			const c = computed(() => entry2.value + entry3.value - hard());
			const d = computed(() => entry3.value - 1);
			const e = computed(() => a.value + (a.value % 2 == 0 ? b.value : 0));
			const f = computed(() => ((entry2.value + hard()) % 2 == 0 ? a.value : d.value));
			const g = computed(() => d.value - (d.value % 2 == 0 ? c.value : 0));
			const h = computed(() => (e.value % 2 == 0 ? f.value : 0) + g.value);

			effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					entry1.value = value1;
					entry2.value = value2;
					entry3.value = value3;
				});
			};
		}
	],

	[
		'alien-signals',
		async ({ timeStart, timeEnd }, listener) => {
			const { computed, effect, endBatch, signal, startBatch } = await import('alien-signals');

			timeStart();

			const entry1 = signal(0);
			const entry2 = signal(0);
			const entry3 = signal(0);
			const a = computed(() => entry1() + 1);
			const b = computed(() => entry1() - entry2() + hard());
			const c = computed(() => entry2() + entry3() - hard());
			const d = computed(() => entry3() - 1);
			const e = computed(() => a() + (a() % 2 == 0 ? b() : 0));
			const f = computed(() => ((entry2() + hard()) % 2 == 0 ? a() : d()));
			const g = computed(() => d() - (d() % 2 == 0 ? c() : 0));
			const h = computed(() => (e() % 2 == 0 ? f() : 0) + g());

			effect(() => {
				listener(h());
			});

			timeEnd();

			return (value1, value2, value3) => {
				startBatch();

				entry1(value1);
				entry2(value2);
				entry3(value3);

				endBatch();
			};
		}
	],

	[
		'cellx',
		async ({ timeStart, timeEnd }, listener) => {
			const { cellx, reaction, release } = await import('../dist/cellx');

			timeStart();

			const entry1 = cellx(0);
			const entry2 = cellx(0);
			const entry3 = cellx(0);
			const a = cellx(() => entry1.value + 1);
			const b = cellx(() => entry1.value - entry2.value + hard());
			const c = cellx(() => entry2.value + entry3.value - hard());
			const d = cellx(() => entry3.value - 1);
			const e = cellx(() => a.value + (a.value % 2 == 0 ? b.value : 0));
			const f = cellx(() => ((entry2.value + hard()) % 2 == 0 ? a.value : d.value));
			const g = cellx(() => d.value - (d.value % 2 == 0 ? c.value : 0));
			const h = cellx(() => (e.value % 2 == 0 ? f.value : 0) + g.value);

			reaction(h, listener);

			timeEnd();

			return (value1, value2, value3) => {
				entry1.value = value1;
				entry2.value = value2;
				entry3.value = value3;

				release();
			};
		}
	],

	[
		'effector',
		async ({ timeStart, timeEnd }, listener) => {
			const { combine, createEvent, createStore, launch } = await import('effector');

			timeStart();

			const entry1Event = createEvent<number>();
			const entry2Event = createEvent<number>();
			const entry3Event = createEvent<number>();
			const entry1 = createStore(0).on(entry1Event, (state, entry1) => entry1);
			const entry2 = createStore(0).on(entry2Event, (state, entry2) => entry2);
			const entry3 = createStore(0).on(entry3Event, (state, entry3) => entry3);
			const a = entry1.map((entry1) => entry1 + 1);
			const b = combine(entry1, entry2, (entry1, entry2) => entry1 - entry2 + hard());
			const c = combine(entry2, entry3, (entry2, entry3) => entry2 + entry3 - hard());
			const d = entry3.map((entry3) => entry3 - 1);
			const e = combine(a, b, (a, b) => a + (a % 2 == 0 ? b : 0));
			const f = combine(entry2, a, d, (entry2, a, d) => ((entry2 + hard()) % 2 == 0 ? a : d));
			const g = combine(c, d, (c, d) => d - (d % 2 == 0 ? c : 0));
			const h = combine(e, f, g, (e, f, g) => (e % 2 == 0 ? f : 0) + g);

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				launch({
					target: [entry1Event, entry2Event, entry3Event],
					params: [value1, value2, value3]
				});
			};
		}
	],

	[
		'mobx',
		async ({ timeStart, timeEnd }, listener) => {
			const { computed, observable, reaction, runInAction } = await import('mobx');

			timeStart();

			const entry1 = observable.box(0);
			const entry2 = observable.box(0);
			const entry3 = observable.box(0);
			const a = computed(() => entry1.get() + 1);
			const b = computed(() => entry1.get() - entry2.get() + hard());
			const c = computed(() => entry2.get() + entry3.get() - hard());
			const d = computed(() => entry3.get() - 1);
			const e = computed(() => a.get() + (a.get() % 2 == 0 ? b.get() : 0));
			const f = computed(() => ((entry2.get() + hard()) % 2 == 0 ? a.get() : d.get()));
			const g = computed(() => d.get() - (d.get() % 2 == 0 ? c.get() : 0));
			const h = computed(() => (e.get() % 2 == 0 ? f.get() : 0) + g.get());

			reaction(() => h.get(), listener);

			timeEnd();

			return (value1, value2, value3) => {
				runInAction(() => {
					entry1.set(value1);
					entry2.set(value2);
					entry3.set(value3);
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

			const entry1 = new Atom('entry1', (next: number = 0) => next);
			const entry2 = new Atom('entry2', (next: number = 0) => next);
			const entry3 = new Atom('entry3', (next: number = 0) => next);
			const a = new Atom('a', () => entry1.sync() + 1);
			const b = new Atom('b', () => entry1.sync() - entry2.sync() + hard());
			const c = new Atom('c', () => entry2.sync() + entry3.sync() - hard());
			const d = new Atom('d', () => entry3.sync() - 1);
			const e = new Atom('e', () => a.sync() + (a.sync() % 2 == 0 ? b.sync() : 0));
			const f = new Atom('f', () => ((entry2.sync() + hard()) % 2 == 0 ? a.sync() : d.sync()));
			const g = new Atom('g', () => d.sync() - (d.sync() % 2 == 0 ? c.sync() : 0));
			const h = new Atom('h', () => (e.sync() % 2 == 0 ? f.sync() : 0) + g.sync());

			listener(h.sync());

			timeEnd();

			return (value1, value2, value3) => {
				entry1.put(value1);
				entry2.put(value2);
				entry3.put(value3);

				// the batch doing the same https://github.com/hyoo-ru/mam_mol/blob/c9cf0faf966c8bb3d0e76339527ef03e03d273e8/wire/fiber/fiber.ts#L31
				listener(h.sync());
			};
		}
	],

	[
		'nanostores',
		async ({ timeStart, timeEnd }, listener) => {
			const { atom, batched, computed } = await import('nanostores');

			timeStart();

			const entry1 = atom(0);
			const entry2 = atom(0);
			const entry3 = atom(0);
			const a = computed(entry1, (entry1) => entry1 + 1);
			const b = batched([entry1, entry2], (entry1, entry2) => entry1 - entry2 + hard());
			const c = batched([entry2, entry3], (entry2, entry3) => entry2 + entry3 - hard());
			const d = computed(entry3, (entry3) => entry3 - 1);
			const e = batched([a, b], (a, b) => a + (a % 2 == 0 ? b : 0));
			const f = batched([entry2, a, d], (entry2, a, d) => ((entry2 + hard()) % 2 == 0 ? a : d));
			const g = batched([c, d], (c, d) => d - (d % 2 == 0 ? c : 0));
			const h = batched([e, f, g], (e, f, g) => (e % 2 == 0 ? f : 0) + g);

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				entry1.set(value1);
				entry2.set(value2);
				entry3.set(value3);

				h.get();
			};
		}
	],

	[
		's-js',
		async ({ timeStart, timeEnd }, listener) => {
			const { default: S } = await import('s-js');

			timeStart();

			const [entry1, entry2, entry3] = S.root(() => {
				const entry1 = S.data(0);
				const entry2 = S.data(0);
				const entry3 = S.data(0);
				const a = S(() => entry1() + 1);
				const b = S(() => entry1() - entry2() + hard());
				const c = S(() => entry2() + entry3() - hard());
				const d = S(() => entry3() - 1);
				const e = S(() => a() + (a() % 2 == 0 ? b() : 0));
				const f = S(() => ((entry2() + hard()) % 2 == 0 ? a() : d()));
				const g = S(() => d() - (d() % 2 == 0 ? c() : 0));
				const h = S(() => (e() % 2 == 0 ? f() : 0) + g());

				S.on(h, () => listener(h()));

				return [entry1, entry2, entry3];
			});

			timeEnd();

			return (value1, value2, value3) => {
				S.freeze(() => {
					entry1(value1);
					entry2(value2);
					entry3(value3);
				});
			};
		}
	],

	[
		'solid-js',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, createEffect, createMemo, createSignal } =
				await import('solid-js/dist/solid.cjs');

			timeStart();

			const [entry1, setEntry1] = createSignal(0);
			const [entry2, setEntry2] = createSignal(0);
			const [entry3, setEntry3] = createSignal(0);
			const a = createMemo(() => entry1() + 1);
			const b = createMemo(() => entry1() - entry2() + hard());
			const c = createMemo(() => entry2() + entry3() - hard());
			const d = createMemo(() => entry3() - 1);
			const e = createMemo(() => a() + (a() % 2 == 0 ? b() : 0));
			const f = createMemo(() => ((entry2() + hard()) % 2 == 0 ? a() : d()));
			const g = createMemo(() => d() - (d() % 2 == 0 ? c() : 0));
			const h = createMemo(() => (e() % 2 == 0 ? f() : 0) + g());

			createEffect(() => listener(h()));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					setEntry1(value1);
					setEntry2(value2);
					setEntry3(value3);
				});
			};
		}
	],

	[
		'spred',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, writable } = await import('spred');

			timeStart();

			const entry1 = writable(0);
			const entry2 = writable(0);
			const entry3 = writable(0);
			const a = computed(() => entry1.get() + 1);
			const b = computed(() => entry1.get() - entry2.get() + hard());
			const c = computed(() => entry2.get() + entry3.get() - hard());
			const d = computed(() => entry3.get() - 1);
			const e = computed(() => a.get() + (a.get() % 2 == 0 ? b.get() : 0));
			const f = computed(() => ((entry2.get() + hard()) % 2 == 0 ? a.get() : d.get()));
			const g = computed(() => d.get() - (d.get() % 2 == 0 ? c.get() : 0));
			const h = computed(() => (e.get() % 2 == 0 ? f.get() : 0) + g.get());

			h.subscribe(listener);

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					entry1.set(value1);
					entry2.set(value2);
					entry3.set(value3);
				});
			};
		}
	],

	[
		'usignal',
		async ({ timeStart, timeEnd }, listener) => {
			const { batch, computed, effect, signal } = await import('usignal');

			timeStart();

			const entry1 = signal(0);
			const entry2 = signal(0);
			const entry3 = signal(0);
			const a = computed(() => entry1.value + 1);
			const b = computed(() => entry1.value - entry2.value + hard());
			const c = computed(() => entry2.value + entry3.value - hard());
			const d = computed(() => entry3.value - 1);
			const e = computed(() => a.value + (a.value % 2 == 0 ? b.value : 0));
			const f = computed(() => ((entry2.value + hard()) % 2 == 0 ? a.value : d.value));
			const g = computed(() => d.value - (d.value % 2 == 0 ? c.value : 0));
			const h = computed(() => (e.value % 2 == 0 ? f.value : 0) + g.value);

			effect(() => listener(h.value));

			timeEnd();

			return (value1, value2, value3) => {
				batch(() => {
					entry1.value = value1;
					entry2.value = value2;
					entry3.value = value3;
				});
			};
		}
	],

	[
		'whatsup',
		async ({ timeStart, timeEnd }, listener) => {
			const { autorun, computed, observable, runInAction } = await import('whatsup');

			timeStart();

			const entry1 = observable(0);
			const entry2 = observable(0);
			const entry3 = observable(0);
			const a = computed(() => entry1() + 1);
			const b = computed(() => entry1() - entry2() + hard());
			const c = computed(() => entry2() + entry3() - hard());
			const d = computed(() => entry3() - 1);
			const e = computed(() => a() + (a() % 2 == 0 ? b() : 0));
			const f = computed(() => ((entry2() + hard()) % 2 == 0 ? a() : d()));
			const g = computed(() => d() - (d() % 2 == 0 ? c() : 0));
			const h = computed(() => (e() % 2 == 0 ? f() : 0) + g());

			autorun(() => listener(h()));

			timeEnd();

			return (value1, value2, value3) => {
				runInAction(() => {
					entry1(value1);
					entry2(value2);
					entry3(value3);
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
			if (new Set(values.map((value) => value[1])).size != 1) {
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
		iterations: 100
	});

	console.log(linkingBench.name, '(memoryUsage)');
	console.table(linkingBench.memoryUsageTable());

	// ====

	const updationBench = new Bench<number>({
		name: 'Updation',
		checkReturnedValues: (values) => {
			if (new Set(values.map((value) => value[1])).size != 1) {
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
			warmupTime: i == 0 ? 500 : undefined,
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
