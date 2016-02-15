describe('Cell.js', function() {

	describe('Cell', function() {

		it('Нет изменения, если установить значение равное текущему', function(done) {
			var onChangeSpy = sinon.spy();

			var a = new cellx.Cell(1, { onChange: onChangeSpy });

			a.set(1);

			setTimeout(function() {
				expect(onChangeSpy.called)
					.to.not.be.ok;

				done();
			}, 1);
		});

		it('Нет изменения, если установить значение (NaN) равное текущему', function(done) {
			var onChangeSpy = sinon.spy();

			var a = new cellx.Cell(NaN, { onChange: onChangeSpy });

			a.set(NaN);

			setTimeout(function() {
				expect(onChangeSpy.called)
					.to.not.be.ok;

				done();
			}, 1);
		});

		it('Нет изменения, если вычесляемое значение меняется с NaN на NaN', function(done) {
			var onChangeSpy = sinon.spy();

			var a = new cellx.Cell(1);
			var b = new cellx.Cell(function() {
				return a.get() + NaN;
			}, { onChange: onChangeSpy });

			a.set(2);

			setTimeout(function() {
				expect(onChangeSpy.called)
					.to.not.be.ok;

				done();
			}, 1);
		});

		it(
			'Нет изменения, если установить значение не равное текущему и сразу вернуть исходное значение',
			function(done) {
				var onChangeSpy = sinon.spy();

				var a = new cellx.Cell(1, { onChange: onChangeSpy });

				a.set(5);
				a.set(1);

				setTimeout(function() {
					expect(onChangeSpy.called)
						.to.not.be.ok;

					expect(a.get())
						.to.equal(1);

					done();
				}, 1);
			}
		);

		it(
			'Нет изменения, если установить значение не равное текущему и сразу вернуть исходное значение (2)',
			function(done) {
				var ee1 = new cellx.EventEmitter();
				var ee2 = new cellx.EventEmitter();

				var onChangeSpy = sinon.spy();

				var a = new cellx.Cell(ee1, { onChange: onChangeSpy });

				a.set(ee2);
				a.set(ee1);

				setTimeout(function() {
					expect(onChangeSpy.called)
						.to.not.be.ok;

					done();
				}, 1);
			}
		);

		it(
			'Нет изменения, если установить значение не равное текущему, сделать в нём внутреннее изменение' +
				' и вернуть исходное значение',
			function(done) {
				var ee1 = new cellx.EventEmitter();
				var ee2 = new cellx.EventEmitter();

				var onChangeSpy = sinon.spy();

				var a = new cellx.Cell(ee1, { onChange: onChangeSpy });

				a.set(ee2);

				ee2.emit('change');

				a.set(ee1);

				setTimeout(function() {
					expect(onChangeSpy.called)
						.to.not.be.ok;

					done();
				}, 1);
			}
		);

		it(
			'Есть изменение, если сделать внутреннее изменение в текущем значении, установить значение' +
				' не равное текущему и вернуть исходное значение',
			function(done) {
				var ee1 = new cellx.EventEmitter();
				var ee2 = new cellx.EventEmitter();

				var onChangeSpy = sinon.spy();

				var a = new cellx.Cell(ee1, { onChange: onChangeSpy });

				ee1.emit('change');

				a.set(ee2);
				a.set(ee1);

				setTimeout(function() {
					expect(onChangeSpy.called)
						.to.be.ok;

					done();
				}, 1);
			}
		);

		it('При инициализации дочерний вычисляется 1 раз, даже если родителей больше одного', function(done) {
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

		it('При изменении нескольких родителей дочерний пересчитывается 1 раз', function(done) {
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

		it('При изменении нескольких родителей дочерний пересчитывается 1 раз (2)', function(done) {
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

		it(
			'Срабатывают все обработчики изменения, даже если в них запрашивать значения других ячеек,' +
				' обработчики которых должны сработать, но ещё не сработали',
			function(done) {
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
			}
		);

		it('Второй поток не портит жизнь первому', function() {
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

		it('Правильно считается, если в формуле делаем set и сразу get', function() {
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

		it('Обработчик изменения не срабатывает, если добавить его после изменения', function(done) {
			var onChangeSpy = sinon.spy();

			var a = new cellx.Cell(1);

			a.set(2);

			a.on('change', onChangeSpy);

			setTimeout(function() {
				expect(onChangeSpy.called)
					.to.not.be.ok;

				done();
			}, 1);
		});

		it('Ошибка распространяется правильно', function(done) {
			var bOnErrorSpy = sinon.spy();
			var c1OnErrorSpy = sinon.spy();
			var c2OnErrorSpy = sinon.spy();
			var dOnErrorSpy = sinon.spy();

			var a = new cellx.Cell(1);

			var t = 0;
			var b = new cellx.Cell(function() {
				if (t++) {
					throw 1;
				}

				return a.get() + 1;
			}, { onError: bOnErrorSpy });

			var c1 = new cellx.Cell(function() { return b.get() + 1; }, { onError: c1OnErrorSpy });
			var c2 = new cellx.Cell(function() { return b.get() + 1; }, { onError: c2OnErrorSpy });
			var d = new cellx.Cell(function() { return c1.get() + c2.get(); }, { onError: dOnErrorSpy });

			a.set(2);

			setTimeout(function() {
				expect(bOnErrorSpy.calledOnce)
					.to.be.ok;

				expect(c1OnErrorSpy.calledOnce)
					.to.be.ok;

				expect(c2OnErrorSpy.calledOnce)
					.to.be.ok;

				expect(dOnErrorSpy.calledOnce)
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
		it('_level в пассивном режиме считается правильно', function(done) {
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

});
