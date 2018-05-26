let { EventEmitter, ObservableList, Cell, define } = require('../dist/cellx');

describe('Cell', () => {
	test('.afterRelease()', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1, { onChange() {} });

		a.set(2);

		let afterReleaseCallback = jest.fn();

		Cell.afterRelease(afterReleaseCallback);

		Cell.forceRelease();
		expect(afterReleaseCallback).toHaveBeenCalledTimes(1);
	});

	test('.afterRelease() (2)', done => {
		let a = new Cell(1);
		let b = new Cell(1);
		let c = new Cell(() => b.get(), { onChange() {} });

		a.addChangeListener(() => {
			Cell.afterRelease(() => {
				expect(c.get()).toBe(2);
				done();
			});

			b.set(2);
		});

		a.set(2);
	});

	test('#pull()', () => {
		let counter = 0;
		let a = new Cell(() => {
			return ++counter;
		});

		let onChange = jest.fn();
		let b = new Cell(() => a.get() + 1, { onChange });

		a.pull();

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(b.get()).toBe(3);
	});

	// Если в get устанавливать _level раньше запуска _tryPull,
	// то на уровнях 2+ _level всегда будет 1, что как-то не очень хорошо.
	test('минимум вызовов pull', () => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(2, { debugKey: 'b' });
		let c = new Cell(() => b.get() + 1, { debugKey: 'c' });

		let getD = jest.fn(() => a.get() + c.get());

		let d = new Cell(getD, { debugKey: 'd' });

		d.addChangeListener(() => {});

		getD.mockClear();

		a.set(2);
		b.set(3);

		Cell.forceRelease();

		expect(getD).toHaveBeenCalledTimes(1);
	});

	test('нет события `change` при установке значения равного текущему', () => {
		let onChange = jest.fn();
		let a = new Cell(1, { onChange });

		a.set(1);

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalledTimes(0);
	});

	test('нет события `change` при установке значения равного текущему (NaN)', () => {
		let onChange = jest.fn();
		let a = new Cell(NaN, { onChange });

		a.set(NaN);

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalledTimes(0);
	});

	test('нет события `change`, если вычесляемое значение не меняется (NaN)', () => {
		let onChange = jest.fn();

		let a = new Cell(1);
		let b = new Cell(() => a.get() + NaN, { onChange });

		a.set(2);

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalledTimes(0);
	});

	test('нет события `change`, если установить новое значение и сразу вернуть исходное', () => {
		let onChange = jest.fn();
		let a = new Cell(1, { onChange });

		a.set(5);
		a.set(1);

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalledTimes(0);
		expect(a.get()).toBe(1);
	});

	test('нет события `change` если установить новое значение и сразу вернуть исходное (2)', () => {
		let emitter1 = new EventEmitter();
		let emitter2 = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter1, { onChange });

		a.set(emitter2);
		a.set(emitter1);

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalledTimes(0);
	});

	test('EventEmitter в качестве значения', () => {
		let emitter = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter, { onChange });

		emitter.emit('change');

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalled();
	});

	test('EventEmitter в качестве значения (2)', () => {
		let emitter = new EventEmitter();

		let onChange = jest.fn();

		let a = new Cell(emitter);
		let b = new Cell(
			() => {
				a.get();
				return Math.random();
			},
			{ onChange }
		);

		emitter.emit('change');

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalled();
	});

	test('нет события `change`, если установить новое значение, изменить его (внутреннее изменение) и вернуть исходное значение', () => {
		let emitter1 = new EventEmitter();
		let emitter2 = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter1, { onChange });

		a.set(emitter2);

		emitter2.emit('change');

		a.set(emitter1);

		Cell.forceRelease();

		expect(onChange).not.toHaveBeenCalled();
	});

	test('событие `change`, если измененить текущее значение (внутреннее изменение), установить новое значение и сразу вернуть исходное', () => {
		let emitter1 = new EventEmitter();
		let emitter2 = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter1, { onChange });

		emitter1.emit('change');

		a.set(emitter2);
		a.set(emitter1);

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalled();
	});

	test('одно вычисление при инициализации, даже если родительских ячеек больше одной', () => {
		let a = new Cell(1);
		let b = new Cell(2);

		let getC = jest.fn(() => a.get() + b.get());

		let c = new Cell(getC, { onChange() {} });

		Cell.forceRelease();

		expect(getC).toHaveBeenCalledTimes(1);
	});

	test('одно вычисление, даже если поменять сразу несколько родительских ячеек', () => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(2, { debugKey: 'b' });

		let getC = jest.fn(() => a.get() + b.get());

		let c = new Cell(getC, {
			debugKey: 'c',
			onChange() {}
		});

		Cell.forceRelease();

		getC.mockClear();

		a.set(5);
		b.set(10);

		Cell.forceRelease();

		expect(getC).toHaveBeenCalledTimes(1);
	});

	test('одно вычисление, даже если поменять сразу несколько родительских ячеек (2)', () => {
		let a = new Cell(1);
		let b = new Cell(2);
		let aa = new Cell(() => a.get() + 1);
		let bb = new Cell(() => b.get() + 1);

		let getC = jest.fn(() => aa.get() + bb.get());

		let c = new Cell(getC, { onChange() {} });

		getC.mockClear();

		a.set(5);
		b.set(10);

		Cell.forceRelease();

		expect(getC).toHaveBeenCalledTimes(1);
	});

	test('событие `change` при чтении пока событие запланировано', () => {
		let aOnChange = jest.fn(() => {
			let bValue = b.get();
		});
		let bOnChange = jest.fn(() => {
			let cValue = c.get();
		});
		let cOnChange = jest.fn(() => {
			let aValue = a.get();
		});

		let a = new Cell(1, { onChange: aOnChange });
		let b = new Cell(2, { onChange: bOnChange });
		let c = new Cell(3, { onChange: cOnChange });

		a.set(5);
		b.set(10);
		c.set(15);

		Cell.forceRelease();

		expect(aOnChange).toHaveBeenCalledTimes(1);
		expect(bOnChange).toHaveBeenCalledTimes(1);
		expect(cOnChange).toHaveBeenCalledTimes(1);
	});

	test('запись в родительскую ячейку в формуле', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => {
			if (b.get() == 3) {
				a.set(10);
			}

			return b.get() + 1;
		});

		a.set(2);

		expect(c.get()).toBe(12);
	});

	test('запись в родительскую ячейку в формуле (2)', () => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(() => a.get() + 1, { debugKey: 'b' });
		let c = new Cell(
			() => {
				if (b.get() == 3) {
					a.set(10);
				}

				return b.get() + 1;
			},
			{ debugKey: 'c' }
		);

		c.addChangeListener(() => {});

		a.set(2);

		expect(c.get()).toBe(12);
	});

	test('нет события `change` при добавлении обработчика после изменения', () => {
		let onChange = jest.fn();
		let a = new Cell(1, { onChange() {} });

		a.set(2);

		a.addChangeListener(onChange);

		Cell.forceRelease();

		expect(onChange).not.toHaveBeenCalled();
	});

	test('чтение вычисляемой ячейки после изменения зависимости', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);

		a.set(2);

		expect(b.get()).toBe(3);
	});

	test('нет изменения при чтении невычисляемой ячейки', () => {
		let onChange = jest.fn();

		let a = new Cell(1);
		let b = new Cell(2);
		let c = new Cell(() => a.get() + b.get(), { onChange });

		a.set(2);
		b.get();

		expect(onChange).not.toHaveBeenCalled();

		Cell.forceRelease();

		expect(onChange).toHaveBeenCalled();
	});

	test('событие `error` без дублирования', () => {
		let bOnError = jest.fn();
		let c1OnError = jest.fn();
		let c2OnError = jest.fn();
		let dOnError = jest.fn();

		let a = new Cell(1);

		let t = 0;
		let b = new Cell(
			() => {
				if (t++) {
					throw 1;
				}

				return a.get() + 1;
			},
			{ onError: bOnError }
		);

		let c1 = new Cell(() => b.get() + 1, { onError: c1OnError });
		let c2 = new Cell(() => b.get() + 1, { onError: c2OnError });
		let d = new Cell(() => c1.get() + c2.get(), { onError: dOnError });

		a.set(2);

		Cell.forceRelease();

		expect(bOnError).toHaveBeenCalledTimes(1);
		expect(c1OnError).toHaveBeenCalledTimes(1);
		expect(c2OnError).toHaveBeenCalledTimes(1);
		expect(dOnError).toHaveBeenCalledTimes(1);
	});

	test('последний set более приоритетный', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1, { onChange() {} });

		a.set(2);
		b.set(4);

		expect(c.get()).toBe(5);
	});

	test('последний set более приоритетный (2)', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1, { onChange() {} });

		b.set(4);
		a.set(2);

		expect(c.get()).toBe(4);
	});

	test('последний set более приоритетный (3)', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1, { onChange() {} });

		a.set(2);
		b.set(2);

		expect(c.get()).toBe(3);
	});

	test('последний set более приоритетный (4)', () => {
		let counter = 0;
		let a = new Cell(() => ++counter);
		let b = new Cell(() => a.get() + 1);

		b.set(5);
		a.pull();

		expect(b.get()).toBe(2);
	});

	test('последний set более приоритетный (5)', () => {
		let counter = 0;
		let a = new Cell(() => ++counter, { onChange() {} });
		let b = new Cell(() => a.get() + 1, { onChange() {} });

		b.set(5);
		a.pull();

		expect(b.get()).toBe(3);
	});

	test('нет бесконечного цикла', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1);

		let d = new Cell(1);
		let e = new Cell(() => c.get() + d.get(), { onChange() {} });

		c.get();

		d.set(2);

		Cell.forceRelease();

		expect(e.get()).toBe(5);
	});

	test('нет бесконечного цикла (2)', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1, {
			onChange() {
				c.set(2);
			}
		});

		let c = new Cell(1, { onChange() {} });

		a.set(2);

		Cell.forceRelease();

		expect(c.get()).toBe(2);
	});

	test('validation', () => {
		let a = new Cell(1, {
			validate(value) {
				if (typeof value != 'number') {
					throw 1;
				}
			}
		});
		let error = null;

		try {
			a.set('1');
		} catch (err) {
			error = err;
		}

		expect(error).not.toBe(null);
		expect(a.get()).toBe(1);
	});

	test('#subscribe(), #unsubscribe()', () => {
		let a = new Cell(1);
		let onChange = jest.fn();

		a.set(2);
		a.subscribe(onChange);
		a.set(3);
		a.unsubscribe(onChange);
		a.set(4);

		expect(onChange).toHaveBeenCalledTimes(1);

		expect(onChange).toHaveBeenCalledWith(null, {
			type: 'change',
			target: a,
			data: {
				prevEvent: null,
				prevValue: 2,
				value: 3
			}
		});
	});

	test('#subscribe(), #unsubscribe() (2)', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let onChange = jest.fn();

		a.set(2);
		b.subscribe(onChange);
		a.set(3);
		b.unsubscribe(onChange);
		a.set(4);

		expect(onChange).toHaveBeenCalledTimes(1);

		expect(onChange).toHaveBeenCalledWith(null, {
			type: 'change',
			target: b,
			data: {
				prevEvent: null,
				prevValue: 3,
				value: 4
			}
		});
	});

	test('[options.reap]', () => {
		let reap = jest.fn();
		let a = new Cell(() => Math.random(), { debugKey: 'a', reap });
		let b = new Cell(() => a.get() + 1, { debugKey: 'b' });

		let listener = () => {};

		b.addChangeListener(listener);
		b.removeChangeListener(listener);

		expect(reap).toHaveBeenCalledTimes(1);
	});

	test('#isPending()', done => {
		let cOnChange = jest.fn();
		let loadingOnChange = jest.fn();

		setTimeout(() => { // for travis
			let a = new Cell((cell, next = 0) => {
				setTimeout(() => {
					cell.push(Math.random());
				}, 10);

				return next;
			});
			let b = new Cell((cell, next = 0) => {
				setTimeout(() => {
					cell.push(Math.random());
				}, 50);

				return next;
			});

			let c = new Cell(() => a.get() + b.get(), { onChange: cOnChange });

			let loading = new Cell(() => a.isPending() || b.isPending(), {
				onChange: loadingOnChange
			});

			setTimeout(() => {
				expect(c.get()).toBe(0);
				expect(loading.get()).toBeTruthy();
				expect(cOnChange).not.toHaveBeenCalled();
				expect(loadingOnChange).not.toHaveBeenCalled();

				setTimeout(() => {
					expect(c.get()).not.toBe(0);
					expect(loading.get()).toBeTruthy();
					expect(cOnChange).toHaveBeenCalled();
					expect(loadingOnChange).not.toHaveBeenCalled();

					setTimeout(() => {
						expect(loading.get()).toBeFalsy();

						a.pull();

						setTimeout(() => {
							expect(loading.get()).toBeTruthy();

							setTimeout(() => {
								expect(loading.get()).toBeFalsy();
								done();
							}, 20);
						}, 1);
					}, 100);
				}, 20);
			}, 1);
		}, 10);
	});

	test('подписка через EventEmitter', () => {
		let emitter = new EventEmitter();
		let onFooChange = jest.fn();

		define(emitter, {
			foo: 1
		});

		emitter.on('change:foo', onFooChange);

		emitter.foo = 2;

		Cell.forceRelease();

		expect(onFooChange).toHaveBeenCalledTimes(1);
	});

	test('запись в вычисляемую ячейку', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1, { onChange() {} });

		b.set(5);

		expect(a.get()).toBe(1);
		expect(b.get()).toBe(5);
	});

	test('запись в вычисляемую ячейку (2)', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);

		b.set(5);

		expect(a.get()).toBe(1);
		expect(b.get()).toBe(5);
	});

	test('минимум вызовов pull (2)', () => {
		let a = new Cell({ x: 1 });
		let b = new Cell(() => a.get(), {
			onChange(evt) {
				if (evt.data.value.x) {
					c = new Cell(() => a.get().x);
				} else {
					c.dispose();
				}
			}
		});
		let getC = jest.fn(() => a.get().x);
		let c = new Cell(getC, { onChange() {} });

		a.set({ x: 0 });

		Cell.forceRelease();

		expect(getC).toHaveBeenCalledTimes(2);
	});

	test('инициализация устанавливаемым значением вычисляемой ячейки', () => {
		let a = new Cell(() => 1);
		let b = new Cell(2);

		a.set(5);
		b.set(5);

		expect(a.get()).toEqual(5);
	});

	test('инициализация устанавливаемым значением вычисляемой ячейки (2)', () => {
		let a = new Cell(() => 1);
		let b = new Cell(2);

		a.set(5);
		b.set(5);

		a.addChangeListener(() => {});

		expect(a.get()).toBe(5);
	});

	test('рекурсивный релиз при чтении в обработчике', done => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(() => a.get(), {
			debugKey: 'b',
			onChange() {
				expect(c.get()).toBe(2);
				done();
			}
		});
		let c = new Cell(() => b.get(), { debugKey: 'c', onChange() {} });

		a.set(2);
	});

	test('pull при чтении в обработчике', done => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(() => a.get(), {
			debugKey: 'b',
			onChange() {
				expect(c.get()).toBe(2);
				done();
			}
		});
		let c = new Cell(() => a.get(), { debugKey: 'c' });

		c.get();
		a.set(2);
	});

	test('правильный next в pull', done => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(
			(cell, next) => {
				if (a.get() == 2) {
					expect(next).toBe(5);
				}

				return a.get();
			},
			{
				debugKey: 'b',
				onChange(evt) {
					expect(evt).toEqual({
						type: 'change',
						target: b,
						data: {
							prevEvent: {
								type: 'change',
								target: b,
								data: {
									prevEvent: null,
									prevValue: 1,
									value: 5
								}
							},
							prevValue: 5,
							value: 2
						}
					});

					done();
				}
			}
		);

		b.set(5);
		a.set(2);
	});

	test('чтение пассивной ячейки зависимой от активной после её изменения', () => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(() => a.get(), { debugKey: 'b', onChange() {} });
		let c = new Cell(() => a.get(), { debugKey: 'c' });

		let cOnChange = () => {};

		c.addChangeListener(cOnChange);
		c.removeChangeListener(cOnChange);

		a.set(2);

		expect(c.get()).toBe(2);
	});

	test('#reap()', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get(), { onChange() {} });
		let c = new Cell(() => a.get(), { onChange() {} });

		a.reap();
	});

	test('#reap() (2)', () => {
		let a = new Cell(true);
		let b = new Cell(1);

		let cOnChange = jest.fn();
		let c = new Cell(() => a.get() && b.get(), { onChange: cOnChange });

		a.set(false);
		b.reap();

		a.set(true);

		Cell.forceRelease();

		expect(cOnChange).toHaveBeenCalledTimes(2);
	});
});
