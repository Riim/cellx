import { Cell, define, EventEmitter } from '../src/cellx';

afterEach(() => {
	Cell.release();
});

describe('Cell', () => {
	describe('get/set', () => {
		test('чтение ячейки', () => {
			let a = new Cell(1);

			expect(a.get()).toBe(1);
		});

		test('чтение вычисляемой ячейки', () => {
			let a = new Cell(1);
			let b = new Cell(() => a.get() + 1);

			expect(b.get()).toBe(2);
		});

		test('запись в ячейку', () => {
			let a = new Cell(1);

			a.set(2);

			expect(a.get()).toBe(2);
		});

		test('запись в ячейку и чтение вычисляемой ячейки', () => {
			let a = new Cell(1);
			let b = new Cell(() => a.get() + 1);

			a.set(2);

			expect(b.get()).toBe(3);
		});

		test('#pull()', () => {
			let counter = 0;
			let a = new Cell<number>(() => ++counter);

			let onChange = jest.fn();
			let b = new Cell(() => a.get() + 1, { onChange });

			a.pull();

			Cell.release();

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(b.get()).toBe(3);
		});
	});

	describe('events', () => {
		test('событие change', done => {
			let a = new Cell(1, {
				onChange() {
					expect(a.get()).toBe(2);
					done();
				}
			});

			a.set(2);
		});

		test('событие change вычисляемой ячейки', done => {
			let a = new Cell(1);
			let b = new Cell(() => a.get() + 1, {
				onChange() {
					expect(b.get()).toBe(3);
					done();
				}
			});

			a.set(2);
		});

		test('нет события change при установке значения равного текущему', () => {
			let onChange = jest.fn();
			let a = new Cell(1, { onChange });

			a.set(1);

			Cell.release();

			expect(onChange).not.toHaveBeenCalled();
		});

		test('нет события change при добавлении обработчика после изменения', () => {
			let a = new Cell(1);
			let b = new Cell(() => a.get());

			a.set(2);

			let onChange = jest.fn();

			b.on('change', onChange);

			Cell.release();

			expect(onChange).not.toHaveBeenCalled();
		});

		test('EventEmitter в качестве значения', () => {
			let emitter = new EventEmitter();

			let onChange = jest.fn();
			new Cell(emitter, { onChange });

			emitter.emit('change');

			Cell.release();

			expect(onChange).toHaveBeenCalled();
		});

		test('EventEmitter в качестве значения (2)', () => {
			let emitter = new EventEmitter();

			let onChange = jest.fn();

			let a = new Cell(emitter);
			new Cell(() => a.get(), { onChange });

			emitter.emit('change');

			Cell.release();

			expect(onChange).toHaveBeenCalled();
		});

		test('подписка через EventEmitter', () => {
			let emitter = new EventEmitter();
			let onChange = jest.fn();

			define(emitter, {
				foo: 1
			});

			emitter.on('change:foo', onChange);

			(emitter as any).foo = 2;

			expect(onChange).toHaveBeenCalled();
		});
	});

	describe('behavior', () => {
		test('одно вычисление при изменении нескольких зависимостей', () => {
			let a = new Cell(1);
			let b = new Cell(2);

			let getC = jest.fn(() => a.get() + b.get());

			new Cell(getC, { onChange() {} });

			getC.mockClear();

			a.set(2);
			b.set(3);

			Cell.release();

			expect(getC).toHaveBeenCalledTimes(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (2)', () => {
			let a = new Cell(1);
			let b = new Cell(2);
			let c = new Cell<number>(() => b.get() + 1);

			let getD = jest.fn(() => a.get() + c.get());

			new Cell(getD, { onChange() {} });

			getD.mockClear();

			a.set(2);
			b.set(3);

			Cell.release();

			expect(getD).toHaveBeenCalledTimes(1);
		});

		test('одно вычисление при изменении нескольких зависимостей (3)', () => {
			let a = new Cell(1);
			let b = new Cell(2);
			let aa = new Cell<number>(() => a.get() + 1);
			let bb = new Cell<number>(() => b.get() + 1);

			let getC = jest.fn(() => aa.get() + bb.get());

			new Cell(getC, { onChange() {} });

			getC.mockClear();

			a.set(2);
			b.set(3);

			Cell.release();

			expect(getC).toHaveBeenCalledTimes(1);
		});

		test('запись в неинициализированную ячейку отменяет pull', () => {
			let a = new Cell<number>(() => 1);
			let b = new Cell(1);

			a.set(5);
			b.set(5);

			expect(b.get()).toBe(5);
		});

		test('запись в неинициализированную ячейку отменяет pull (2)', () => {
			let a = new Cell<number>(() => 1);
			let b = new Cell(1);

			a.set(5);
			b.set(5);

			a.on('change', () => {});

			expect(b.get()).toBe(5);
		});

		test('последняя запись более приоритетная', () => {
			let a = new Cell(1);
			let b = new Cell<number>(() => a.get() + 1);
			let c = new Cell(() => b.get() + 1, { onChange() {} });

			a.set(2);
			b.set(4);

			expect(c.get()).toBe(5);
		});

		test('последняя запись более приоритетная (2)', () => {
			let a = new Cell(1);
			let b = new Cell<number>(() => a.get() + 1);
			let c = new Cell(() => b.get() + 1, { onChange() {} });

			b.set(4);
			a.set(2);

			expect(c.get()).toBe(4);
		});

		test('запись в активную ячейку и последующее изменение её зависимости', done => {
			let a = new Cell(1);
			let b = new Cell(
				(_cell, next) => {
					if (a.get() == 2) {
						expect(next).toBe(5);
					}

					return a.get();
				},
				{
					onChange(evt) {
						if (evt.data.value == 2) {
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

		test("вычисляемая ячейка лишаясь зависимостей получает _state == 'actual'", () => {
			let a = new Cell(1);

			let t = 0;
			let b = new Cell<number>(
				() => {
					if (t++) {
						throw 1;
					}

					return a.get() + 1;
				},
				{ onChange: () => {} }
			);

			a.set(2);

			Cell.release();

			expect(b.get()).toEqual(2);
			expect(t).toEqual(2);
		});

		test('запись в родительскую ячейку в pull', () => {
			let a = new Cell(1);
			let b = new Cell<number>(() => a.get() + 1);
			let c = new Cell(() => {
				if (b.get() == 3) {
					a.set(10);
				}

				return b.get() + 1;
			});

			a.set(2);

			expect(c.get()).toBe(12);
		});

		test('запись в родительскую ячейку в pull (2)', () => {
			let a = new Cell(1);
			let b = new Cell<number>(() => a.get() + 1);
			let c = new Cell(
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

			let a = new Cell(1);

			let t = 0;
			let b = new Cell<number>(
				() => {
					if (t++) {
						throw 1;
					}

					return a.get() + 1;
				},
				{ onError: bOnError }
			);

			let c1 = new Cell<number>(() => b.get() + 1, { onError: c1OnError });
			let c2 = new Cell<number>(() => b.get() + 1, { onError: c2OnError });
			new Cell(() => c1.get() + c2.get(), { onError: dOnError });

			a.set(2);

			Cell.release();

			expect(bOnError).toHaveBeenCalledTimes(1);
			expect(c1OnError).toHaveBeenCalledTimes(1);
			expect(c2OnError).toHaveBeenCalledTimes(1);
			expect(dOnError).toHaveBeenCalledTimes(1);
		});
	});

	describe('other', () => {
		test('.afterRelease()', () => {
			let a = new Cell(1);
			let b = new Cell(() => a.get() + 1, { onChange() {} });

			a.set(2);

			let afterReleaseCallback = jest.fn();

			Cell.afterRelease(afterReleaseCallback);

			Cell.release();

			expect(afterReleaseCallback).toHaveBeenCalledTimes(1);
			expect(b.get()).toBe(3);
		});

		test('[validate]', () => {
			let a = new Cell(1, {
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

			expect(error).not.toBe(null);
			expect(a.get()).toBe(1);
		});

		test('[reap]', () => {
			let reap = jest.fn();
			let a = new Cell<number>(() => Math.random(), { reap });
			let b = new Cell(() => a.get() + 1);

			let listener = () => {};

			b.on('change', listener);
			b.off('change', listener);

			expect(reap).toHaveBeenCalledTimes(1);
		});

		test('#reap()', () => {
			let a = new Cell(1);
			let b = new Cell(() => a.get(), { onChange() {} });

			b.reap();

			expect(b._active).toBeFalsy();
		});
	});
});
