let { EventEmitter, ObservableList, Cell, define } = require('../dist/cellx');

describe('Cell', () => {

	test('.afterRelease()', (done) => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1, { onChange() {} });

		a.set(2);

		let afterReleaseCallback = jest.fn();

		Cell.afterRelease(afterReleaseCallback);

		setTimeout(() => {
			expect(afterReleaseCallback)
				.toHaveBeenCalledTimes(1);

			done();
		}, 1);
	});

	test('.afterRelease() (2)', (done) => {
		let a = new Cell(1);
		let b = new Cell(1);
		let c = new Cell(() => b.get(), { onChange() {} });

		a.on('change', () => {
			Cell.afterRelease(() => {
				expect(c.get())
					.toBe(2);

				done();
			});

			b.set(2);
		});

		a.set(2);
	});

	test('#pull()', (done) => {
		let counter = 0;
		let a = new Cell(() => {
			return ++counter;
		});

		let onChange = jest.fn();
		let b = new Cell(() => a.get() + 1, { onChange });

		a.pull();

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalledTimes(1);

			expect(b.get())
				.toBe(3);

			done();
		}, 1);
	});

	// Если в get устанавливать _level раньше запуска _tryPull,
	// то на уровнях 2+ _level всегда будет 1, что как-то не очень хорошо.
	test('минимизирует число лишних вызовов pull', (done) => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(2, { debugKey: 'b' });
		let c = new Cell(() => b.get() + 1, { debugKey: 'c' });

		let getD = jest.fn(() => a.get() + c.get());

		let d = new Cell(getD, { debugKey: 'd' });

		d.on('change', function() {});

		getD.mockReset();

		a.set(2);
		b.set(3);

		setTimeout(() => {
			expect(getD)
				.toHaveBeenCalledTimes(1);

			done();
		}, 1);
	});

	test('не создаёт событие `change` при установке значения равного текущему', (done) => {
		let onChange = jest.fn();
		let a = new Cell(1, { onChange });

		a.set(1);

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalledTimes(0);

			done();
		}, 1);
	});

	test('не создаёт событие `change` при установке значения равного текущему (NaN)', (done) => {
		let onChange = jest.fn();
		let a = new Cell(NaN, { onChange });

		a.set(NaN);

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalledTimes(0);

			done();
		}, 1);
	});

	test('не создаёт событие `change`, если вычесляемое значение не меняется (NaN)', (done) => {
		let onChange = jest.fn();

		let a = new Cell(1);
		let b = new Cell(() => a.get() + NaN, { onChange });

		a.set(2);

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalledTimes(0);

			done();
		}, 1);
	});

	test('не создаёт событие `change`, если установить новое значение и сразу вернуть исходное', (done) => {
		let onChange = jest.fn();
		let a = new Cell(1, { onChange });

		a.set(5);
		a.set(1);

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalledTimes(0);

			expect(a.get())
				.toBe(1);

			done();
		}, 1);
	});

	test('не создаёт событие `change` если установить новое значение и сразу вернуть исходное (2)', (done) => {
		let emitter1 = new EventEmitter();
		let emitter2 = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter1, { onChange });

		a.set(emitter2);
		a.set(emitter1);

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalledTimes(0);

			done();
		}, 1);
	});

	test('подписывается на внутренние изменения значения-EventEmitter-а и эмиттит их на себе', (done) => {
		let emitter = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter, { onChange });

		emitter.emit('change');

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalled();

			done();
		}, 1);
	});

	test('подписывается на внутренние изменения значения-EventEmitter-а и эмиттит их на себе (2)', (done) => {
		let emitter = new EventEmitter();

		let onChange = jest.fn();

		let a = new Cell(emitter);
		let b = new Cell(() => {
			a.get();
			return Math.random();
		}, { onChange });

		emitter.emit('change');

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalled();

			done();
		}, 1);
	});

	test('не создаёт событие `change`, если установить новое значение, изменить его (внутреннее изменение) и вернуть исходное значение', (done) => {
		let emitter1 = new EventEmitter();
		let emitter2 = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter1, { onChange });

		a.set(emitter2);

		emitter2.emit('change');

		a.set(emitter1);

		setTimeout(() => {
			expect(onChange)
				.not.toHaveBeenCalled();

			done();
		}, 1);
	});

	test('создаёт событие `change`, если измененить текущее значение (внутреннее изменение), установить новое значение и сразу вернуть исходное', (done) => {
		let emitter1 = new EventEmitter();
		let emitter2 = new EventEmitter();

		let onChange = jest.fn();
		let a = new Cell(emitter1, { onChange });

		emitter1.emit('change');

		a.set(emitter2);
		a.set(emitter1);

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalled();

			done();
		}, 1);
	});

	test('при инициализации вычисляется только 1 раз, даже если родительских ячеек больше одной', (done) => {
		let a = new Cell(1);
		let b = new Cell(2);

		let getC = jest.fn(() => a.get() + b.get());

		let c = new Cell(getC, { onChange() {} });

		setTimeout(() => {
			expect(getC)
				.toHaveBeenCalledTimes(1);

			done();
		}, 1);
	});

	test('вычисляется только 1 раз, даже если поменять сразу несколько родительских ячеек', (done) => {
		let a = new Cell(1, { debugKey: 'a' });
		let b = new Cell(2, { debugKey: 'b' });

		let getC = jest.fn(() => a.get() + b.get());

		let c = new Cell(getC, {
			debugKey: 'c',
			onChange() {}
		});

		setTimeout(() => {
			getC.mockReset();

			a.set(5);
			b.set(10);

			setTimeout(() => {
				expect(getC)
					.toHaveBeenCalledTimes(1);

				done();
			}, 1);
		}, 1);
	});

	test('вычисляется только 1 раз, даже если поменять сразу несколько родительских ячеек (2)', (done) => {
		let a = new Cell(1);
		let b = new Cell(2);
		let aa = new Cell(() => a.get() + 1);
		let bb = new Cell(() => b.get() + 1);

		let getC = jest.fn(() => aa.get() + bb.get());

		let c = new Cell(getC, { onChange() {} });

		setTimeout(() => {
			getC.mockReset();

			a.set(5);
			b.set(10);

			setTimeout(() => {
				expect(getC)
					.toHaveBeenCalledTimes(1);

				done();
			}, 1);
		}, 1);
	});

	test('не отменяет событие `change` при чтении пока событие запланировано', (done) => {
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

		setTimeout(() => {
			a.set(5);
			b.set(10);
			c.set(15);

			setTimeout(() => {
				expect(aOnChange)
					.toHaveBeenCalledTimes(1);

				expect(bOnChange)
					.toHaveBeenCalledTimes(1);

				expect(cOnChange)
					.toHaveBeenCalledTimes(1);

				done();
			}, 1);
		}, 1);
	});

	test('правильно вычисляется при записи в родительскую ячейку в формуле', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => {
			if (b.get() == 3) {
				a.set(10);
			}

			return b.get() + 1;
		});

		a.set(2);

		expect(c.get())
			.toBe(12);
	});

	test('не вызывает обработчик `change` при добавлении его после изменения', (done) => {
		let onChange = jest.fn();
		let a = new Cell(1, { onChange() {} });

		a.set(2);

		a.on('change', onChange);

		setTimeout(() => {
			expect(onChange)
				.not.toHaveBeenCalled();

			done();
		}, 1);
	});

	test('применяет изменения при чтении вычисляемой ячейки', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);

		a.set(2);

		expect(b.get())
			.toBe(3);
	});

	test('не применяет изменения при чтении невычисляемой ячейки', (done) => {
		let onChange = jest.fn();

		let a = new Cell(1);
		let b = new Cell(2);
		let c = new Cell(() => a.get() + b.get(), { onChange });

		a.set(2);
		b.get();

		expect(onChange)
			.not.toHaveBeenCalled();

		setTimeout(() => {
			expect(onChange)
				.toHaveBeenCalled();

			done();
		}, 1);
	});

	test('распространяет ошибку потомкам без дублирования', (done) => {
		let bOnError = jest.fn();
		let c1OnError = jest.fn();
		let c2OnError = jest.fn();
		let dOnError = jest.fn();

		let a = new Cell(1);

		let t = 0;
		let b = new Cell(() => {
			if (t++) {
				throw 1;
			}

			return a.get() + 1;
		}, { onError: bOnError });

		let c1 = new Cell(() => b.get() + 1, { onError: c1OnError });
		let c2 = new Cell(() => b.get() + 1, { onError: c2OnError });
		let d = new Cell(() => c1.get() + c2.get(), { onError: dOnError });

		a.set(2);

		setTimeout(() => {
			expect(bOnError)
				.toHaveBeenCalledTimes(1);

			expect(c1OnError)
				.toHaveBeenCalledTimes(1);

			expect(c2OnError)
				.toHaveBeenCalledTimes(1);

			expect(dOnError)
				.toHaveBeenCalledTimes(1);

			done();
		}, 1);
	});

	test('учитывает последний set как более приоритетный', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1, { onChange() {} });

		a.set(2);
		b.set(4);

		expect(c.get())
			.toBe(5);
	});

	test('учитывает последний set как более приоритетный (2)', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1, { onChange() {} });

		b.set(4);
		a.set(2);

		expect(c.get())
			.toBe(4);
	});

	test('учитывает последний set как более приоритетный (3)', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1, { onChange() {} });

		a.set(2);
		b.set(2);

		expect(c.get())
			.toBe(3);
	});

	test('учитывает последний set как более приоритетный (4)', () => {
		let counter = 0;
		let a = new Cell(() => ++counter);
		let b = new Cell(() => a.get() + 1);

		b.set(5);
		a.pull();

		expect(b.get())
			.toBe(2);
	});

	test('учитывает последний set как более приоритетный (5)', () => {
		let counter = 0;
		let a = new Cell(() => ++counter, { onChange() {} });
		let b = new Cell(() => a.get() + 1, { onChange() {} });

		b.set(5);
		a.pull();

		expect(b.get())
			.toBe(3);
	});

	test('не создаёт бесконечный цикл', (done) => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);
		let c = new Cell(() => b.get() + 1);

		let d = new Cell(1);
		let e = new Cell(() => c.get() + d.get(), { onChange() {} });

		c.get();

		d.set(2);

		setTimeout(() => {
			expect(e.get())
				.toBe(5);

			done();
		}, 1);
	});

	test('не создаёт бесконечный цикл (2)', (done) => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1, {
			onChange() {
				c.set(2);
			}
		});

		let c = new Cell(1, { onChange() {} });

		a.set(2);

		setTimeout(() => {
			expect(c.get())
				.toBe(2);

			done();
		}, 1);
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

		expect(error)
			.not.toBe(null);

		expect(a.get())
			.toBe(1);
	});

	test('#subscribe(), #unsubscribe()', () => {
		let a = new Cell(1);
		let onChange = jest.fn();

		a.set(2);
		a.subscribe(onChange);
		a.set(3);
		a.unsubscribe(onChange);
		a.set(4);

		expect(onChange)
			.toHaveBeenCalledTimes(1);

		expect(onChange)
			.toHaveBeenCalledWith(null, {
				type: 'change',
				target: a,
				data: {
					oldValue: 2,
					value: 3,
					prev: null
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

		expect(onChange)
			.toHaveBeenCalledTimes(1);

		expect(onChange)
			.toHaveBeenCalledWith(null, {
				type: 'change',
				target: b,
				data: {
					oldValue: 3,
					value: 4,
					prev: null
				}
			});
	});

	test('[options.reap]', () => {
		let reap = jest.fn();
		let a = new Cell(() => Math.random(), { debugKey: 'a', reap });
		let b = new Cell(() => a.get() + 1, { debugKey: 'b' });

		let listener = () => {};

		b.on('change', listener);
		b.off('change', listener);

		expect(reap)
			.toHaveBeenCalledTimes(1);
	});

	test('#then()', (done) => {
		let a = new Cell((cell) => {
			setTimeout(() => {
				cell.push(5);
			}, 1);
		});

		a.then((value) => {
			expect(value)
				.toBe(5);

			expect(a.get())
				.toBe(5);

			done();
		});
	});

	test('#then() 2', (done) => {
		let a = new Cell(1);

		a.then((value) => {
			expect(value)
				.toBe(1);

			expect(a.get())
				.toBe(1);

			done();
		});
	});

	test('#then() 3', (done) => {
		let a = new Cell((cell) => {
			setTimeout(() => {
				cell.push(5);
			}, 1);
		});
		let b = new Cell(() => a.get() + 1);

		b.then((value) => {
			expect(value)
				.toBe(6);

			expect(a.get())
				.toBe(5);

			done();
		});
	});

	test('#catch()', (done) => {
		let a = new Cell((cell) => {
			setTimeout(() => {
				cell.fail('5');
			}, 1);
		});

		a.catch((err) => {
			expect(err.message)
				.toBe('5');

			expect(a.getError())
				.toBe(err);

			done();
		});
	});

	test('#isPending()', (done) => {
		let cOnChange = jest.fn();
		let loadingOnChange = jest.fn();

		let a = new Cell((cell, next) => {
			setTimeout(() => {
				cell.push(Math.random());
			}, 10);

			return next || 0;
		});
		let b = new Cell((cell, next) => {
			setTimeout(() => {
				cell.push(Math.random());
			}, 50);

			return next || 0;
		});

		let c = new Cell(() => a.get() + b.get(), { onChange: cOnChange });

		let loading = new Cell(() => a.isPending() || b.isPending(), { onChange: loadingOnChange });

		setTimeout(() => {
			expect(c.get())
				.toBe(0);

			expect(loading.get())
				.toBeTruthy();

			expect(cOnChange)
				.not.toHaveBeenCalled();

			expect(loadingOnChange)
				.not.toHaveBeenCalled();

			setTimeout(() => {
				expect(c.get())
					.not.toBe(0);

				expect(loading.get())
					.toBeTruthy();

				expect(cOnChange)
					.toHaveBeenCalled();

				expect(loadingOnChange)
					.not.toHaveBeenCalled();

				setTimeout(() => {
					expect(loading.get())
						.toBeFalsy();

					a.pull();

					setTimeout(() => {
						expect(loading.get())
							.toBeTruthy();

						setTimeout(() => {
							expect(loading.get())
								.toBeFalsy();

							done();
						}, 20);
					}, 1);
				}, 100);
			}, 20);
		}, 1);
	});

	test('подписывает через EventEmitter', (done) => {
		let emitter = new EventEmitter();
		let onFooChange = jest.fn();

		define(emitter, {
			foo: 1
		});

		emitter.on('change:foo', onFooChange);

		emitter.foo = 2;

		setTimeout(() => {
			expect(onFooChange)
				.toHaveBeenCalledTimes(1);

			done();
		}, 1);
	});

	test('поддерживает перебор for-of-ом', () => {
		let list = new Cell(new ObservableList([1, 2, 3]));
		let result = [];

		for (let value of list) {
			result.push(value);
		}

		expect(result)
			.toEqual([1, 2, 3]);
	});

	test('позволяет запись даже если является вычисляемой', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1, { onChange() {} });

		b.set(5);

		expect(a.get())
			.toBe(1);
		expect(b.get())
			.toBe(5);
	});

	test('позволяет запись даже если является вычисляемой 2', () => {
		let a = new Cell(1);
		let b = new Cell(() => a.get() + 1);

		b.set(5);

		expect(a.get())
			.toBe(1);
		expect(b.get())
			.toBe(5);
	});

	test('минимизирует число лишних вызовов pull (3)', (done) => {
		let a = new Cell({ x: 1 });
		let b = new Cell(() => a.get(), { onChange(evt) {
			if (evt.value) {
				c = new Cell(() => a.get().x);
			} else {
				c.dispose();
			}
		} });
		let getC = jest.fn(() => a.get().x);
		let c = new Cell(getC, { onChange() {} });

		a.set(null);

		setTimeout(() => {
			expect(getC)
				.toHaveBeenCalledTimes(1);

			done();
		}, 1);
	});

	test('инициализируется устанавливаемым значением даже если вычисляемая', () => {
		let a = new Cell(() => 1);
		let b = new Cell(2);

		a.set(5);
		b.set(5);

		expect(a.get())
			.toEqual(5);
	});

	test('инициализируется устанавливаемым значением даже если вычисляемая (2)', () => {
		let a = new Cell(() => 1);
		let b = new Cell(2);

		a.set(5);
		b.set(5);

		a.on('change', () => {});

		expect(a.get())
			.toBe(5);
	});

	test.skip('немедленно учитывает изменения внесённые во время релиза', () => {
		let cOnChange = jest.fn();

		let a = new Cell(1, { onChange() {} });
		let b = new Cell(() => a.get(), { onChange() {} });
		let c = new Cell(1);
		let d = new Cell(() => {
			if (c.get() > 1) {
				a.set(2);
			}

			return c.get();
		});

		c.set(2);

		expect(b.get())
			.toBe(2);

		expect(cOnChange)
			.toHaveBeenCalledTimes(1);
	});

});
