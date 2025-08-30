import { describe, expect, test } from '@jest/globals';
import { EventEmitter } from '../src/cellx';

describe('EventEmitter', () => {
	test('#on()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();
		let onBar = jest.fn();
		let context = {};

		emitter.on('foo', onFoo);
		emitter.on({ bar: onBar }, context);

		emitter.emit('foo');

		expect(onFoo.mock.calls.length).toBe(1);
		expect(onBar.mock.calls.length).toBe(0);

		emitter.emit('bar');

		expect(onFoo.mock.calls.length).toBe(1);
		expect(onFoo.mock.contexts[0]).toBe(emitter);
		expect(onBar.mock.calls.length).toBe(1);
		expect(onBar.mock.contexts[0]).toBe(context);
	});

	test('#on() (2)', () => {
		let EVENT_FOO = Symbol('foo');
		let EVENT_BAR = Symbol('bar');
		let emitter = new EventEmitter();
		let onFoo = jest.fn();
		let onBar = jest.fn();
		let context = {};

		emitter.on(EVENT_FOO, onFoo);
		emitter.on({ [EVENT_BAR]: onBar }, context);

		emitter.emit(EVENT_FOO);

		expect(onFoo.mock.calls.length).toBe(1);
		expect(onBar.mock.calls.length).toBe(0);

		emitter.emit(EVENT_BAR);

		expect(onFoo.mock.calls.length).toBe(1);
		expect(onFoo.mock.contexts[0]).toBe(emitter);
		expect(onBar.mock.calls.length).toBe(1);
		expect(onBar.mock.contexts[0]).toBe(context);
	});

	test('#off()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();
		let onBar = jest.fn();
		let onBaz = jest.fn();
		let context = {};

		emitter.on('foo', onFoo);
		emitter.off('foo', onFoo);

		emitter.emit('foo');

		expect(onFoo.mock.calls.length).toBe(0);

		emitter.on('bar', onBar);
		emitter.on('bar', onBar);
		emitter.on('baz', onBaz, context);

		emitter.off('bar', onBar);
		emitter.off({ bar: onBar });
		emitter.off({ baz: onBaz }, context);
		emitter.off('qux', onFoo);

		emitter.emit('bar');
		emitter.emit('baz');

		expect(onBar.mock.calls.length).toBe(0);
		expect(onBaz.mock.calls.length).toBe(0);
	});

	test('#off() (2)', () => {
		let EVENT_FOO = Symbol('foo');
		let EVENT_BAR = Symbol('bar');
		let EVENT_BAZ = Symbol('baz');
		let emitter = new EventEmitter();
		let onFoo = jest.fn();
		let onBar = jest.fn();
		let onBaz = jest.fn();
		let context = {};

		emitter.on(EVENT_FOO, onFoo);
		emitter.off(EVENT_FOO, onFoo);

		emitter.emit(EVENT_FOO);

		expect(onFoo.mock.calls.length).toBe(0);

		emitter.on(EVENT_BAR, onBar);
		emitter.on(EVENT_BAR, onBar);
		emitter.on(EVENT_BAZ, onBaz, context);

		emitter.off(EVENT_BAR, onBar);
		emitter.off({ [EVENT_BAR]: onBar });
		emitter.off({ [EVENT_BAZ]: onBaz }, context);
		emitter.off('qux', onFoo);

		emitter.emit(EVENT_BAR);
		emitter.emit(EVENT_BAZ);

		expect(onBar.mock.calls.length).toBe(0);
		expect(onBaz.mock.calls.length).toBe(0);
	});

	test('#once()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();

		emitter.once('foo', onFoo);

		emitter.emit('foo');
		emitter.emit('foo');

		expect(onFoo.mock.calls.length).toBe(1);
	});

	test('#emit()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();

		emitter.on('foo', onFoo);
		emitter.on('foo', onFoo);

		emitter.emit('foo');

		expect(onFoo.mock.calls.length).toBe(2);

		emitter.off('foo', onFoo);

		emitter.emit({ type: 'foo' });

		expect(onFoo.mock.calls.length).toBe(3);
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
		let onFoo = jest.fn();

		emitter.on('foo', onFoo);

		EventEmitter.transact(() => {
			emitter.emit('foo');
			emitter.emit('foo');
		});

		expect(onFoo.mock.calls.length).toBe(1);

		EventEmitter.transact(() => {
			emitter.emit('foo');

			EventEmitter.transact(() => {
				emitter.emit('foo');
				emitter.emit('foo');
			});
		});

		expect(onFoo.mock.calls.length).toBe(2);
	});

	test('.silently()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();

		emitter.on('foo', onFoo);

		EventEmitter.silently(() => {
			emitter.emit('foo');
		});

		expect(onFoo.mock.calls.length).toBe(0);
	});
});
