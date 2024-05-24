import { describe, expect, test } from '@jest/globals';
import * as sinon from 'sinon';
import { EventEmitter } from '../src/cellx';

describe('EventEmitter', () => {
	test('#on()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();
		let onBar = sinon.spy();
		let context = {};

		emitter.on('foo', onFoo);
		emitter.on({ bar: onBar }, context);

		emitter.emit('foo');

		expect(onFoo.calledOnce).toBeTruthy();
		expect(onBar.notCalled).toBeTruthy();

		emitter.emit('bar');

		expect(onFoo.calledOnce).toBeTruthy();
		expect(onFoo.firstCall.calledOn(emitter)).toBeTruthy();
		expect(onBar.calledOnce).toBeTruthy();
		expect(onBar.firstCall.calledOn(context)).toBeTruthy();
	});

	test('#on() (2)', () => {
		let EVENT_FOO = Symbol('foo');
		let EVENT_BAR = Symbol('bar');
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();
		let onBar = sinon.spy();
		let context = {};

		emitter.on(EVENT_FOO, onFoo);
		emitter.on({ [EVENT_BAR]: onBar }, context);

		emitter.emit(EVENT_FOO);

		expect(onFoo.calledOnce).toBeTruthy();
		expect(onBar.notCalled).toBeTruthy();

		emitter.emit(EVENT_BAR);

		expect(onFoo.calledOnce).toBeTruthy();
		expect(onFoo.firstCall.calledOn(emitter)).toBeTruthy();
		expect(onBar.calledOnce).toBeTruthy();
		expect(onBar.firstCall.calledOn(context)).toBeTruthy();
	});

	test('#off()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();
		let onBar = sinon.spy();
		let onBaz = sinon.spy();
		let context = {};

		emitter.on('foo', onFoo);
		emitter.off('foo', onFoo);

		emitter.emit('foo');

		expect(onFoo.notCalled).toBeTruthy();

		emitter.on('bar', onBar);
		emitter.on('bar', onBar);
		emitter.on('baz', onBaz, context);

		emitter.off('bar', onBar);
		emitter.off({ bar: onBar });
		emitter.off({ baz: onBaz }, context);
		emitter.off('qux', onFoo);

		emitter.emit('bar');
		emitter.emit('baz');

		expect(onBar.notCalled).toBeTruthy();
		expect(onBaz.notCalled).toBeTruthy();
	});

	test('#off() (2)', () => {
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

		expect(onFoo.notCalled).toBeTruthy();

		emitter.on(EVENT_BAR, onBar);
		emitter.on(EVENT_BAR, onBar);
		emitter.on(EVENT_BAZ, onBaz, context);

		emitter.off(EVENT_BAR, onBar);
		emitter.off({ [EVENT_BAR]: onBar });
		emitter.off({ [EVENT_BAZ]: onBaz }, context);
		emitter.off('qux', onFoo);

		emitter.emit(EVENT_BAR);
		emitter.emit(EVENT_BAZ);

		expect(onBar.notCalled).toBeTruthy();
		expect(onBaz.notCalled).toBeTruthy();
	});

	test('#once()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.once('foo', onFoo);

		emitter.emit('foo');
		emitter.emit('foo');

		expect(onFoo.calledOnce).toBeTruthy();
	});

	test('#emit()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.on('foo', onFoo);
		emitter.on('foo', onFoo);

		emitter.emit('foo');

		expect(onFoo.calledTwice).toBeTruthy();

		emitter.off('foo', onFoo);

		emitter.emit({ type: 'foo' });

		expect(onFoo.calledThrice).toBeTruthy();
	});

	test('#get$Listeners()', () => {
		let emitter = new EventEmitter();

		expect(emitter.get$Listeners('foo').length).toBe(0);

		let onFoo = () => {};

		emitter.on('foo', onFoo);

		expect([...emitter.get$Listeners().keys()]).toEqual(['foo']);
		expect(emitter.get$Listeners('foo').length).toBe(1);

		emitter.on('foo', onFoo);

		expect(emitter.get$Listeners('foo').length).toBe(2);

		emitter.on('foo', () => {});

		expect([...emitter.get$Listeners().keys()]).toEqual(['foo']);
		expect(emitter.get$Listeners('foo').length).toBe(3);
	});

	test('.transact()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.on('foo', onFoo);

		EventEmitter.transact(() => {
			emitter.emit('foo');
			emitter.emit('foo');
		});

		expect(onFoo.calledOnce).toBeTruthy();

		EventEmitter.transact(() => {
			emitter.emit('foo');

			EventEmitter.transact(() => {
				emitter.emit('foo');
				emitter.emit('foo');
			});
		});

		expect(onFoo.calledTwice).toBeTruthy();
	});

	test('.silently()', () => {
		let emitter = new EventEmitter();
		let onFoo = sinon.spy();

		emitter.on('foo', onFoo);

		EventEmitter.silently(() => {
			emitter.emit('foo');
		});

		expect(onFoo.notCalled).toBeTruthy();
	});
});
