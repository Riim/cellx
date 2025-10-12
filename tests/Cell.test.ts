import { describe, expect, test } from '@jest/globals';
import { Cell, CellState, EventEmitter, cellx, configure, release } from '../src/cellx';

configure({ logError: () => {} });

afterEach(() => {
	release();
});

describe('Cell', () => {
	describe('get/set', () => {
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
		test('событие change', (done) => {
			let a$ = cellx(1, {
				onChange() {
					expect(a$.value).toBe(2);

					done();
				}
			});

			a$.value = 2;
		});

		test('событие change вычисляемой ячейки', (done) => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1, {
				onChange() {
					expect(b$.value).toBe(3);

					done();
				}
			});

			a$.value = 2;
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

			b$.onChange(onChange);
			b$.offChange(onChange);

			a$.value = 2;
			b$.onChange(onChange);
			release();

			expect(b$.value).toBe(2);
			expect(onChange.mock.calls.length).toBe(0);
		});

		test('EventEmitter в качестве значения', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();

			cellx(emitter, { onChange });

			emitter.emit('change');
			release();

			expect(onChange.mock.calls.length).toBe(1);
		});

		test('EventEmitter в качестве значения (2)', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();
			let a$ = cellx(emitter);

			cellx(() => a$.value, { onChange });

			emitter.emit('change');
			release();

			expect(onChange.mock.calls.length).toBe(1);
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
			let a$ = cellx(1, { meta: { name: 'a' } });
			let b$ = cellx(2, { meta: { name: 'b' } });
			let a2$ = cellx(() => a$.value + 1, { meta: { name: 'a2' } });
			let b2$ = cellx(() => b$.value + 1, { meta: { name: 'b2' } });
			let pullC$ = jest.fn(() => a2$.value + b2$.value);
			let c$ = cellx(pullC$, { meta: { name: 'c' }, onChange() {} });

			c$;

			pullC$.mockClear();

			a$.value = 2;
			b$.value = 3;
			release();

			expect(pullC$.mock.calls.length).toBe(1);
		});

		test('запись в неинициализированную ячейку отменяет pull', () => {
			let a$ = cellx(() => 1, { writable: true });

			a$.value = 5;

			expect(a$.value).toBe(5);
		});

		test('запись в неинициализированную ячейку отменяет pull (2)', () => {
			let a$ = cellx(() => 1, { writable: true });

			a$.value = 5;

			a$.on(Cell.EVENT_CHANGE, () => {});

			expect(a$.value).toBe(5);
		});

		test('последняя запись более приоритетная', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1, { writable: true });
			let c$ = cellx(() => b$.value + 1, { onChange() {} });

			a$.value = 2;
			b$.value = 4;

			expect(c$.value).toBe(5);
		});

		test('последняя запись более приоритетная (2)', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1, { writable: true });
			let c$ = cellx(() => b$.value + 1, { onChange() {} });

			b$.value = 4;
			a$.value = 2;

			expect(c$.value).toBe(4);
		});

		test('запись в активную ячейку и последующее изменение её зависимости', (done) => {
			let a$ = cellx(1);
			let b$ = cellx(
				(cell, value) => {
					if (a$.value == 2) {
						expect(value).toBe(5);
					}

					return a$.value;
				},
				{
					writable: true,
					onChange(evt) {
						if (evt.data.value == 2) {
							expect(evt.data).toEqual({
								value: 2,
								prevValue: 5
							});

							done();
						} else {
							expect(evt.data).toEqual({
								value: 5,
								prevValue: 1
							});
						}
					}
				}
			);

			b$.value = 5;
			a$.value = 2;
		});

		test('подключаемая, неактивная ячейка получает state == actual', () => {
			let a$ = cellx(true);
			let b$ = cellx(() => 1);
			let c$ = cellx(() => b$.value);
			let d$ = cellx(() => (a$.value ? 1 : c$.value));

			d$.onChange(() => {});
			a$.value = false;
			release();

			expect(c$.state).toBe(CellState.ACTUAL);
		});

		test('вычисляемая ячейка лишаясь всех зависимостей получает state == actual', () => {
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
			expect(b$.state).toBe(CellState.ACTUAL);
			expect(b$.value).toBe(2);
		});

		test('запись в родительскую ячейку в pull', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);
			let c$ = cellx(
				() => {
					if (b$.value == 3) {
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
				if (b$.value == 3) {
					a$.value = 10;
				}

				return b$.value + 1;
			});

			a$.value = 2;

			expect(c$.value).toBe(12);
		});

		test('запись в родительскую ячейку в pull (2)', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);
			let c$ = cellx(
				() => {
					if (b$.value == 3) {
						a$.value = 10;
					}

					return b$.value + 1;
				},
				{ onChange: () => {} }
			);

			a$.value = 2;

			expect(c$.value).toBe(12);
		});

		test('pull при чтении error', () => {
			let a$ = cellx(0);
			let b$ = cellx(() => {
				if (a$.value == 1) {
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
				if (a$.value == 1) {
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
				if (a$.value == 1) {
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
				if (a$.value == 1) {
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
			let a$ = cellx(0, { meta: { name: 'a' } });
			let b$ = cellx(0, { meta: { name: 'b' } });
			let c$ = cellx(0, { meta: { name: 'c' } });
			let d$ = cellx(
				() => (a$.value % 2 == 0 ? [b$.value, c$.value] : [c$.value, b$.value]),
				{
					meta: { name: 'd' },
					onChange: () => {}
				}
			);

			expect(d$.getDependencies().map((cell) => cell.meta.name)).toEqual(
				[a$, b$, c$].map((cell) => cell.meta.name)
			);

			a$.value = 1;
			release();

			expect(d$.getDependencies().map((cell) => cell.meta.name)).toEqual(
				[a$, c$, b$].map((cell) => cell.meta.name)
			);
		});

		test('рандомно меняется список зависимостей', () => {
			let a$ = cellx(0, { meta: { name: 'a' } });
			let b$ = cellx(0, { meta: { name: 'b' } });
			let c$ = cellx(0, { meta: { name: 'c' } });
			let d$ = cellx(0, { meta: { name: 'd' } });
			let e$ = cellx(0, { meta: { name: 'e' } });
			let f$ = cellx(0, { meta: { name: 'f' } });
			let dependencies = [b$, c$, d$, e$, f$];
			let randomizedDependencies!: Array<Cell>;
			let x$ = cellx(
				() => {
					randomizedDependencies = [
						a$,
						...dependencies.filter(() => Math.random() >= 0.25)
					].sort(() => Math.random() - 0.5);

					for (let dependency of randomizedDependencies) {
						dependency.value;
					}
				},
				{
					meta: { name: 'x' },
					onChange: () => {}
				}
			);

			for (let i = 0; ; ) {
				expect(x$.getDependencies().map((cell) => cell.meta.name)).toEqual(
					randomizedDependencies.map((cell) => cell.meta.name)
				);

				if (++i == 300) {
					break;
				}

				a$.value++;
				release();
			}
		});
	});

	describe('async computed', () => {
		test('wait', (done) => {
			let a$ = cellx(
				({ push, wait }) => {
					setTimeout(() => {
						push(1);
					}, 1);

					wait();

					return 10;
				},
				{ value: 0 }
			);
			let b$ = cellx(() => a$.value + 1, {
				onChange: () => {
					expect(b$.value).toBe(2);
				}
			});
			let c$ = cellx(() => b$.value + 1, {
				onChange: () => {
					expect(c$.value).toBe(3);
					done();
				}
			});

			expect(a$.value).toBe(0);
			expect(b$.value).toBeUndefined();
			expect(c$.value).toBeUndefined();
		});
	});

	describe('other', () => {
		test('[options.validate]', () => {
			let a$ = cellx<number | string>(1, {
				validate(value) {
					if (typeof value != 'number') {
						throw 1;
					}
				}
			});
			let error = null;

			try {
				a$.value = '1';
			} catch (err) {
				error = err;
			}

			expect(error).not.toBeNull();
			expect(a$.value).toBe(1);
		});

		test('[options.reap]', () => {
			let reap = jest.fn();
			let a$ = cellx(() => Math.random(), { reap });
			let b$ = cellx(() => a$.value + 1);
			let listener = () => {};

			b$.on(Cell.EVENT_CHANGE, listener);
			b$.off(Cell.EVENT_CHANGE, listener);

			expect(reap.mock.calls.length).toBe(1);
		});

		test('#reap()', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value, { onChange() {} });

			b$.reap();

			expect(b$.active).toBeFalsy();
		});
	});
});
