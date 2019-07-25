import { expect } from 'chai';
import * as sinon from 'sinon';
import { Cell, cellx } from '../src/cellx';

describe('cellx', () => {
	it('чтение ячейки', () => {
		let a = cellx(1);

		expect(a()).to.equal(1);
	});

	it('запись в ячейку', () => {
		let a = cellx(1);

		a(2);

		expect(a()).to.equal(2);
	});

	it('[options.onChange]', done => {
		let a = cellx(1, {
			onChange() {
				expect(a()).to.equal(2);
				done();
			}
		});

		a(2);
	});

	it('#cell', () => {
		let a = cellx(1);

		expect(a.cell).to.be.instanceOf(Cell);
	});

	it('#on()', done => {
		let a = cellx(1);

		a.on(Cell.EVENT_CHANGE, evt => {
			expect(evt).to.eql({
				target: a.cell,
				type: Cell.EVENT_CHANGE,
				data: {
					prevValue: 1,
					value: 2
				}
			});

			done();
		});

		a(2);
	});

	it('#off()', () => {
		let a = cellx(1);
		let listener = sinon.spy();

		a.on(Cell.EVENT_CHANGE, listener);
		a.off(Cell.EVENT_CHANGE, listener);

		a(2);

		Cell.release();

		expect(listener.notCalled).to.true;
	});

	it('#addErrorListener()', done => {
		let a = cellx(1);
		let b = cellx(() => {
			if (a() == 2) {
				throw new RangeError();
			}

			return a();
		});

		b.addErrorListener(evt => {
			expect(evt.data.error).to.be.instanceOf(RangeError);

			done();
		});

		a(2);
	});

	it('#removeErrorListener()', () => {
		let a = cellx(1);
		let b = cellx(() => {
			throw new RangeError();
		});
		let listener = sinon.spy();

		b.addErrorListener(listener);
		b.removeErrorListener(listener);

		a(2);

		Cell.release();

		expect(listener.notCalled).to.be.true;
	});

	it('#addChangeListener()', done => {
		let a = cellx(1);

		a.addChangeListener(evt => {
			expect(evt).to.eql({
				target: a.cell,
				type: Cell.EVENT_CHANGE,
				data: {
					prevValue: 1,
					value: 2
				}
			});

			done();
		});

		a(2);
	});

	it('#removeChangeListener()', () => {
		let a = cellx(1);
		let listener = sinon.spy();

		a.addChangeListener(listener);
		a.removeChangeListener(listener);

		a(2);

		Cell.release();

		expect(listener.notCalled).to.be.true;
	});

	it('подписка на ячейку', done => {
		let a = cellx(1);

		a.subscribe((err, evt) => {
			expect(err).to.be.null;
			expect(evt).to.eql({
				target: a.cell,
				type: Cell.EVENT_CHANGE,
				data: {
					prevValue: 1,
					value: 2
				}
			});

			done();
		});

		a(2);
	});

	it('отписка от ячейки', () => {
		let a = cellx(1);
		let listener = sinon.spy();

		a.subscribe(listener);
		a.unsubscribe(listener);

		a(2);

		Cell.release();

		expect(listener.notCalled).to.be.true;
	});

	it('#value', () => {
		let a = cellx(1);

		expect(a.value).to.equal(1);

		a.value = 2;

		expect(a.value).to.equal(2);
	});

	it('#reap()', () => {
		let a = cellx(1);
		let b = cellx(() => a(), { onChange() {} });

		b.reap();

		expect(b.cell._active).to.be.false;
	});

	it('#dispose()', () => {
		let a = cellx(1);
		let b = cellx(() => a(), { onChange() {} });

		b.dispose();

		expect(b.cell._active).to.be.false;
	});
});
