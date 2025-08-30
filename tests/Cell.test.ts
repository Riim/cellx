import { describe, expect, test } from '@jest/globals';
import { CellState } from '../src/Cell';
import {
	Cell,
	cellx,
	configure,
	define,
	EventEmitter
	} from '../src/cellx';

configure({ logError: () => {} });

afterEach(() => {
	Cell.release();
});

describe('Cell', () => {
	describe('get/set', () => {
		test('чтение ячейки', () => {
			let a = cellx(1);

			expect(a.get()).toBe(1);
		});

		test('чтение ячейки (2)', () => {
			let a = cellx(1);

			expect(a.value).toBe(1);
		});

		test('чтение вычисляемой ячейки', () => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1);

			expect(b.get()).toBe(2);
		});

		test('запись в ячейку', () => {
			let a = cellx(1);

			a.set(2);

			expect(a.get()).toBe(2);
		});

		test('запись в ячейку (2)', () => {
			let a = cellx(1);

			a.value = 2;

			expect(a.get()).toBe(2);
		});

		test('запись в ячейку и чтение вычисляемой ячейки', () => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1);

			a.set(2);

			expect(b.get()).toBe(3);
		});

		test('#pull()', () => {
			let counter = 0;
			let a = cellx(() => ++counter);
			let onChange = jest.fn();
			let b = cellx(() => a.get() + 1, { onChange });

			a.pull();

			Cell.release();

			expect(onChange.mock.calls.length).toBe(1);
			expect(b.get()).toBe(3);
		});
	});

	describe('events', () => {
		test('событие change', (done) => {
			let a = cellx(1, {
				onChange() {
					expect(a.get()).toBe(2);
					done();
				}
			});

			a.set(2);
		});

		test('событие change вычисляемой ячейки', (done) => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1, {
				onChange() {
					expect(b.get()).toBe(3);
					done();
				}
			});

			a.set(2);
		});

		test('нет события change при установке значения равного текущему', () => {
			let onChange = jest.fn();
			let a = cellx(1, { onChange });

			a.set(1);

			Cell.release();

			expect(onChange.mock.calls.length).toBe(0);
		});

		test('нет события change при добавлении обработчика после изменения', () => {
			let a = cellx(1);
			let b = cellx(() => a.get());

			a.set(2);

			let onChange = jest.fn();

			b.onChange(onChange);

			Cell.release();

			expect(onChange.mock.calls.length).toBe(0);
		});

		test('нет события change при добавлении обработчика после изменения (2)', () => {
			let a = cellx(1);
			let b = cellx(() => a.get());

			let onChange = jest.fn();

			b.onChange(onChange);
			b.offChange(onChange);

			a.set(2);

			b.onChange(onChange);

			Cell.release();

			expect(b.get()).toBe(2);

			expect(onChange.mock.calls.length).toBe(0);
		});

		test('EventEmitter в качестве значения', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();

			cellx(emitter, { onChange });

			emitter.emit('change');

			Cell.release();

			expect(onChange.mock.calls.length).not.toBe(0);
		});

		test('EventEmitter в качестве значения (2)', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();
			let a = cellx(emitter);

			cellx(() => a.get(), { onChange });

			emitter.emit('change');

			Cell.release();

			expect(onChange.mock.calls.length).not.toBe(0);
		});

		test('подписка через EventEmitter', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();

			define(emitter, { foo: 1 });

			emitter.on('change:foo', onChange);

			emitter['foo'] = 2;

			expect(onChange.mock.calls.length).not.toBe(0);
		});
	});

	describe('behavior', () => {
		test('одно вычисление при изменении нескольких зависимостей', () => {
			let a = cellx(1);
			let b = cellx(2);
			let getC = jest.fn(() => a.get() + b.get());

			cellx(getC, { onChange() {} });

			getC.mockClear();

			a.set(2);
			b.set(3);

			Cell.release();

			expect(getC.mock.calls.length).toBe(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (2)', () => {
			let a = cellx(1);
			let b = cellx(2);
			let c = cellx(() => b.get() + 1);
			let getD = jest.fn(() => a.get() + c.get());

			cellx(getD, { onChange() {} });

			getD.mockClear();

			a.set(2);
			b.set(3);

			Cell.release();

			expect(getD.mock.calls.length).toBe(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (3)', () => {
			let a = cellx(1);
			let b = cellx(2);
			let aa = cellx(() => a.get() + 1);
			let bb = cellx(() => b.get() + 1);
			let getC = jest.fn(() => aa.get() + bb.get());

			cellx(getC, { onChange() {} });

			getC.mockClear();

			a.set(2);
			b.set(3);

			Cell.release();

			expect(getC.mock.calls.length).toBe(1);
		});

		test('запись в неинициализированную ячейку отменяет pull', () => {
			let a = cellx(() => 1);
			let b = cellx(1);

			a.set(5);
			b.set(5);

			expect(b.get()).toBe(5);
		});

		test('запись в неинициализированную ячейку отменяет pull (2)', () => {
			let a = cellx(() => 1);
			let b = cellx(1);

			a.set(5);
			b.set(5);

			a.on(Cell.EVENT_CHANGE, () => {});

			expect(b.get()).toBe(5);
		});

		test('последняя запись более приоритетная', () => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1);
			let c = cellx(() => b.get() + 1, { onChange() {} });

			a.set(2);
			b.set(4);

			expect(c.get()).toBe(5);
		});

		test('последняя запись более приоритетная (2)', () => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1);
			let c = cellx(() => b.get() + 1, { onChange() {} });

			b.set(4);
			a.set(2);

			expect(c.get()).toBe(4);
		});

		test('запись в активную ячейку и последующее изменение её зависимости', (done) => {
			let a = cellx(1);
			let b = cellx(
				(_cell, value) => {
					if (a.get() == 2) {
						expect(value).toBe(5);
					}

					return a.get();
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

			b.set(5);
			a.set(2);
		});

		test('подключаемая, неактивная ячейка получает state == actual', () => {
			let a = cellx(() => (b.get() ? 1 : c.get()));
			let b = cellx(true);
			let c = cellx(() => d.get());
			let d = cellx(() => 1);

			a.onChange(() => {});
			b.set(false);

			Cell.release();

			expect(c.state).toBe(CellState.ACTUAL);
		});

		test('вычисляемая ячейка лишаясь зависимостей получает state == actual', () => {
			let a = cellx(1);

			let t = 0;
			let b = cellx(
				() => {
					if (t++) {
						throw 1;
					}

					return a.get() + 1;
				},
				{ onChange: () => {} }
			);

			a.set(2);

			try {
				Cell.release();
			} catch {}

			expect(t).toBe(2);

			expect(b.state).toBe(CellState.ACTUAL);

			expect(() => b.get()).toThrow();
		});

		test('запись в родительскую ячейку в pull', () => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1);
			let c = cellx(() => {
				if (b.get() == 3) {
					a.set(10);
				}

				return b.get() + 1;
			});

			a.set(2);

			expect(c.get()).toBe(12);
		});

		test('запись в родительскую ячейку в pull (2)', () => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1);
			let c = cellx(
				() => {
					if (b.get() == 3) {
						a.set(10);
					}

					return b.get() + 1;
				},
				{ onChange: () => {} }
			);

			a.set(2);

			expect(c.get()).toBe(12);
		});

		test('событие error без дублирования', () => {
			let bOnError = jest.fn();
			let c1OnError = jest.fn();
			let c2OnError = jest.fn();
			let dOnError = jest.fn();

			let a = cellx(1);

			let t = 0;
			let b = cellx(
				() => {
					if (t++) {
						throw 1;
					}

					return a.get() + 1;
				},
				{ onError: bOnError }
			);

			let c1 = cellx(() => b.get() + 1, { onError: c1OnError });
			let c2 = cellx(() => b.get() + 1, { onError: c2OnError });
			cellx(() => c1.get() + c2.get(), { onError: dOnError });

			a.set(2);

			Cell.release();

			expect(bOnError.mock.calls.length).toBe(1);
			expect(c1OnError.mock.calls.length).toBe(1);
			expect(c2OnError.mock.calls.length).toBe(1);
			expect(dOnError.mock.calls.length).toBe(1);
		});
	});

	describe('other', () => {
		test('.afterRelease()', () => {
			let a = cellx(1);
			let b = cellx(() => a.get() + 1, { onChange() {} });

			a.set(2);

			let afterReleaseCallback = jest.fn();

			Cell.afterRelease(afterReleaseCallback);

			Cell.release();

			expect(afterReleaseCallback.mock.calls.length).toBe(1);
			expect(b.get()).toBe(3);
		});

		test('.transact()', () => {
			let a = cellx(1);

			try {
				Cell.transact(() => {
					a.set(2);
					a.set(3);

					throw 1;
				});
			} catch {}

			expect(a.get()).toBe(1);
		});

		test('[options.validate]', () => {
			let a = cellx(1, {
				validate(value) {
					if (typeof value != 'number') {
						throw 1;
					}
				}
			});
			let error = null;

			try {
				a.set('1' as any);
			} catch (err) {
				error = err;
			}

			expect(error).not.toBeNull();
			expect(a.get()).toBe(1);
		});

		test('[options.value]', () => {
			let a = cellx(1, { value: 2 });

			expect(a.get()).toBe(2);
		});

		test('[options.reap]', () => {
			let reap = jest.fn();
			let a = cellx(() => Math.random(), { reap });
			let b = cellx(() => a.get() + 1);
			let listener = () => {};

			b.on(Cell.EVENT_CHANGE, listener);
			b.off(Cell.EVENT_CHANGE, listener);

			expect(reap.mock.calls.length).toBe(1);
		});

		test('#reap()', () => {
			let a = cellx(1);
			let b = cellx(() => a.get(), { onChange() {} });

			b.reap();

			expect(b._active).toBeFalsy();
		});
	});
});
