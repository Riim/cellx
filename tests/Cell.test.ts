import { describe, expect, test } from '@jest/globals';
import { CellState } from '../src/Cell';
import { Cell, EventEmitter, cellx, configure, define } from '../src/cellx';

configure({ logError: () => {} });

afterEach(() => {
	Cell.release();
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

			Cell.release();

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

			Cell.release();

			expect(onChange.mock.calls.length).toBe(0);
		});

		test('нет события change при добавлении обработчика после изменения', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value);

			a$.value = 2;

			let onChange = jest.fn();

			b$.onChange(onChange);

			Cell.release();

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

			Cell.release();

			expect(b$.value).toBe(2);

			expect(onChange.mock.calls.length).toBe(0);
		});

		test('EventEmitter в качестве значения', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();

			cellx(emitter, { onChange });

			emitter.emit('change');

			Cell.release();

			expect(onChange.mock.calls.length).toBe(1);
		});

		test('EventEmitter в качестве значения (2)', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();
			let a$ = cellx(emitter);

			cellx(() => a$.value, { onChange });

			emitter.emit('change');

			Cell.release();

			expect(onChange.mock.calls.length).toBe(1);
		});

		test('подписка через EventEmitter', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();

			define(emitter, { foo: 1 });

			emitter.on('change:foo', onChange);

			emitter['foo'] = 2;

			expect(onChange.mock.calls.length).toBe(1);
		});
	});

	describe('behavior', () => {
		test('одно вычисление при изменении нескольких зависимостей', () => {
			let a$ = cellx(1);
			let b$ = cellx(2);
			let calcC$ = jest.fn(() => a$.value + b$.value);

			cellx(calcC$, { onChange() {} });

			calcC$.mockClear();

			a$.value = 2;
			b$.value = 3;

			Cell.release();

			expect(calcC$.mock.calls.length).toBe(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (2)', () => {
			let a$ = cellx(1);
			let b$ = cellx(2);
			let c$ = cellx(() => b$.value + 1);
			let calcD$ = jest.fn(() => a$.value + c$.value);

			cellx(calcD$, { onChange() {} });

			calcD$.mockClear();

			a$.value = 2;
			b$.value = 3;

			Cell.release();

			expect(calcD$.mock.calls.length).toBe(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (3)', () => {
			let a$ = cellx(1);
			let b$ = cellx(2);
			let a2$ = cellx(() => a$.value + 1);
			let b2$ = cellx(() => b$.value + 1);
			let calcC$ = jest.fn(() => a2$.value + b2$.value);

			cellx(calcC$, { onChange() {} });

			calcC$.mockClear();

			a$.value = 2;
			b$.value = 3;

			Cell.release();

			expect(calcC$.mock.calls.length).toBe(1);
		});

		test('запись в неинициализированную ячейку отменяет pull', () => {
			let a$ = cellx(() => 1);
			let b$ = cellx(1);

			a$.value = 5;
			b$.value = 5;

			expect(b$.value).toBe(5);
		});

		test('запись в неинициализированную ячейку отменяет pull (2)', () => {
			let a$ = cellx(() => 1);
			let b$ = cellx(1);

			a$.value = 5;
			b$.value = 5;

			a$.on(Cell.EVENT_CHANGE, () => {});

			expect(b$.value).toBe(5);
		});

		test('последняя запись более приоритетная', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);
			let c$ = cellx(() => b$.value + 1, { onChange() {} });

			a$.value = 2;
			b$.value = 4;

			expect(c$.value).toBe(5);
		});

		test('последняя запись более приоритетная (2)', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1);
			let c$ = cellx(() => b$.value + 1, { onChange() {} });

			b$.value = 4;
			a$.value = 2;

			expect(c$.value).toBe(4);
		});

		test('запись в активную ячейку и последующее изменение её зависимости', (done) => {
			let a$ = cellx(1);
			let b$ = cellx(
				(_cell, value) => {
					if (a$.value == 2) {
						expect(value).toBe(5);
					}

					return a$.value;
				},
				{
					onChange(evt) {
						if (evt.data['value'] == 2) {
							expect(evt.data).toEqual({
								prevValue: 5,
								value: 2
							});

							done();
						} else {
							expect(evt.data).toEqual({
								prevValue: 1,
								value: 5
							});
						}
					}
				}
			);

			b$.value = 5;
			a$.value = 2;
		});

		test('подключаемая, неактивная ячейка получает state == actual', () => {
			let a$ = cellx(() => (b$.value ? 1 : c$.value));
			let b$ = cellx(true);
			let c$ = cellx(() => d$.value);
			let d$ = cellx(() => 1);

			a$.onChange(() => {});
			b$.value = false;

			Cell.release();

			expect(c$.state).toBe(CellState.ACTUAL);
		});

		test('вычисляемая ячейка лишаясь зависимостей получает state == actual', () => {
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
				Cell.release();
			} catch {}

			expect(t).toBe(2);

			expect(b$.state).toBe(CellState.ACTUAL);

			expect(() => b$.value).toThrow();
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

		test('событие error без дублирования', () => {
			let b$OnError = jest.fn();
			let c1$OnError = jest.fn();
			let c2$OnError = jest.fn();
			let d$OnError = jest.fn();

			let a$ = cellx(1);

			let t = 0;
			let b$ = cellx(
				() => {
					if (t++) {
						throw 1;
					}

					return a$.value + 1;
				},
				{ onError: b$OnError }
			);

			let c1$ = cellx(() => b$.value + 1, { onError: c1$OnError });
			let c2$ = cellx(() => b$.value + 1, { onError: c2$OnError });
			cellx(() => c1$.value + c2$.value, { onError: d$OnError });

			a$.value = 2;

			Cell.release();

			expect(b$OnError.mock.calls.length).toBe(1);
			expect(c1$OnError.mock.calls.length).toBe(1);
			expect(c2$OnError.mock.calls.length).toBe(1);
			expect(d$OnError.mock.calls.length).toBe(1);
		});
	});

	describe('other', () => {
		test('.afterRelease()', () => {
			let a$ = cellx(1);
			let b$ = cellx(() => a$.value + 1, { onChange() {} });

			a$.value = 2;

			let afterReleaseCallback = jest.fn();

			Cell.afterRelease(afterReleaseCallback);

			Cell.release();

			expect(afterReleaseCallback.mock.calls.length).toBe(1);
			expect(b$.value).toBe(3);
		});

		test('.transact()', () => {
			let a$ = cellx(1);

			try {
				Cell.transact(() => {
					a$.value = 2;
					a$.value = 3;

					throw 1;
				});
			} catch {}

			expect(a$.value).toBe(1);
		});

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
