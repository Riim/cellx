describe('Cell', function() {

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

		let cFormulaSpy = sinon.spy(function() {
			return a.get() + b.get();
		});

		let c = new cellx.Cell(cFormulaSpy, { onChange: function() {} });

		setTimeout(function() {
			expect(cFormulaSpy.calledOnce)
				.to.be.ok;

			expect(cFormulaSpy.firstCall.args.length)
				.to.equal(0);

			expect(cFormulaSpy.firstCall.returnValue)
				.to.equal(3);

			done();
		}, 1);
	});

	it('должна вычисляться только 1 раз, даже если поменять сразу несколько родительских ячеек', function(done) {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);

		let cFormulaSpy = sinon.spy(function() {
			return a.get() + b.get();
		});

		let c = new cellx.Cell(cFormulaSpy, { onChange: function() {} });

		setTimeout(function() {
			cFormulaSpy.reset();

			a.set(5);
			b.set(10);

			setTimeout(function() {
				expect(cFormulaSpy.calledOnce)
					.to.be.ok;

				expect(cFormulaSpy.firstCall.args.length)
					.to.equal(0);

				expect(cFormulaSpy.firstCall.returnValue)
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

		let cFormulaSpy = sinon.spy(function() {
			return aa.get() + bb.get();
		});

		let c = new cellx.Cell(cFormulaSpy, { onChange: function() {} });

		setTimeout(function() {
			cFormulaSpy.reset();

			a.set(5);
			b.set(10);

			setTimeout(function() {
				expect(cFormulaSpy.calledOnce)
					.to.be.ok;

				expect(cFormulaSpy.firstCall.args.length)
					.to.equal(0);

				expect(cFormulaSpy.firstCall.returnValue)
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
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);

		let t = 0;
		let aa = new cellx.Cell(function() {
			if (t++) {
				b.set(10);
			}

			return a.get() + 1;
		}, { onChange: function() {} });

		let bb = new cellx.Cell(function() {
			return b.get() + 1;
		}, { onChange: function() {} });

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
		let d = new cellx.Cell(function() {
			return c.get() + 1;
		});

		a.set(2);

		expect(d.get())
			.to.equal(13);
	});

	it('не должна вызывать обработчик `change` при добавлении его после изменения', function(done) {
		let aChangeSpy = sinon.spy();

		let a = new cellx.Cell(1, { onChange: function() {} });

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

	// Возможность хитробага.
	// Если в get устанавливать _level раньше запуска _tryFormula,
	// то на уровнях 2+ _level будет всегда 1, что уже неверно.
	// Дальше если, при перерасчёте ячейки с неверным _level,
	// доходит до проверки "level > oldLevel" (для этого нужно чтобы как-то поменялись ведущие ячейки),
	// то её формула посчитается лишний второй раз.
	it('должна правильно вычислять _level в пассивном режиме', function(done) {
		let a = new cellx.Cell(1);
		let b = new cellx.Cell(2);

		let c = new cellx.Cell(function() { return a.get() + 1; });

		let dFormulaSpy = sinon.spy(function() {
			return c.get() + (c.get() == 2 ? 1 : b.get());
		});

		let d = new cellx.Cell(dFormulaSpy);

		d.on('change', function() {});

		dFormulaSpy.reset();

		a.set(2);

		setTimeout(function() {
			expect(dFormulaSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

});
