import { describe, expect, test } from '@jest/globals';
import { Flags } from '../src/Cell';
import { Cell, WaitError, cellx, effect, release } from '../src/cellx';

function expectDependencyOrder(cell: Cell, expected: Array<Cell>) {
	let dependencies: Cell[] = [];

	for (let link = cell._nextDependency; link; link = link._nextDependency) {
		dependencies.push(link.dependency);
	}

	expect(dependencies).toEqual(expected);
}

afterEach(() => {
	release();
});

describe('Cell', () => {
	describe('read/write', () => {
		test('чтение ячейки (Cell#get())', () => {
			let a$ = cellx(1);
			expect(a$.get()).toBe(1);
		});

		test('чтение ячейки (Cell#value)', () => {
			let a$ = cellx(1);
			expect(a$.value).toBe(1);
		});

		test('чтение вычисляемой ячейки', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);

			expect(b$.value).toBe(2);
		});

		test('запись в ячейку (Cell#set())', () => {
			let a$ = cellx(1);
			a$.value = 2;
			expect(a$.value).toBe(2);
		});

		test('запись в ячейку (Cell#value)', () => {
			let a$ = cellx(1);
			a$.value = 2;
			expect(a$.value).toBe(2);
		});

		test('запись в ячейку и чтение вычисляемой ячейки', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);

			a$.value = 2;

			expect(b$.value).toBe(3);
		});

		test('#pull()', () => {
			let counter = 0;
			let a$ = cellx(() => ++counter);
			let onChange = jest.fn();
			let b$ = cellx(() => a$.value + 1, { onChange });

			a$.pull();
			release();

			expect(onChange.mock.calls.length).toBe(1);
			expect(b$.value).toBe(3);
		});
	});

	describe('events', () => {
		test('событие change', () => {
			let onChange = jest.fn();
			let a$ = cellx(1, { onChange });

			a$.value = 2;
			release();

			expect(onChange.mock.calls).toEqual([[2]]);
		});

		test('событие change вычисляемой ячейки', () => {
			let a$ = cellx(1);
			let onChange = jest.fn();

			cellx(() => a$.value + 1, { onChange });

			a$.value = 2;
			release();

			expect(onChange.mock.calls).toEqual([[3]]);
		});

		test('нет события change при установке значения равного текущему', () => {
			let onChange = jest.fn();
			let a$ = cellx(1, { onChange });

			a$.value = 1;
			release();

			expect(onChange.mock.calls.length).toBe(0);
		});

		test('нет события change при добавлении обработчика после изменения', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value);

			a$.value = 2;

			let onChange = jest.fn();

			b$.onChange(onChange);
			release();

			expect(onChange.mock.calls.length).toBe(0);
		});

		test('нет события change при добавлении обработчика после изменения (2)', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value);

			let onChange = jest.fn();

			b$.onChange(onChange)();

			a$.value = 2;
			b$.onChange(onChange);
			release();

			expect(b$.value).toBe(2);
			expect(onChange.mock.calls.length).toBe(0);
		});
	});

	describe('behavior', () => {
		test('одно вычисление при изменении нескольких зависимостей', () => {
			let a$ = cellx(1);
			let b$ = cellx(2);
			let pullC$ = jest.fn(() => a$.value + b$.value);

			cellx(pullC$, { onChange() {} });

			pullC$.mockClear();

			a$.value = 2;
			b$.value = 3;
			release();

			expect(pullC$.mock.calls.length).toBe(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (2)', () => {
			let a$ = cellx(1);
			let b$ = cellx(2);
			let c$ = cellx(() => b$.value + 1);
			let pullD$ = jest.fn(() => a$.value + c$.value);

			cellx(pullD$, { onChange() {} });

			pullD$.mockClear();

			a$.value = 2;
			b$.value = 3;
			release();

			expect(pullD$.mock.calls.length).toBe(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (3)', () => {
			let a$ = cellx(1);
			let b$ = cellx(2);
			let a2$ = cellx(() => a$.value + 1);
			let b2$ = cellx(() => b$.value + 1);
			let pullC$ = jest.fn(() => a2$.value + b2$.value);
			let c$ = cellx(pullC$, { onChange() {} });

			c$;

			pullC$.mockClear();

			a$.value = 2;
			b$.value = 3;
			release();

			expect(pullC$.mock.calls.length).toBe(1);
		});

		test('подключаемая, неактивная ячейка получает state == clean', () => {
			let a$ = cellx(true);
			let b$ = cellx(() => 1);
			let c$ = cellx(() => b$.value);
			let d$ = cellx(() => (a$.value ? 1 : c$.value));

			d$.onChange(() => {});
			a$.value = false;
			release();

			expect(c$._flags & (Flags.PENDING | Flags.DIRTY)).toBe(0);
		});

		test('вычисляемая ячейка лишаясь всех зависимостей получает state == clean', () => {
			let a$ = cellx(1);

			let t = 0;
			let b$ = cellx(
				() => {
					if (t++) {
						throw 1;
					}

					return a$.value + 1;
				},
				{ onChange: () => {} }
			);

			a$.value = 2;

			try {
				release();
			} catch {}

			expect(t).toBe(2);
			expect(b$._flags & (Flags.PENDING | Flags.DIRTY)).toBe(0);
			expect(b$.value).toBe(2);
		});

		test('запись в родительскую ячейку в compute', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);
			let c$ = cellx(
				() => {
					if (b$.value === 3) {
						a$.value = 10;
					}

					return b$.value + 1;
				},
				{ onChange: () => {} }
			);

			a$.value = 2;

			expect(c$.value).toBe(12);
		});

		test('запись в родительскую ячейку в pull при отсутствии обработчиков', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);
			let c$ = cellx(() => {
				if (b$.value === 3) {
					a$.value = 10;
				}

				return b$.value + 1;
			});

			a$.value = 2;

			expect(c$.value).toBe(12);
		});

		test('pull при чтении error', () => {
			let a$ = cellx(0);
			let b$ = cellx(() => {
				if (a$.value === 1) {
					throw 1;
				}

				return a$.value + 1;
			});
			let c$ = cellx(() => b$.value + 1, { onChange: () => {} });

			a$.value = 1;
			release();

			expect(c$.error).toMatchObject({ message: '1' });
		});

		test('pull при чтении error (пассивный режим)', () => {
			let a$ = cellx(0);
			let b$ = cellx(() => {
				if (a$.value === 1) {
					throw 1;
				}

				return a$.value + 1;
			});
			let c$ = cellx(() => b$.value + 1);

			a$.value = 1;

			expect(c$.error).toMatchObject({ message: '1' });
		});

		test('событие error', () => {
			let d$OnError = jest.fn();
			let a$ = cellx(0);
			let b$ = cellx(() => {
				if (a$.value === 1) {
					throw 1;
				}

				return a$.value + 1;
			});
			let c$ = cellx(() => b$.value + 1);
			let d$ = cellx(() => c$.value + 1);

			d$.onError(d$OnError);

			expect(d$.value).toBe(3);
			expect(d$.error).toBeNull();

			a$.value = 1;
			release();

			expect(d$.value).toBe(3);
			expect(d$.error).toMatchObject({ message: '1' });

			expect(d$OnError.mock.calls.length).toBe(1);

			a$.value = 0;
			release();

			expect(d$.value).toBe(3);
			expect(d$.error).toBeNull();
		});

		test('событие error (2)', () => {
			let a$ = cellx(0);
			let b$ = cellx(() => {
				if (a$.value === 1) {
					throw 1;
				}

				return a$.value + 1;
			});
			let c1$ = cellx(() => b$.value + 1);
			let c2$ = cellx(() => b$.value + 1);
			let d$ = cellx(() => c1$.value + c2$.value);
			let d$OnError = jest.fn();
			let c2$OnError = jest.fn();

			d$.onError(d$OnError);
			c2$.onError(c2$OnError);

			a$.value = 1;
			release();

			expect(d$OnError.mock.calls.length).toBe(1);
			expect(c2$OnError.mock.calls.length).toBe(1);
		});

		test('нет лишнего вычисления при отсутствии обработчиков', () => {
			let a$ = cellx(1);
			let pullB$ = jest.fn(() => a$.value);
			let b$ = cellx(pullB$);
			let c1$ = cellx(() => b$.value);
			let c2$ = cellx(() => b$.value);
			let d$ = cellx(() => c1$.value + c2$.value);

			d$.value;
			pullB$.mockClear();
			a$.value = 2;
			d$.value;

			expect(pullB$.mock.calls.length).toBe(1);
		});

		test('меняется порядок зависимостей на обратный', () => {
			let a$ = cellx(0);
			let b$ = cellx(0);
			let c$ = cellx(0);
			let d$ = cellx(() => (a$.value % 2 === 0 ? [b$.value, c$.value] : [c$.value, b$.value]), {
				onChange: () => {}
			});

			expectDependencyOrder(d$, [a$, b$, c$]);

			a$.value = 1;
			release();

			expectDependencyOrder(d$, [a$, c$, b$]);
		});

		test('рандомно меняется список зависимостей', () => {
			let a$ = cellx(0);
			let b$ = cellx(0);
			let c$ = cellx(0);
			let d$ = cellx(0);
			let e$ = cellx(0);
			let f$ = cellx(0);
			let dependencies = [b$, c$, d$, e$, f$];
			let randomizedDependencies!: Array<Cell>;
			let x$ = cellx(
				() => {
					randomizedDependencies = [a$, ...dependencies.filter(() => Math.random() >= 0.25)].sort(
						() => Math.random() - 0.5
					);

					for (let dependency of randomizedDependencies) {
						dependency.value;
					}
				},
				{ onChange: () => {} }
			);

			for (let i = 0; ;) {
				expectDependencyOrder(x$, randomizedDependencies);

				if (++i === 300) {
					break;
				}

				a$.value++;
				release();
			}
		});

		test('не остаётся активной после потери наблюдателей при разрыве цикла', () => {
			let phase = 0;
			let x$ = cellx(10);
			let a$: Cell<number> = cellx(() => (phase === 0 ? 1 : phase === 1 ? b$.get() : x$.get()));
			let b$ = cellx(() => a$.get() + 1);
			let onChangeDisposer = b$.onChange(() => {});

			(x$ as any)['NAME'] = 'x';
			(a$ as any)['NAME'] = 'a';
			(b$ as any)['NAME'] = 'b';

			// Оставляем a$ и b$ наблюдать друг друга без внешней подписки.
			phase = 1;
			a$.pull();
			// Удаление внешнего listener b$ не разрывает цикл.
			onChangeDisposer();

			phase = 2;
			a$.pull();
			release();

			expect(a$._flags & Flags.ACTIVE).toBe(0);
			expect(b$._flags & Flags.ACTIVE).toBe(0);
			expect(a$._nextDependent).toBeNull();
			expect(b$._nextDependent).toBeNull();
			expect(x$._nextDependent).toBeNull();

			x$.set(20);

			expect(a$.get()).toBe(20);
		});

		test('пассивный наблюдатель ошибки замечает её изменение после проверки неизменившейся ошибки', () => {
			let a$ = cellx(0);
			let err = Error('failure');
			let b$ = cellx(() => {
				if (a$.value === 2) {
					throw err;
				}

				return 1;
			});
			let c$Pulls = 0;
			let c$ = cellx(() => {
				c$Pulls++;
				return b$.error;
			});

			expect(c$.value).toBeNull();
			expect(c$Pulls).toBe(1);

			a$.value = 1;
			expect(c$.value).toBeNull();
			expect(c$Pulls).toBe(1);

			a$.value = 2;
			expect(c$.value).toBe(err);
			expect(c$.error).toBeNull();
			expect(c$Pulls).toBe(2);
		});

		// Демонстрирует, зачем в текущем checkDependencies() нужен повторный проход по зависимостям при изменении globalVersion.
		test('запись из B повторно проверяет уже проверенную A', () => {
			let source$ = new Cell(0);
			let trigger$ = new Cell(0);
			let a$ = new Cell(() => source$.get());

			let b$ = new Cell(() => {
				if (trigger$.get() === 1) {
					source$.set(1);
				}

				return 0;
			});

			let c$ = new Cell(() => a$.get() + b$.get(), { onChange: () => {} });

			expect(c$.get()).toBe(0);

			trigger$.set(1);

			expect(source$.get()).toBe(0);
			expect(a$.get()).toBe(0);
			expect(c$.get()).toBe(1);
			expect(source$.get()).toBe(1);
			expect(a$.get()).toBe(1);
		});

		test('повторная инвалидация после регистрации зависимости', () => {
			let source$ = cellx(0);
			let trigger$ = cellx(0);

			let computed$ = cellx(() => {
				let value = source$.get();

				if (value === 1) {
					source$.set(2);
				}

				return value;
			});

			let seen: Array<number> = [];

			effect(() => {
				trigger$.get();
				seen.push(computed$.get());
			});

			source$.set(1);
			trigger$.set(1);
			release();

			expect(source$.get()).toBe(2);
			expect(seen).toEqual([0, 1, 2]);
		});
	});

	describe('async', () => {
		test('wait', async () => {
			let resolve!: (value: number) => void;
			let a$ = cellx(
				() =>
					new Promise<number>((done) => {
						resolve = done;
					}),
				{ async: true }
			);
			let onB$Change = jest.fn();
			let onC$Change = jest.fn();
			let b$ = cellx(() => a$.value + 1, { onChange: onB$Change });
			let c$ = cellx(() => b$.value + 1, { onChange: onC$Change });

			expect(a$.value).toBeUndefined();
			expect(a$.error).toBeInstanceOf(WaitError);
			expect(b$.value).toBeUndefined();
			expect(c$.value).toBeUndefined();

			resolve(1);
			await Promise.resolve();
			release();

			expect(b$.value).toBe(2);
			expect(c$.value).toBe(3);
			expect(onB$Change.mock.calls).toEqual([[2]]);
			expect(onC$Change.mock.calls).toEqual([[3]]);
		});
	});

	describe('other', () => {
		test('[options.assertValue]', () => {
			let assertNumber = jest.fn((value: any) => {
				if (typeof value !== 'number') {
					throw 1;
				}
			});
			let a$ = cellx<number | string>(1, { assertValue: assertNumber });
			let error: unknown = null;

			try {
				a$.value = '1';
			} catch (err) {
				error = err;
			}

			expect(error).not.toBeNull();
			expect(a$.value).toBe(1);
			expect(a$.error).toBeNull();

			a$.value = 2;

			expect(assertNumber.mock.calls).toEqual([
				[1, undefined],
				['1', 1],
				[2, 1]
			]);
		});

		test('[options.onUnobserved]', async () => {
			let onUnobserved = jest.fn();
			let a$ = cellx(() => Math.random(), { onUnobserved });
			let b$ = cellx(() => a$.value + 1);
			let listener = () => {};

			b$.onChange(listener)();

			expect(onUnobserved).not.toHaveBeenCalled();
			expect(a$._nextDependent).toBeNull();
			expect(b$._flags & Flags.ACTIVE).toBe(0);

			await Promise.resolve();

			expect(onUnobserved.mock.calls.length).toBe(1);
		});

		test('#disconnect()', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value, { onChange() {} });

			b$.disconnect();

			expect(b$._flags & Flags.ACTIVE).toBe(0);
		});
	});
});
