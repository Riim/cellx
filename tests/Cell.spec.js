describe('Cell', function() {

	it('не должна создавать событие `change` при установке значения равного текущему', function(done) {
		var changeSpy = sinon.spy();
		var a = new cellx.Cell(1, { onChange: changeSpy });

		a.set(1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change` при установке значения равного текущему (NaN)', function(done) {
		var changeSpy = sinon.spy();
		var a = new cellx.Cell(NaN, { onChange: changeSpy });

		a.set(NaN);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если вычесляемое значение не меняется (NaN)', function(done) {
		var changeSpy = sinon.spy();

		var a = new cellx.Cell(1);
		var b = new cellx.Cell(function() {
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
		var changeSpy = sinon.spy();
		var a = new cellx.Cell(1, { onChange: changeSpy });

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
		var ee1 = new cellx.EventEmitter();
		var ee2 = new cellx.EventEmitter();

		var changeSpy = sinon.spy();
		var a = new cellx.Cell(ee1, { onChange: changeSpy });

		a.set(ee2);
		a.set(ee1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('не должна создавать событие `change`, если установить новое значение, изменить его (внутреннее изменение) и вернуть исходное значение', function(done) {
		var ee1 = new cellx.EventEmitter();
		var ee2 = new cellx.EventEmitter();

		var changeSpy = sinon.spy();
		var a = new cellx.Cell(ee1, { onChange: changeSpy });

		a.set(ee2);

		ee2.emit('change');

		a.set(ee1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('должна создавать событие `change`, если измененить текущее значение (внутреннее изменение), установить новое значение и сразу вернуть исходное', function(done) {
		var ee1 = new cellx.EventEmitter();
		var ee2 = new cellx.EventEmitter();

		var changeSpy = sinon.spy();
		var a = new cellx.Cell(ee1, { onChange: changeSpy });

		ee1.emit('change');

		a.set(ee2);
		a.set(ee1);

		setTimeout(function() {
			expect(changeSpy.called)
				.to.be.ok;

			done();
		}, 1);
	});

	it('при инициализации должна вычисляться только 1 раз, даже если родительских ячеек больше одной', function(done) {
		var a = new cellx.Cell(1);
		var b = new cellx.Cell(2);

		var cFormulaSpy = sinon.spy(function() {
			return a.get() + b.get();
		});

		var c = new cellx.Cell(cFormulaSpy, { onChange: function() {} });

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
		var a = new cellx.Cell(1);
		var b = new cellx.Cell(2);

		var cFormulaSpy = sinon.spy(function() {
			return a.get() + b.get();
		});

		var c = new cellx.Cell(cFormulaSpy, { onChange: function() {} });

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
		var a = new cellx.Cell(1);
		var b = new cellx.Cell(2);
		var aa = new cellx.Cell(function() { return a.get() + 1; });
		var bb = new cellx.Cell(function() { return b.get() + 1; });

		var cFormulaSpy = sinon.spy(function() {
			return aa.get() + bb.get();
		});

		var c = new cellx.Cell(cFormulaSpy, { onChange: function() {} });

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
		var aChangeSpy = sinon.spy(function() {
			var bValue = b.get();
		});
		var bChangeSpy = sinon.spy(function() {
			var cValue = c.get();
		});
		var cChangeSpy = sinon.spy(function() {
			var aValue = a.get();
		});

		var a = new cellx.Cell(1, { onChange: aChangeSpy });
		var b = new cellx.Cell(2, { onChange: bChangeSpy });
		var c = new cellx.Cell(3, { onChange: cChangeSpy });

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
		var a = new cellx.Cell(1);
		var b = new cellx.Cell(2);

		var t = 0;
		var aa = new cellx.Cell(function() {
			if (t++) {
				b.set(10);
			}

			return a.get() + 1;
		}, { onChange: function() {} });

		var bb = new cellx.Cell(function() {
			return b.get() + 1;
		}, { onChange: function() {} });

		a.set(5);

		expect(aa.get())
			.to.equal(6);
	});

	it('должна правильно вычисляться при записи в родительскую ячейку в формуле', function() {
		var a = new cellx.Cell(1);
		var b = new cellx.Cell(function() {
			return a.get() + 1;
		});
		var c = new cellx.Cell(function() {
			if (b.get() == 3) {
				a.set(10);
			}

			return b.get() + 1;
		});
		var d = new cellx.Cell(function() {
			return c.get() + 1;
		});

		a.set(2);

		expect(d.get())
			.to.equal(13);
	});

	it('не должна вызывать обработчик `change` при добавлении его после изменения', function(done) {
		var changeSpy = sinon.spy();
		var changeSpy2 = sinon.spy();

		var a = new cellx.Cell(1, { onChange: changeSpy });

		a.set(2);

		a.on('change', changeSpy2);

		setTimeout(function() {
			expect(changeSpy2.called)
				.to.not.be.ok;

			done();
		}, 1);
	});

	it('должна распространять ошибку потомкам без дублирования', function(done) {
		var bErrorSpy = sinon.spy();
		var c1ErrorSpy = sinon.spy();
		var c2ErrorSpy = sinon.spy();
		var dErrorSpy = sinon.spy();

		var a = new cellx.Cell(1);

		var t = 0;
		var b = new cellx.Cell(function() {
			if (t++) {
				throw 1;
			}

			return a.get() + 1;
		}, { onError: bErrorSpy });

		var c1 = new cellx.Cell(function() { return b.get() + 1; }, { onError: c1ErrorSpy });
		var c2 = new cellx.Cell(function() { return b.get() + 1; }, { onError: c2ErrorSpy });
		var d = new cellx.Cell(function() { return c1.get() + c2.get(); }, { onError: dErrorSpy });

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
		var a = new cellx.Cell(1);
		var a2 = new cellx.Cell(2);

		var b = new cellx.Cell(function() { return a.get() + 1; });

		var cFormulaSpy = sinon.spy(function() {
			return b.get() + (b.get() == 2 ? 1 : a2.get());
		});

		var c = new cellx.Cell(cFormulaSpy);

		c.on('change', function() {});

		cFormulaSpy.reset();

		a.set(2);

		setTimeout(function() {
			expect(cFormulaSpy.calledOnce)
				.to.be.ok;

			done();
		}, 1);
	});

});
