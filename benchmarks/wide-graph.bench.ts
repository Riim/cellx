import { strict as assert } from 'node:assert';
import { Bench } from '@riim/bench';

const noop = () => {};

const width = Number(process.argv[2] ?? 100);
const selectionSize = Math.floor(width * 0.75);
let seed = 42;
const selections = [0, 1].map(() => {
	const indices = Array.from({ length: width }, (_, i) => i);

	for (let i = indices.length - 1; i > 0; i--) {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		let j = Math.floor((seed / 0x100000000) * (i + 1));
		[indices[i], indices[j]] = [indices[j], indices[i]];
	}

	return indices.slice(0, selectionSize);
});

type TGraph = {
	toggle: () => void;
	read: () => number;
	cleanup: () => void;
};
type TSetup = (listener: (value: number) => void) => Promise<TGraph>;

function setupGraph<Node, Source extends Node>(
	api: {
		source: (value: number) => Source;
		computed: (pull: () => number, dependencies: Node[]) => Node;
		read: (node: Node) => number;
		write: (node: Source, value: number) => void;
		observe: (node: Node, listener: (value: number) => void) => (() => void) | void;
		batch: (update: () => void) => void;
	},
	listener: (value: number) => void
): TGraph {
	let sources = Array.from({ length: width }, () => api.source(1));
	let selector = api.source(0);
	let cleanups: Array<() => void> = [];
	let observe = (node: Node, callback: (value: number) => void) => {
		let cleanup = api.observe(node, callback);

		if (cleanup) {
			cleanups.push(cleanup);
		}
	};

	// Подключаем к каждому источнику width наблюдаемых вычисляемых ячеек до переключаемой ячейки.
	for (let source of sources) {
		for (let i = 0; i < width; i++) {
			observe(
				api.computed(() => api.read(source), [source]),
				noop
			);
		}
	}

	let moving = api.computed(() => {
		let phase = api.read(selector);
		let sum = phase;

		for (let index of selections[phase]) {
			sum += api.read(sources[index]);
		}

		return sum;
	}, [selector, ...sources]);

	observe(moving, listener);

	let selected = 0;

	return {
		toggle: () => api.batch(() => api.write(selector, (selected ^= 1))),
		read: () => api.read(moving),
		cleanup: () => {
			for (let cleanup of cleanups.reverse()) {
				cleanup();
			}
		}
	};
}

// Аргумент зависимостей используют только библиотеки со статическим графом.
// combine в frp-ts не удаляет невыбранные источники, как и effector с nanostores.
// Их результаты измеряют переключение значения, а не динамическое удаление связей.
const setups: Array<[string, TSetup]> = [
	[
		'act',
		async (listener) => {
			let { act } = await import('@artalar/act');

			return setupGraph(
				{
					source: (value) => act(value),
					computed: (pull) => act(pull),
					read: (node) => node(),
					write: (node, value) => {
						node(value);
					},
					observe: (node, callback) => node.subscribe(callback),
					batch: (update) => {
						update();
						act.notify();
					}
				},
				listener
			);
		}
	],

	[
		'alien-signals',
		async (listener) => {
			let { computed, effect, endBatch, signal, startBatch } = await import('alien-signals');

			return setupGraph(
				{
					source: (value) => signal(value),
					computed: (pull) => computed(pull),
					read: (node) => node(),
					write: (node, value) => {
						node(value);
					},
					observe: (node, callback) => effect(() => callback(node())),
					batch: (update) => {
						startBatch();
						update();
						endBatch();
					}
				},
				listener
			);
		}
	],

	[
		'baconjs (static)',
		async (listener) => {
			let { Bus, combineAsArray } = await import('baconjs');

			type BaconNode = {
				value: number;
				property: import('baconjs').Property<number>;
			};
			type BaconSource = BaconNode & { bus: import('baconjs').Bus<number> };

			return setupGraph<BaconNode, BaconSource>(
				{
					source: (value) => {
						let bus = new Bus<number>();
						return { value, property: bus.toProperty(value), bus };
					},
					computed: (pull, dependencies) => {
						let node = {} as BaconNode;

						node.value = pull();
						node.property = combineAsArray(dependencies.map((dependency) => dependency.property))
							.map(() => (node.value = pull()))
							.skipDuplicates();

						return node;
					},
					read: (node) => node.value,
					write: (node, value) => {
						node.value = value;
						node.bus.push(value);
					},
					observe: (node, callback) => node.property.onValue(callback),
					batch: (update) => update()
				},
				listener
			);
		}
	],

	[
		'cellx',
		async (listener) => {
			let { cellx, effect, release } = await import('cellx');

			return setupGraph(
				{
					source: (value) => cellx(value),
					computed: (pull) => cellx(pull),
					read: (node) => node.value,
					write: (node, value) => {
						node.value = value;
					},
					observe: (node, callback) => effect(() => callback(node.value)),
					batch: (update) => {
						update();
						release();
					}
				},
				listener
			);
		}
	],

	[
		'effector (static)',
		async (listener) => {
			let { combine, createEvent, createStore, clearNode, launch } = await import('effector');
			let nodes: Parameters<typeof clearNode>[0][] = [];
			let setters = new Map<
				ReturnType<typeof createStore<number>>,
				ReturnType<typeof createEvent<number>>
			>();
			let graph = setupGraph<
				import('effector').Store<number>,
				ReturnType<typeof createStore<number>>
			>(
				{
					source: (value) => {
						let set = createEvent<number>();
						let node = createStore(value).on(set, (_, next) => next);

						setters.set(node, set);
						nodes.push(set, node);

						return node;
					},
					computed: (pull, deps) => {
						let node = combine(deps, pull);
						nodes.push(node);
						return node;
					},
					read: (node) => node.getState(),
					write: (node, value) => launch({ target: [setters.get(node)!], params: [value] }),
					observe: (node, callback) => node.watch(callback),
					batch: (update) => update()
				},
				listener
			);

			return {
				...graph,
				cleanup: () => {
					graph.cleanup();

					for (let node of nodes.reverse()) {
						clearNode(node);
					}
				}
			};
		}
	],

	[
		'flyd (static)',
		async (listener) => {
			let { default: flyd } = await import('flyd');
			type FlydNode = flyd.Stream<number>;

			return setupGraph<FlydNode, FlydNode>(
				{
					source: (value) => flyd.stream(value),
					computed: (pull, dependencies) => (flyd.combine as any)(() => pull(), dependencies),
					read: (node) => node(),
					write: (node, value) => {
						node(value);
					},
					observe: (node, callback) => {
						let observer = flyd.on(callback, node);
						return () => observer.end(true);
					},
					batch: (update) => update()
				},
				listener
			);
		}
	],

	[
		'frp-ts (static)',
		async (listener) => {
			let { action, combine, newAtom } = await import('@frp-ts/core');

			return setupGraph<
				import('@frp-ts/core').Property<number>,
				ReturnType<typeof newAtom<number>>
			>(
				{
					source: (value) => newAtom(value),
					computed: (pull, deps) => combine(...deps, pull),
					read: (node) => node.get(),
					write: (node, value) => node.set(value),
					observe: (node, callback) => {
						let subscription = node.subscribe({ next: () => callback(node.get()) });
						return () => subscription.unsubscribe();
					},
					batch: action
				},
				listener
			);
		}
	],

	[
		'maverick-signals',
		async (listener) => {
			let { computed, effect, signal, tick } = await import('@maverick-js/signals');

			return setupGraph(
				{
					source: (value) => signal(value),
					computed: (pull) => computed(pull),
					read: (node) => node(),
					write: (node, value) => {
						node.set(value);
					},
					observe: (node, callback) => effect(() => callback(node())),
					batch: (update) => {
						update();
						tick();
					}
				},
				listener
			);
		}
	],

	[
		'mobx',
		async (listener) => {
			let { computed, observable, reaction, runInAction } = await import('mobx');

			return setupGraph(
				{
					source: (value) => observable.box(value),
					computed: (pull) => computed(pull),
					read: (node) => node.get(),
					write: (node, value) => node.set(value),
					observe: (node, callback) => reaction(() => node.get(), callback),
					batch: runInAction
				},
				listener
			);
		}
	],

	[
		'mol_wire_lib',
		async (listener) => {
			let {
				default: { $mol_wire_atom: Atom }
			} = await import('mol_wire_lib');
			let nodes: InstanceType<typeof Atom>[] = [];
			let atom = (pull: () => number) => {
				let node = new Atom('wide', pull);
				nodes.push(node);
				return node;
			};
			let movingObserver: InstanceType<typeof Atom>;
			let graph = setupGraph(
				{
					source: (value) => atom(() => value),
					computed: atom,
					read: (node) => node.sync(),
					write: (node, value) => {
						node.put(value);
					},
					observe: (node, callback) => {
						let observer = atom(() => {
							let value = node.sync();
							callback(value);
							return value;
						});

						observer.sync();
						movingObserver = observer;
					},
					// Как в main.bench.ts, запрашиваем результат синхронно, не дожидаясь планировщика кадров.
					batch: (update) => {
						update();
						movingObserver.sync();
					}
				},
				listener
			);

			return {
				...graph,
				cleanup: () => {
					for (let node of nodes.reverse()) {
						node.destructor();
					}
				}
			};
		}
	],

	[
		'nanostores (static)',
		async (listener) => {
			let { atom, batched, computed } = await import('nanostores');
			let moving: import('nanostores').ReadableAtom<number>;

			return setupGraph<import('nanostores').ReadableAtom<number>, ReturnType<typeof atom<number>>>(
				{
					source: (value) => atom(value),
					computed: (pull, deps) =>
						deps.length === 1 ? computed(deps[0], pull) : batched(deps, pull),
					read: (node) => node.get(),
					write: (node, value) => node.set(value),
					observe: (node, callback) => {
						moving = node;
						return node.subscribe(callback);
					},
					batch: (update) => {
						update();
						moving.get();
					}
				},
				listener
			);
		}
	],

	[
		'oby',
		async (listener) => {
			let { effect, memo, observable, tick } = await import('oby');
			let graph = setupGraph(
				{
					source: (value) => observable(value),
					computed: (pull) => memo(pull),
					read: (node) => node(),
					write: (node, value) => {
						node(value);
					},
					observe: (node, callback) => effect(() => callback(node())),
					batch: (update) => {
						update();
						tick();
					}
				},
				listener
			);

			tick();

			return graph;
		}
	],

	[
		'preact-signals',
		async (listener) => {
			let { batch, computed, effect, signal } = await import('@preact/signals-core');

			return setupGraph(
				{
					source: (value) => signal(value),
					computed: (pull) => computed(pull),
					read: (node) => node.value,
					write: (node, value) => {
						node.value = value;
					},
					observe: (node, callback) => effect(() => callback(node.value)),
					batch
				},
				listener
			);
		}
	],

	[
		'reatom',
		async (listener) => {
			let { atom, batch, computed, effect } = await import('@reatom/core');

			return setupGraph(
				{
					source: (value) => atom(value),
					computed: (pull) => computed(pull),
					read: (node) => node(),
					write: (node, value) => {
						node.set(value);
					},
					observe: (node, callback) => {
						let observer = effect(() => callback(node()));
						return () => observer.unsubscribe();
					},
					batch: (update) => batch(update, true)
				},
				listener
			);
		}
	],

	[
		'rxjs (static)',
		async (listener) => {
			let { BehaviorSubject, combineLatest, distinctUntilChanged, map, shareReplay } =
				await import('rxjs');

			type RxNode = {
				value: number;
				observable: import('rxjs').Observable<number>;
			};
			type RxSource = RxNode & { subject: import('rxjs').BehaviorSubject<number> };

			return setupGraph<RxNode, RxSource>(
				{
					source: (value) => {
						let subject = new BehaviorSubject(value);
						return { value, observable: subject, subject };
					},
					computed: (pull, dependencies) => {
						let node = {} as RxNode;

						node.value = pull();
						node.observable = combineLatest(
							dependencies.map((dependency) => dependency.observable)
						).pipe(
							map(() => (node.value = pull())),
							distinctUntilChanged(),
							shareReplay({ bufferSize: 1, refCount: true })
						);

						return node;
					},
					read: (node) => node.value,
					write: (node, value) => {
						node.value = value;
						node.subject.next(value);
					},
					observe: (node, callback) => {
						let subscription = node.observable.subscribe(callback);
						return () => subscription.unsubscribe();
					},
					batch: (update) => update()
				},
				listener
			);
		}
	],

	[
		's-js',
		async (listener) => {
			let { default: S } = await import('s-js');

			return S.root((dispose) => {
				let graph = setupGraph(
					{
						source: (value) => S.data(value),
						computed: (pull) => S(pull),
						read: (node) => node(),
						write: (node, value) => {
							node(value);
						},
						observe: (node, callback) => {
							S(() => callback(node()));
						},
						batch: S.freeze
					},
					listener
				);

				return { ...graph, cleanup: dispose };
			});
		}
	],

	[
		'signal-polyfill',
		async (listener) => {
			let { Signal } = await import('signal-polyfill');

			type SignalNode = Signal.State<number> | Signal.Computed<number>;

			let watcher = new Signal.subtle.Watcher(noop);
			let graph = setupGraph<SignalNode, Signal.State<number>>(
				{
					source: (value) => new Signal.State(value),
					computed: (pull) => new Signal.Computed(pull),
					read: (node) => node.get(),
					write: (node, value) => {
						node.set(value);
					},
					observe: (node, callback) => {
						let observer = new Signal.Computed(() => callback(node.get()));

						watcher.watch(observer);
						observer.get();

						return () => watcher.unwatch(observer);
					},
					batch: (update) => {
						update();

						for (let signal of watcher.getPending()) {
							signal.get();
						}

						watcher.watch();
					}
				},
				listener
			);

			return graph;
		}
	],

	[
		'solid-js',
		async (listener) => {
			let { batch, createEffect, createMemo, createRoot, createSignal } =
				await import('solid-js/dist/solid.cjs');

			return createRoot((dispose) => {
				let graph = setupGraph(
					{
						source: (value) => {
							let [get, set] = createSignal(value);
							return { get, set };
						},
						computed: (pull) => ({ get: createMemo(pull) }),
						read: (node) => node.get(),
						write: (node, value) => node.set(value),
						observe: (node, callback) => {
							createEffect(() => callback(node.get()));
						},
						batch
					},
					listener
				);

				return { ...graph, cleanup: dispose };
			});
		}
	],

	[
		'tldraw-state',
		async (listener) => {
			let { atom, computed, react, transact } = await import('@tldraw/state');
			let id = 0;

			return setupGraph(
				{
					source: (value) => atom(`source-${id++}`, value),
					computed: (pull) => computed(`computed-${id++}`, pull),
					read: (node) => node.get(),
					write: (node, value) => {
						node.set(value);
					},
					observe: (node, callback) => react(`effect-${id++}`, () => callback(node.get())),
					batch: transact
				},
				listener
			);
		}
	],

	[
		'usignal',
		async (listener) => {
			let { batch, computed, effect, signal } = await import('usignal');

			return setupGraph<{ readonly value: number }, ReturnType<typeof signal<number>>>(
				{
					source: (value) => signal(value),
					computed: (pull) => computed<number, unknown>(pull),
					read: (node) => node.value,
					write: (node, value) => {
						node.value = value;
					},
					observe: (node, callback) => effect(() => callback(node.value)),
					batch
				},
				listener
			);
		}
	],

	[
		'vue-reactivity',
		async (listener) => {
			let { computed, effect, shallowRef, stop } = await import('@vue/reactivity');
			let moving: ReturnType<typeof effect>;

			return setupGraph<{ readonly value: number }, import('@vue/reactivity').ShallowRef<number>>(
				{
					source: (value) => shallowRef(value),
					computed: (pull) => computed(pull),
					read: (node) => node.value,
					write: (node, value) => {
						node.value = value;
					},
					observe: (node, callback) => {
						let runner = (moving = effect(() => callback(node.value)));
						return () => stop(runner);
					},
					batch: (update) => {
						moving.effect.pause();
						try {
							update();
						} finally {
							moving.effect.resume();
						}
					}
				},
				listener
			);
		}
	],

	[
		'webreflection-signal',
		async (listener) => {
			let { batch, computed, effect, signal } = await import('@webreflection/signal');

			return setupGraph(
				{
					source: (value) => signal(value),
					computed: (pull) => computed(pull),
					read: (node) => node.value,
					write: (node, value) => {
						node.value = value;
					},
					observe: (node, callback) => effect(() => callback(node.value)),
					batch
				},
				listener
			);
		}
	]
];

(async () => {
	let bench = new Bench<number>({
		name: 'Updation',
		checkReturnedValues: (values) => {
			assert.equal(
				new Set(values.map((value) => value[1])).size,
				1,
				'Returned values are not equal'
			);
		}
	});
	let cleanups: Array<() => void> = [];

	try {
		for (let [name, setup] of setups) {
			let changes = 0;
			let value = selectionSize;
			let graph = await setup((next) => {
				changes++;
				value = next;
			});

			cleanups.push(graph.cleanup);
			assert.equal(graph.read(), selectionSize, `${name}: initial value`);

			// Проверяем оба направления до замеров: правила начального уведомления различаются.
			for (let expected of [selectionSize + 1, selectionSize]) {
				changes = 0;
				graph.toggle();
				assert.equal(changes, 1, `${name}: toggle events`);
				assert.equal(value, expected, `${name}: observed value`);
				assert.equal(graph.read(), expected, `${name}: computed value`);
			}

			bench.add(name, ({ timeStart, timeEnd }) => {
				let expected = value === selectionSize ? selectionSize + 1 : selectionSize;

				changes = 0;
				timeStart();
				graph.toggle();
				timeEnd();
				assert.equal(changes, 1, `${name}: toggle events`);
				assert.equal(value, expected, `${name}: observed value`);
				assert.equal(graph.read(), expected, `${name}: computed value`);

				return value;
			});
		}

		for (let iterations of [100, 1000, 5000]) {
			await bench.run({ warmupTime: iterations === 100 ? 500 : undefined, iterations });
			console.log(bench.name, `(iterations=${iterations})`);
			console.table(bench.table({ verbose: false }));
		}
	} finally {
		for (let cleanup of cleanups.reverse()) {
			cleanup();
		}
	}
})();
