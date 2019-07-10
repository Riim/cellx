import { Cell, cellx } from '../src/cellx';

describe('cellx', () => {
	test('чтение ячейки', () => {
		let a = cellx(1);

		expect(a()).toBe(1);
	});

	test('запись в ячейку', () => {
		let a = cellx(1);

		a(2);

		expect(a()).toBe(2);
	});

	test('[options.onChange]', done => {
		let a = cellx(1, {
			onChange() {
				expect(a()).toBe(2);
				done();
			}
		});

		a(2);
	});

	test('#cell', () => {
		let a = cellx(1);

		expect(a.cell).toBeInstanceOf(Cell);
	});

	test('#on()', done => {
		let a = cellx(1);

		a.on('change', evt => {
			expect(evt).toEqual({
				target: a.cell,
				type: 'change',
				data: {
					prevValue: 1,
					value: 2
				}
			});

			done();
		});

		a(2);
	});

	test('#off()', () => {
		let a = cellx(1);
		let listener = jest.fn();

		a.on('change', listener);
		a.off('change', listener);

		a(2);

		Cell.release();

		expect(listener).not.toHaveBeenCalled();
	});

	test('#addErrorListener()', done => {
		let a = cellx(1);
		let b = cellx(() => {
			if (a() == 2) {
				throw new RangeError();
			}

			return a();
		});

		b.addErrorListener(evt => {
			expect(evt.data.error).toBeInstanceOf(RangeError);

			done();
		});

		a(2);
	});

	test('#removeErrorListener()', () => {
		let a = cellx(1);
		let b = cellx(() => {
			throw new RangeError();
		});
		let listener = jest.fn();

		b.addErrorListener(listener);
		b.removeErrorListener(listener);

		a(2);

		Cell.release();

		expect(listener).not.toHaveBeenCalled();
	});

	test('#addChangeListener()', done => {
		let a = cellx(1);

		a.addChangeListener(evt => {
			expect(evt).toEqual({
				target: a.cell,
				type: 'change',
				data: {
					prevValue: 1,
					value: 2
				}
			});

			done();
		});

		a(2);
	});

	test('#removeChangeListener()', () => {
		let a = cellx(1);
		let listener = jest.fn();

		a.addChangeListener(listener);
		a.removeChangeListener(listener);

		a(2);

		Cell.release();

		expect(listener).not.toHaveBeenCalled();
	});

	test('подписка на ячейку', done => {
		let a = cellx(1);

		a.subscribe((err, evt) => {
			expect(err).toBeNull();
			expect(evt).toEqual({
				target: a.cell,
				type: 'change',
				data: {
					prevValue: 1,
					value: 2
				}
			});

			done();
		});

		a(2);
	});

	test('отписка от ячейки', () => {
		let a = cellx(1);
		let listener = jest.fn();

		a.subscribe(listener);
		a.unsubscribe(listener);

		a(2);

		Cell.release();

		expect(listener).not.toHaveBeenCalled();
	});

	test('#value', () => {
		let a = cellx(1);

		expect(a.value).toBe(1);

		a.value = 2;

		expect(a.value).toBe(2);
	});

	test('#reap()', () => {
		let a = cellx(1);
		let b = cellx(() => a(), { onChange() {} });

		b.reap();

		expect(b.cell._active).toBeFalsy();
	});

	test('#dispose()', () => {
		let a = cellx(1);
		let b = cellx(() => a(), { onChange() {} });

		b.dispose();

		expect(b.cell._active).toBeFalsy();
	});
});
