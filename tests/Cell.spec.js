describe('Cell', () => {

	function noop() {}

	it('.afterRelease', done => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; }, { onChange: noop });

		a.set(2);

		let afterReleaseSpy = sinon.spy();

		cellx.Cell.afterRelease(afterReleaseSpy);

		setTimeout(() => {
			expect(afterReleaseSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

	it('#pull()', done => {
		let counter = 0;
		let a = new cellx.Cell(() => {
			return ++counter;
		});

		let changeSpy = sinon.spy();
		let b = new cellx.Cell(() => {
			return a.get() + 1;
		}, { onChange: changeSpy });

		a.pull();

		setTimeout(() => {
			expect(changeSpy.calledOnce)
				.to.be.ok;

			expect(b.get())
				.to.equal(3);

			done();
		}, 1);
	});

	// Если в get устанавливать _level раньше запуска _tryPull,
	// то на уровнях 2+ _level всегда будет 1, что как-то не очень хорошо.
	it('должна минимизировать число лишних вызовов pull', done => {
		let a = new cellx.Cell(1, { debugKey: 'a' });
		let b = new cellx.Cell(2, { debugKey: 'b' });

		let c = new cellx.Cell(() => {
			return b.get() + 1;
		}, { debugKey: 'c' });

		let dPullSpy = sinon.spy(() => {
			return a.get() + c.get();
		});

		let d = new cellx.Cell(dPullSpy, { debugKey: 'd' });

		d.on('change', noop);

		dPullSpy.reset();

		a.set(2);
		b.set(3);

		setTimeout(() => {
			expect(dPullSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change` при установке значения равного текущему', done => {
		let changeSpy = sinon.spy();
		let a = new cellx.Cell(1, { onChange: changeSpy });

		a.set(1);

		setTimeout(() => {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change` при установке значения равного текущему (NaN)', done => {
		let changeSpy = sinon.spy();
		let a = new cellx.Cell(NaN, { onChange: changeSpy });

		a.set(NaN);

		setTimeout(() => {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если вычесляемое значение не меняется (NaN)', done => {
		let changeSpy = sinon.spy();

		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => {
			return a.get() + NaN;
		}, { onChange: changeSpy });

		a.set(2);

		setTimeout(() => {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если установить новое значение и сразу вернуть исходное', done => {
		let changeSpy = sinon.spy();
		let a = new cellx.Cell(1, { onChange: changeSpy });

		a.set(5);
		a.set(1);

		setTimeout(() => {
			expect(changeSpy.called)
				.to.not.be.ok;

			expect(a.get())
				.to.equal(1);

			done();
		}, 1);
	});

	it('не должна создавать событие `change` если установить новое значение и сразу вернуть исходное (2)', done => {
		let emitter1 = new cellx.EventEmitter();
		let emitter2 = new cellx.EventEmitter();

		let changeSpy = sinon.spy();
		let a = new cellx.Cell(emitter1, { onChange: changeSpy });

		a.set(emitter2);
		a.set(emitter1);

		setTimeout(() => {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('должна подписываться на внутренние изменения значения-EventEmitter-а и эмиттить их на себе', done => {
		let emitter = new cellx.EventEmitter();

		let changeSpy = sinon.spy();
		let a = new cellx.Cell(emitter, { onChange: changeSpy });

		emitter.emit('change');

		setTimeout(() => {
			expect(changeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна подписываться на внутренние изменения значения-EventEmitter-а и эмиттить их на себе (2)', done => {
		let emitter = new cellx.EventEmitter();

		let changeSpy = sinon.spy();

		let a = new cellx.Cell(emitter);
		let b = new cellx.Cell(() => {
			a.get();
			return Math.random();
		}, { onChange: changeSpy });

		emitter.emit('change');

		setTimeout(() => {
			expect(changeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если установить новое значение, изменить его (внутреннее изменение) и вернуть исходное значение', done => {
		let emitter1 = new cellx.EventEmitter();
		let emitter2 = new cellx.EventEmitter();

		let changeSpy = sinon.spy();
		let a = new cellx.Cell(emitter1, { onChange: changeSpy });

		a.set(emitter2);

		emitter2.emit('change');

		a.set(emitter1);

		setTimeout(() => {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('должна создавать событие `change`, если измененить текущее значение (внутреннее изменение), установить новое значение и сразу вернуть исходное', done => {
		let emitter1 = new cellx.EventEmitter();
		let emitter2 = new cellx.EventEmitter();

		let changeSpy = sinon.spy();
		let a = new cellx.Cell(emitter1, { onChange: changeSpy });

		emitter1.emit('change');

		a.set(emitter2);
		a.set(emitter1);

		setTimeout(() => {
			expect(changeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

	it('при инициализации должна вычисляться только 1 раз, даже если родительских ячеек больше одной', done => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);

		let cPullSpy = sinon.spy(() => {
			return a.get() + b.get();
		});

		let c = new cellx.Cell(cPullSpy, { onChange: noop });

		setTimeout(() => {
			expect(cPullSpy.calledOnce)
				.to.be.ok;

			expect(cPullSpy.firstCall.returnValue)
				.to.equal(3);

			done();
		}, 1);
	});

	it('должна вычисляться только 1 раз, даже если поменять сразу несколько родительских ячеек', done => {
		let a = new cellx.Cell(1, { debugKey: 'a' });
		let b = new cellx.Cell(2, { debugKey: 'b' });

		let cPullSpy = sinon.spy(() => {
			return a.get() + b.get();
		});

		let c = new cellx.Cell(cPullSpy, {
			debugKey: 'c',
			onChange: noop
		});

		setTimeout(() => {
			cPullSpy.reset();

			a.set(5);
			b.set(10);

			setTimeout(() => {
				expect(cPullSpy.calledOnce)
					.to.be.ok;

				expect(cPullSpy.firstCall.returnValue)
					.to.equal(15);

				done();
			}, 1);
		}, 1);
	});

	it('должна вычисляться только 1 раз, даже если поменять сразу несколько родительских ячеек (2)', done => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);
		let aa = new cellx.Cell(() => { return a.get() + 1; });
		let bb = new cellx.Cell(() => { return b.get() + 1; });

		let cPullSpy = sinon.spy(() => {
			return aa.get() + bb.get();
		});

		let c = new cellx.Cell(cPullSpy, { onChange: noop });

		setTimeout(() => {
			cPullSpy.reset();

			a.set(5);
			b.set(10);

			setTimeout(() => {
				expect(cPullSpy.calledOnce)
					.to.be.ok;

				expect(cPullSpy.firstCall.returnValue)
					.to.equal(17);

				done();
			}, 1);
		}, 1);
	});

	it('не должна отменять событие `change` при чтении пока событие запланировано', done => {
		let aChangeSpy = sinon.spy(() => {
			let bValue = b.get();
		});
		let bChangeSpy = sinon.spy(() => {
			let cValue = c.get();
		});
		let cChangeSpy = sinon.spy(() => {
			let aValue = a.get();
		});

		let a = new cellx.Cell(1, { onChange: aChangeSpy });
		let b = new cellx.Cell(2, { onChange: bChangeSpy });
		let c = new cellx.Cell(3, { onChange: cChangeSpy });

		setTimeout(() => {
			a.set(5);
			b.set(10);
			c.set(15);

			setTimeout(() => {
				expect(aChangeSpy.calledOnce)
					.to.be.ok;

				expect(bChangeSpy.calledOnce)
					.to.be.ok;

				expect(cChangeSpy.calledOnce)
					.to.be.ok;

				done();
			}, 1);
		}, 1);
	});

	it('должна правильно вычисляться при записи в родительскую ячейку в формуле', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => {
			return a.get() + 1;
		});
		let c = new cellx.Cell(() => {
			if (b.get() == 3) {
				a.set(10);
			}

			return b.get() + 1;
		});

		a.set(2);

		expect(c.get())
			.to.equal(12);
	});

	it('не должна вызывать обработчик `change` при добавлении его после изменения', done => {
		let aChangeSpy = sinon.spy();
		let a = new cellx.Cell(1, { onChange: noop });

		a.set(2);

		a.on('change', aChangeSpy);

		setTimeout(() => {
			expect(aChangeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('должна применять изменения при чтении вычисляемой ячейки', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; });

		a.set(2);

		expect(b.get())
			.to.equal(3);
	});

	it('не должна применять изменения при чтении невычисляемой ячейки', done => {
		let cChangeSpy = sinon.spy();

		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);
		let c = new cellx.Cell(() => { return a.get() + b.get(); }, { onChange: cChangeSpy });

		a.set(2);
		b.get();

		expect(cChangeSpy.called)
			.to.not.be.ok;

		setTimeout(() => {
			expect(cChangeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна распространять ошибку потомкам без дублирования', done => {
		let bErrorSpy = sinon.spy();
		let c1ErrorSpy = sinon.spy();
		let c2ErrorSpy = sinon.spy();
		let dErrorSpy = sinon.spy();

		let a = new cellx.Cell(1);

		let t = 0;
		let b = new cellx.Cell(() => {
			if (t++) {
				throw 1;
			}

			return a.get() + 1;
		}, { onError: bErrorSpy });

		let c1 = new cellx.Cell(() => { return b.get() + 1; }, { onError: c1ErrorSpy });
		let c2 = new cellx.Cell(() => { return b.get() + 1; }, { onError: c2ErrorSpy });
		let d = new cellx.Cell(() => { return c1.get() + c2.get(); }, { onError: dErrorSpy });

		a.set(2);

		setTimeout(() => {
			expect(bErrorSpy.calledOnce)
				.to.be.ok;

			expect(c1ErrorSpy.calledOnce)
				.to.be.ok;

			expect(c2ErrorSpy.calledOnce)
				.to.be.ok;

			expect(dErrorSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна учитывать последний set как более приоритетный', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; });
		let c = new cellx.Cell(() => { return b.get() + 1; }, { onChange: noop });

		a.set(2);
		b.set(4);

		expect(c.get())
			.to.equal(5);
	});

	it('должна учитывать последний set как более приоритетный (2)', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; });
		let c = new cellx.Cell(() => { return b.get() + 1; }, { onChange: noop });

		b.set(4);
		a.set(2);

		expect(c.get())
			.to.equal(4);
	});

	it('должна учитывать последний set как более приоритетный (3)', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; });
		let c = new cellx.Cell(() => { return b.get() + 1; }, { onChange: noop });

		a.set(2);
		b.set(2);

		expect(c.get())
			.to.equal(3);
	});

	it('должна учитывать последний set как более приоритетный (4)', () => {
		let counter = 0;
		let a = new cellx.Cell(() => ++counter);
		let b = new cellx.Cell(() => a.get() + 1);

		b.set(5);
		a.pull();

		expect(b.get())
			.to.equal(2);
	});

	it('должна учитывать последний set как более приоритетный (5)', () => {
		let counter = 0;
		let a = new cellx.Cell(() => ++counter, { onChange() {} });
		let b = new cellx.Cell(() => a.get() + 1, { onChange() {} });

		b.set(5);
		a.pull();

		expect(b.get())
			.to.equal(3);
	});

	it('не должна создавать бесконечный цикл', done => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; });
		let c = new cellx.Cell(() => { return b.get() + 1; });

		let d = new cellx.Cell(1);
		let e = new cellx.Cell(() => { return c.get() + d.get(); }, { onChange: noop });

		c.get();

		d.set(2);

		setTimeout(() => {
			expect(e.get())
				.to.equal(5);

			done();
		}, 1);
	});

	it('не должна создавать бесконечный цикл (2)', done => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; }, {
			onChange() {
				c.set(2);
			}
		});

		let c = new cellx.Cell(1, { onChange: noop });

		a.set(2);

		setTimeout(() => {
			expect(c.get())
				.to.equal(2);

			done();
		}, 1);
	});

	it('должна уметь синхронизировать своё значение с внешним хранилищем', () => {
		localStorage.clear();

		let a = new cellx.Cell(() => {
			return +(localStorage.a || 1);
		}, {
			put(cell, value) {
				localStorage.a = value;
				cell.push(value);
			}
		});

		let b = new cellx.Cell(() => {
			return a.get() + 1;
		});

		expect(b.get())
			.to.equal(2);

		a.set(5);

		expect(b.get())
			.to.equal(6);
	});

	it('validation', () => {
		let a = new cellx.Cell(1, {
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
			.to.not.equal(null);

		expect(a.get())
			.to.equal(1);
	});

	it('#subscribe(), #unsubscribe()', () => {
		let a = new cellx.Cell(1);
		let changeSpy = sinon.spy();

		a.set(2);
		a.subscribe(changeSpy);
		a.set(3);
		a.unsubscribe(changeSpy);
		a.set(4);

		expect(changeSpy.calledOnce)
			.to.be.ok;

		expect(changeSpy.firstCall.args)
			.to.eql([null, {
				type: 'change',
				target: a,
				oldValue: 2,
				value: 3,
				prev: null
			}]);
	});

	it('#subscribe(), #unsubscribe() (2)', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => { return a.get() + 1; });
		let bChangeSpy = sinon.spy();

		a.set(2);
		b.subscribe(bChangeSpy);
		a.set(3);
		b.unsubscribe(bChangeSpy);
		a.set(4);

		expect(bChangeSpy.calledOnce)
			.to.be.ok;

		expect(bChangeSpy.firstCall.args)
			.to.eql([null, {
				type: 'change',
				target: b,
				oldValue: 3,
				value: 4,
				prev: null
			}]);
	});

	it('[options.reap]', () => {
		let aReapSpy = sinon.spy();
		let a = new cellx.Cell(() => Math.random(), { debugKey: 'a', reap: aReapSpy });
		let b = new cellx.Cell(() => a.get() + 1, { debugKey: 'b' });

		let listener = () => {};

		b.on('change', listener);
		b.off('change', listener);

		expect(aReapSpy.calledOnce)
			.to.be.ok;
	});

	it('#then()', done => {
		let a = new cellx.Cell(cell => {
			setTimeout(() => {
				cell.push(5);
			}, 1);
		});

		a.then(value => {
			expect(value)
				.to.equal(5);

			expect(a.get())
				.to.equal(5);

			done();
		});
	});

	it('#then() 2', done => {
		let a = new cellx.Cell(1);

		a.then(value => {
			expect(value)
				.to.equal(1);

			expect(a.get())
				.to.equal(1);

			done();
		});
	});

	it('#then() 3', done => {
		let a = new cellx.Cell(cell => {
			setTimeout(() => {
				cell.push(5);
			}, 1);
		});
		let b = new cellx.Cell(() => {
			return a.get() + 1;
		});

		b.then(value => {
			expect(value)
				.to.equal(6);

			expect(a.get())
				.to.equal(5);

			done();
		});
	});

	it('#catch()', done => {
		let a = new cellx.Cell(cell => {
			setTimeout(() => {
				cell.fail('5');
			}, 1);
		});

		a.catch(err => {
			expect(err.message)
				.to.equal('5');

			expect(a.getError())
				.to.equal(err);

			done();
		});
	});

	it('#isPending()', done => {
		let cChangeSpy = sinon.spy();
		let loadingChangeSpy = sinon.spy();

		let a = new cellx.Cell((cell, next) => {
			setTimeout(() => {
				cell.push(Math.random());
			}, 10);

			return next || 0;
		});
		let b = new cellx.Cell((cell, next) => {
			setTimeout(() => {
				cell.push(Math.random());
			}, 50);

			return next || 0;
		});

		let c = new cellx.Cell(() => {
			return a.get() + b.get();
		}, { onChange: cChangeSpy });

		let loading = new cellx.Cell(() => {
			return a.isPending() || b.isPending();
		}, { onChange: loadingChangeSpy });

		setTimeout(() => {
			expect(c.get())
				.to.equal(0);

			expect(loading.get())
				.to.equal(true);

			expect(cChangeSpy.called)
				.to.not.be.ok;

			expect(loadingChangeSpy.called)
				.to.not.be.ok;

			setTimeout(() => {
				expect(c.get())
					.to.not.equal(0);

				expect(loading.get())
					.to.equal(true);

				expect(cChangeSpy.called)
					.to.be.ok;

				expect(loadingChangeSpy.called)
					.to.not.be.ok;

				setTimeout(() => {
					expect(loading.get())
						.to.equal(false);

					a.pull();

					setTimeout(() => {
						expect(loading.get())
							.to.equal(true);

						setTimeout(() => {
							expect(loading.get())
								.to.equal(false);

							done();
						}, 20);
					}, 1);
				}, 100);
			}, 20);
		}, 1);
	});

	it('должна подписывать через EventEmitter', done => {
		let emitter = new cellx.EventEmitter();
		let changeSpy = sinon.spy();

		cellx.define(emitter, {
			foo: 1
		});

		emitter.on('change:foo', changeSpy);

		emitter.foo = 2;

		setTimeout(() => {
			expect(changeSpy.calledOnce)
				.to.be.ok;

			expect(changeSpy.firstCall.calledOn(emitter))
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна поддерживать перебор for-of-ом', () => {
		let list = new cellx.Cell(cellx.list([1, 2, 3]));
		let result = [];

		for (let value of list) {
			result.push(value);
		}

		expect(result)
			.to.eql([1, 2, 3]);
	});

	it('должна позволять запись даже если является вычисляемой', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => a.get() + 1, { onChange: noop });

		b.set(5);

		expect(a.get())
			.to.eql(1);
		expect(b.get())
			.to.eql(5);
	});

	it('должна позволять запись даже если является вычисляемой 2', () => {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(() => a.get() + 1);

		b.set(5);

		expect(a.get())
			.to.eql(1);
		expect(b.get())
			.to.eql(5);
	});

	it('должна минимизировать число лишних вызовов pull (3)', done => {
		let a = new cellx.Cell({ x: 1 });
		let b = new cellx.Cell(() => a.get(), { onChange(evt) {
			if (evt.value) {
				c = new cellx.Cell(() => a.get().x);
			} else {
				c.dispose();
			}
		} });
		let cPullSpy = sinon.spy(() => a.get().x);
		let c = new cellx.Cell(cPullSpy, { onChange: noop });

		a.set(null);

		setTimeout(() => {
			expect(cPullSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна инициализироваться устанавливаемым значением даже если вычисляемая', () => {
		let a = new cellx.Cell(() => {
			return 1;
		});
		let b = new cellx.Cell(2);

		a.set(5);
		b.set(5);

		expect(a.get())
			.to.equal(5);
	});

	it('должна инициализироваться устанавливаемым значением даже если вычисляемая (2)', () => {
		let a = new cellx.Cell(() => {
			return 1;
		});
		let b = new cellx.Cell(2);

		a.set(5);
		b.set(5);

		a.on('change', () => {});

		expect(a.get())
			.to.equal(5);
	});

});
