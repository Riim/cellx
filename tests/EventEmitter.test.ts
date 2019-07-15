import { expect } from 'chai';
import * as sinon from 'sinon';
import { EventEmitter } from '../src/cellx';

describe('EventEmitter', () => {
	it('#on()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();
		let onBar = sinon.spy();
		let context = {};

		emitter.on('foo', onFoo);
		emitter.on(
			{
				bar: onBar
			},
			context
		);

		emitter.emit('foo');

		expect(onFoo.calledOnce).to.be.true;
		expect(onBar.notCalled).to.be.true;

		emitter.emit('bar');

		expect(onFoo.calledOnce).to.be.true;
		expect(onFoo.firstCall.calledOn(emitter)).to.be.true;
		expect(onBar.calledOnce).to.be.true;
		expect(onBar.firstCall.calledOn(context)).to.be.true;
	});

	it('#on() (2)', () => {
		let EVENT_FOO = Symbol('foo');
		let EVENT_BAR = Symbol('bar');
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();
		let onBar = sinon.spy();
		let context = {};

		emitter.on(EVENT_FOO, onFoo);
		emitter.on(
			{
				[EVENT_BAR]: onBar
			},
			context
		);

		emitter.emit(EVENT_FOO);

		expect(onFoo.calledOnce).to.be.true;
		expect(onBar.notCalled).to.be.true;

		emitter.emit(EVENT_BAR);

		expect(onFoo.calledOnce).to.be.true;
		expect(onFoo.firstCall.calledOn(emitter)).to.be.true;
		expect(onBar.calledOnce).to.be.true;
		expect(onBar.firstCall.calledOn(context)).to.be.true;
	});

	it('#off()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();
		let onBar = sinon.spy();
		let onBaz = sinon.spy();
		let context = {};

		emitter.on('foo', onFoo);
		emitter.off('foo', onFoo);

		emitter.emit('foo');

		expect(onFoo.notCalled).to.be.true;

		emitter.on('bar', onBar);
		emitter.on('bar', onBar);
		emitter.on('baz', onBaz, context);

		emitter.off('bar', onBar);
		emitter.off({
			bar: onBar
		});
		emitter.off(
			{
				baz: onBaz
			},
			context
		);
		emitter.off('qux', onFoo);

		emitter.emit('bar');
		emitter.emit('baz');

		expect(onBar.notCalled).to.be.true;
		expect(onBaz.notCalled).to.be.true;
	});

	it('#off() (2)', () => {
		let EVENT_FOO = Symbol('foo');
		let EVENT_BAR = Symbol('bar');
		let EVENT_BAZ = Symbol('baz');
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();
		let onBar = sinon.spy();
		let onBaz = sinon.spy();
		let context = {};

		emitter.on(EVENT_FOO, onFoo);
		emitter.off(EVENT_FOO, onFoo);

		emitter.emit(EVENT_FOO);

		expect(onFoo.notCalled).to.be.true;

		emitter.on(EVENT_BAR, onBar);
		emitter.on(EVENT_BAR, onBar);
		emitter.on(EVENT_BAZ, onBaz, context);

		emitter.off(EVENT_BAR, onBar);
		emitter.off({
			[EVENT_BAR]: onBar
		});
		emitter.off(
			{
				[EVENT_BAZ]: onBaz
			},
			context
		);
		emitter.off('qux', onFoo);

		emitter.emit(EVENT_BAR);
		emitter.emit(EVENT_BAZ);

		expect(onBar.notCalled).to.be.true;
		expect(onBaz.notCalled).to.be.true;
	});

	it('#once()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.once('foo', onFoo);

		emitter.emit('foo');
		emitter.emit('foo');

		expect(onFoo.calledOnce).to.be.true;
	});

	it('#emit()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.on('foo', onFoo);
		emitter.on('foo', onFoo);

		emitter.emit('foo');

		expect(onFoo.calledTwice).to.be.true;

		emitter.off('foo', onFoo);

		emitter.emit({ type: 'foo' });

		expect(onFoo.calledThrice).to.be.true;
	});

	it('#getEvents()', () => {
		let emitter = new EventEmitter();

		expect(emitter.getEvents('foo').length).to.equal(0);

		let onFoo = () => {};

		emitter.on('foo', onFoo);

		expect([...emitter.getEvents().keys()]).to.eql(['foo']);
		expect(emitter.getEvents('foo').length).to.equal(1);

		emitter.on('foo', onFoo);

		expect(emitter.getEvents('foo').length).to.equal(2);

		emitter.on('foo', () => {});

		expect([...emitter.getEvents().keys()]).to.eql(['foo']);
		expect(emitter.getEvents('foo').length).to.equal(3);
	});

	it('.transact()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.on('foo', onFoo);

		EventEmitter.transact(() => {
			emitter.emit('foo');
			emitter.emit('foo');
		});

		expect(onFoo.calledOnce).to.be.true;

		EventEmitter.transact(() => {
			emitter.emit('foo');

			EventEmitter.transact(() => {
				emitter.emit('foo');
				emitter.emit('foo');
			});
		});

		expect(onFoo.calledTwice).to.be.true;
	});

	it('.silently()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.on('foo', onFoo);

		EventEmitter.silently(() => {
			emitter.emit('foo');
		});

		expect(onFoo.notCalled).to.be.true;
	});
});
