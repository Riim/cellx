describe('Cell.js', function() {

	describe('Cell', function() {

		it('Нет изменения, если установить значение равное текущему', function(done) {
			var onChangeSpy = sinon.spy();

			var a = new cellx.Cell(1, { onchange: onChangeSpy });

			a.write(1);

			setTimeout(function() {
				expect(onChangeSpy.called)
					.to.not.be.ok;

				done();
			}, 1);
		});

		it('Нет изменения, если установить значение (NaN) равное текущему', function(done) {
			var onChangeSpy = sinon.spy();

			var a = new cellx.Cell(NaN, { onchange: onChangeSpy });

			a.write(NaN);

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
				return a.read() + NaN;
			}, { onchange: onChangeSpy });

			a.write(2);

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

				var a = new cellx.Cell(1, { onchange: onChangeSpy });

				a.write(5);
				a.write(1);

				setTimeout(function() {
					expect(onChangeSpy.called)
						.to.not.be.ok;

					expect(a.read())
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

				var a = new cellx.Cell(ee1, { onchange: onChangeSpy });

				a.write(ee2);
				a.write(ee1);

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

				var a = new cellx.Cell(ee1, { onchange: onChangeSpy });

				a.write(ee2);

				ee2.emit('change');

				a.write(ee1);

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

				var a = new cellx.Cell(ee1, { onchange: onChangeSpy });

				ee1.emit('change');

				a.write(ee2);
				a.write(ee1);

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
				return a.read() + b.read();
			});

			var c = new cellx.Cell(cFormulaSpy, { onchange: function() {} });

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
				return a.read() + b.read();
			});

			var c = new cellx.Cell(cFormulaSpy, { onchange: function() {} });

			setTimeout(function() {
				cFormulaSpy.reset();

				a.write(5);
				b.write(10);

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
			var aa = new cellx.Cell(function() { return a.read() + 1; });
			var bb = new cellx.Cell(function() { return b.read() + 1; });

			var cFormulaSpy = sinon.spy(function() {
				return aa.read() + bb.read();
			});

			var c = new cellx.Cell(cFormulaSpy, { onchange: function() {} });

			setTimeout(function() {
				cFormulaSpy.reset();

				a.write(5);
				b.write(10);

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
					var bValue = b.read();
				});
				var bChangeSpy = sinon.spy(function() {
					var cValue = c.read();
				});
				var cChangeSpy = sinon.spy(function() {
					var aValue = a.read();
				});

				var a = new cellx.Cell(1, { onchange: aChangeSpy });
				var b = new cellx.Cell(2, { onchange: bChangeSpy });
				var c = new cellx.Cell(3, { onchange: cChangeSpy });

				setTimeout(function() {
					a.write(5);
					b.write(10);
					c.write(15);

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
					b.write(10);
				}

				return a.read() + 1;
			}, { onchange: function() {} });

			var bb = new cellx.Cell(function() {
				return b.read() + 1;
			}, { onchange: function() {} });

			a.write(5);

			expect(aa.read())
				.to.equal(6);
		});

		it('Правильно считается, если в формуле делаем write и сразу read', function() {
			var a = new cellx.Cell(1);
			var b = new cellx.Cell(function() {
				return a.read() + 1;
			});
			var c = new cellx.Cell(function() {
				if (b.read() == 3) {
					a.write(10);
				}

				return b.read() + 1;
			});
			var d = new cellx.Cell(function() {
				return c.read() + 1;
			});

			a.write(2);

			expect(d.read())
				.to.equal(13);
		});

		it('Обработчик изменения не срабатывает, если добавить его после изменения', function(done) {
			var onChangeSpy = sinon.spy();

			var a = new cellx.Cell(1);

			a.write(2);

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

				return a.read() + 1;
			}, { onerror: bOnErrorSpy });

			var c1 = new cellx.Cell(function() { return b.read() + 1; }, { onerror: c1OnErrorSpy });
			var c2 = new cellx.Cell(function() { return b.read() + 1; }, { onerror: c2OnErrorSpy });
			var d = new cellx.Cell(function() { return c1.read() + c2.read(); }, { onerror: dOnErrorSpy });

			a.write(2);

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

	});

});
