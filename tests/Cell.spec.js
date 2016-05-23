describe('Cell', function() {

	function noop() {}

	it('не должна создавать событие `change` при установке значения равного текущему', function(done) {
		let changeSpy = sinon.spy();
		let a = new cellx.Cell(1, { onChange: changeSpy });

		a.set(1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change` при установке значения равного текущему (NaN)', function(done) {
		let changeSpy = sinon.spy();
		let a = new cellx.Cell(NaN, { onChange: changeSpy });

		a.set(NaN);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если вычесляемое значение не меняется (NaN)', function(done) {
		let changeSpy = sinon.spy();

		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() {
			return a.get() + NaN;
		}, { onChange: changeSpy });

		a.set(2);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если установить новое значение и сразу вернуть исходное', function(done) {
		let changeSpy = sinon.spy();
		let a = new cellx.Cell(1, { onChange: changeSpy });

		a.set(5);
		a.set(1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			expect(a.get())
				.to.equal(1);

			done();
		}, 1);
	});

	it('не должна создавать событие `change` если установить новое значение и сразу вернуть исходное (2)', function(done) {
		let emitter1 = new cellx.EventEmitter();
		let emitter2 = new cellx.EventEmitter();

		let changeSpy = sinon.spy();
		let a = new cellx.Cell(emitter1, { onChange: changeSpy });

		a.set(emitter2);
		a.set(emitter1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если установить новое значение, изменить его (внутреннее изменение) и вернуть исходное значение', function(done) {
		let emitter1 = new cellx.EventEmitter();
		let emitter2 = new cellx.EventEmitter();

		let changeSpy = sinon.spy();
		let a = new cellx.Cell(emitter1, { onChange: changeSpy });

		a.set(emitter2);

		emitter2.emit('change');

		a.set(emitter1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('должна создавать событие `change`, если измененить текущее значение (внутреннее изменение), установить новое значение и сразу вернуть исходное', function(done) {
		let emitter1 = new cellx.EventEmitter();
		let emitter2 = new cellx.EventEmitter();

		let changeSpy = sinon.spy();
		let a = new cellx.Cell(emitter1, { onChange: changeSpy });

		emitter1.emit('change');

		a.set(emitter2);
		a.set(emitter1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

	it('при инициализации должна вычисляться только 1 раз, даже если родительских ячеек больше одной', function(done) {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);

		let cPullSpy = sinon.spy(function() {
			return a.get() + b.get();
		});

		let c = new cellx.Cell(cPullSpy, { onChange() {} });

		setTimeout(function() {
			expect(cPullSpy.calledOnce)
				.to.be.ok;

			expect(cPullSpy.firstCall.returnValue)
				.to.equal(3);

			done();
		}, 1);
	});

	it('должна вычисляться только 1 раз, даже если поменять сразу несколько родительских ячеек', function(done) {
		let a = new cellx.Cell(1, { debugKey: 'a' });
		let b = new cellx.Cell(2, { debugKey: 'b' });

		let cPullSpy = sinon.spy(function() {
			return a.get() + b.get();
		});

		let c = new cellx.Cell(cPullSpy, {
			debugKey: 'c',
			onChange() {}
		});

		setTimeout(function() {
			cPullSpy.reset();

			a.set(5);
			b.set(10);

			setTimeout(function() {
				expect(cPullSpy.calledOnce)
					.to.be.ok;

				expect(cPullSpy.firstCall.returnValue)
					.to.equal(15);

				done();
			}, 1);
		}, 1);
	});

	it('должна вычисляться только 1 раз, даже если поменять сразу несколько родительских ячеек (2)', function(done) {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);
		let aa = new cellx.Cell(function() { return a.get() + 1; });
		let bb = new cellx.Cell(function() { return b.get() + 1; });

		let cPullSpy = sinon.spy(function() {
			return aa.get() + bb.get();
		});

		let c = new cellx.Cell(cPullSpy, { onChange() {} });

		setTimeout(function() {
			cPullSpy.reset();

			a.set(5);
			b.set(10);

			setTimeout(function() {
				expect(cPullSpy.calledOnce)
					.to.be.ok;

				expect(cPullSpy.firstCall.returnValue)
					.to.equal(17);

				done();
			}, 1);
		}, 1);
	});

	it('не должна отменять событие `change` при чтении пока событие запланировано', function(done) {
		let aChangeSpy = sinon.spy(function() {
			let bValue = b.get();
		});
		let bChangeSpy = sinon.spy(function() {
			let cValue = c.get();
		});
		let cChangeSpy = sinon.spy(function() {
			let aValue = a.get();
		});

		let a = new cellx.Cell(1, { onChange: aChangeSpy });
		let b = new cellx.Cell(2, { onChange: bChangeSpy });
		let c = new cellx.Cell(3, { onChange: cChangeSpy });

		setTimeout(function() {
			a.set(5);
			b.set(10);
			c.set(15);

			setTimeout(function() {
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

	it('один поток не должен мешать другому', function() {
		let a = new cellx.Cell(1, { debugKey: 'a' });
		let b = new cellx.Cell(2, { debugKey: 'b' });

		let t = 0;
		let aa = new cellx.Cell(function() {
			if (t++) {
				b.set(10);
			}

			return a.get() + 1;
		}, { debugKey: 'aa', onChange() {} });

		let bb = new cellx.Cell(function() {
			return b.get() + 1;
		}, { debugKey: 'bb', onChange() {} });

		a.set(5);

		expect(aa.get())
			.to.equal(6);
	});

	it('должна правильно вычисляться при записи в родительскую ячейку в формуле', function() {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() {
			return a.get() + 1;
		});
		let c = new cellx.Cell(function() {
			if (b.get() == 3) {
				a.set(10);
			}

			return b.get() + 1;
		});

		a.set(2);

		expect(c.get())
			.to.equal(12);
	});

	it('не должна вызывать обработчик `change` при добавлении его после изменения', function(done) {
		let aChangeSpy = sinon.spy();
		let a = new cellx.Cell(1, { onChange: noop });

		a.set(2);

		a.on('change', aChangeSpy);

		setTimeout(function() {
			expect(aChangeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('должна применять изменения при чтении вычисляемой ячейки', function() {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() { return a.get() + 1; });

		a.set(2);

		expect(b.get())
			.to.equal(3);
	});

	it('не должна применять изменения при чтении невычисляемой ячейки', function(done) {
		let cChangeSpy = sinon.spy();

		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);
		let c = new cellx.Cell(function() { return a.get() + b.get(); }, { onChange: cChangeSpy });

		a.set(2);
		b.get();

		expect(cChangeSpy.called)
			.to.not.be.ok;

		setTimeout(function() {
			expect(cChangeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна распространять ошибку потомкам без дублирования', function(done) {
		let bErrorSpy = sinon.spy();
		let c1ErrorSpy = sinon.spy();
		let c2ErrorSpy = sinon.spy();
		let dErrorSpy = sinon.spy();

		let a = new cellx.Cell(1);

		let t = 0;
		let b = new cellx.Cell(function() {
			if (t++) {
				throw 1;
			}

			return a.get() + 1;
		}, { onError: bErrorSpy });

		let c1 = new cellx.Cell(function() { return b.get() + 1; }, { onError: c1ErrorSpy });
		let c2 = new cellx.Cell(function() { return b.get() + 1; }, { onError: c2ErrorSpy });
		let d = new cellx.Cell(function() { return c1.get() + c2.get(); }, { onError: dErrorSpy });

		a.set(2);

		setTimeout(function() {
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

	// Если в get устанавливать _level раньше запуска _tryPull,
	// то на уровнях 2+ _level всегда будет 1, что как-то не очень хорошо.
	it('должна минимизировать число лишних вызовов pull', function(done) {
		let a = new cellx.Cell(1, { debugKey: 'a' });
		let b = new cellx.Cell(2, { debugKey: 'b' });

		let c = new cellx.Cell(function() {
			return b.get() + 1;
		}, { debugKey: 'c' });

		let dPullSpy = sinon.spy(function() {
			return a.get() + c.get();
		});

		let d = new cellx.Cell(dPullSpy, { debugKey: 'd' });

		d.on('change', noop);

		dPullSpy.reset();

		a.set(2);
		b.set(3);

		setTimeout(function() {
			expect(dPullSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна минимизировать число лишних вызовов pull (2)', function(done) {
		let a = new cellx.Cell(1, { debugKey: 'a' });
		let b = new cellx.Cell(function() { return a.get() + 1; }, { debugKey: 'b', onChange: noop });

		let c = new cellx.Cell(function() {
			if (a.get() == 2) {
				return b.get() + 1;
			}

			return a.get() + 1;
		}, {
			debugKey: 'c',
			onChange: function() {
				d.set(10);
			}
		});
		let d = new cellx.Cell(function() { return c.get() + 1; }, { debugKey: 'd' });
		let e = new cellx.Cell(function() { return c.get() + 1; }, { debugKey: 'e' });

		let fChangeSpy = sinon.spy(function() {
			return d.get() + e.get();
		});

		let f = new cellx.Cell(fChangeSpy, { debugKey: 'f', onChange: noop });

		fChangeSpy.reset();

		a.set(2);

		setTimeout(function() {
			expect(fChangeSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

	it('должна учитывать последний set как более приоритетный', function() {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() { return a.get() + 1; });
		let c = new cellx.Cell(function() { return b.get() + 1; }, { onChange: noop });

		a.set(2);
		b.set(4);

		expect(c.get())
			.to.equal(5);
	});

	it('должна учитывать последний set как более приоритетный (2)', function() {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() { return a.get() + 1; });
		let c = new cellx.Cell(function() { return b.get() + 1; }, { onChange: noop });

		b.set(4);
		a.set(2);

		expect(c.get())
			.to.equal(4);
	});

	it('должна учитывать последний set как более приоритетный (3)', function() {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() { return a.get() + 1; });
		let c = new cellx.Cell(function() { return b.get() + 1; }, { onChange: noop });

		a.set(2);
		b.set(2);

		expect(c.get())
			.to.equal(3);
	});

	it('не должна создавать бесконечный цикл', function(done) {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() { return a.get() + 1; });
		let c = new cellx.Cell(function() { return b.get() + 1; });

		let d = new cellx.Cell(1);
		let e = new cellx.Cell(function() { return c.get() + d.get(); }, { onChange: noop });

		c.get();

		d.set(2);

		setTimeout(function() {
			expect(e.get())
				.to.equal(5);

			done();
		}, 1);
	});

	it('не должна создавать бесконечный цикл (2)', function(done) {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(function() { return a.get() + 1; }, {
			onChange() {
				c.set(2);
			}
		});

		let c = new cellx.Cell(1, { onChange: noop });

		a.set(2);

		setTimeout(function() {
			expect(c.get())
				.to.equal(2);

			done();
		}, 1);
	});

	it('должна уметь синхронизировать своё значение с внешним хранилищем', function() {
		localStorage.clear();

		let a = new cellx.Cell(function() {
			return +(localStorage.a || 1);
		}, {
			put(value) {
				localStorage.a = value;
				this.push(value);
			}
		});

		let b = new cellx.Cell(function() {
			return a.get() + 1;
		});

		expect(b.get())
			.to.equal(2);

		a.set(5);

		expect(b.get())
			.to.equal(6);
	});

	it('validation', function() {
		let a = new cellx.Cell(1, {
			validate: function(value) {
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

	it('#subscribe(), #unsubscribe()', function() {
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

	it('#then', function(done) {
		let a = new cellx.Cell(function(push) {
			setTimeout(function() {
				push(5);
			}, 1);
		});

		a.then(function(value) {
			expect(value)
				.to.equal(5);

			expect(a.get())
				.to.equal(5);

			done();
		});
	});

	it('#catch', function(done) {
		let a = new cellx.Cell(function(push, fail) {
			setTimeout(function() {
				fail('5');
			}, 1);
		});

		a.catch(function(err) {
			expect(err.message)
				.to.equal('5');

			expect(a.getError())
				.to.equal(err);

			done();
		});
	});

});
