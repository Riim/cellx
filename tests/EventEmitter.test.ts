import { EventEmitter } from '../src/cellx';

describe('EventEmitter', () => {
	test('#on()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();
		let onBar = jest.fn();
		let context = {};

		emitter.on('foo', onFoo);
		emitter.on(
			{
				bar: onBar
			},
			context
		);

		emitter.emit('foo');

		expect(onFoo).toHaveBeenCalledTimes(1);
		expect(onBar).toHaveBeenCalledTimes(0);

		emitter.emit('bar');

		expect(onFoo).toHaveBeenCalledTimes(1);
		expect(onFoo.mock.instances[0]).toBe(emitter);
		expect(onBar).toHaveBeenCalledTimes(1);
		expect(onBar.mock.instances[0]).toBe(context);
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

		expect(onFoo).not.toHaveBeenCalled();

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

		expect(onBar).not.toHaveBeenCalled();
		expect(onBaz).not.toHaveBeenCalled();
	});

	test('#once()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();

		emitter.once('foo', onFoo);

		emitter.emit('foo');
		emitter.emit('foo');

		expect(onFoo).toHaveBeenCalledTimes(1);
	});

	test('#emit()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();

		emitter.on('foo', onFoo);
		emitter.on('foo', onFoo);

		emitter.emit('foo');

		expect(onFoo).toHaveBeenCalledTimes(2);

		emitter.off('foo', onFoo);

		emitter.emit({ type: 'foo' });

		expect(onFoo).toHaveBeenCalledTimes(3);
	});

	test('#getEvents()', () => {
		let emitter = new EventEmitter();

		expect(emitter.getEvents('foo').length).toBe(0);

		let onFoo = () => {};

		emitter.on('foo', onFoo);

		expect(Object.keys(emitter.getEvents())).toEqual(['foo']);
		expect(emitter.getEvents('foo').length).toBe(1);

		emitter.on('foo', onFoo);

		expect(emitter.getEvents('foo').length).toBe(2);

		emitter.on('foo', () => {});

		expect(Object.keys(emitter.getEvents())).toEqual(['foo']);
		expect(emitter.getEvents('foo').length).toBe(3);
	});

	test('.transact()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();

		emitter.on('foo', onFoo);

		EventEmitter.transact(() => {
			emitter.emit('foo');
			emitter.emit('foo');
		});

		expect(onFoo).toHaveBeenCalledTimes(1);

		EventEmitter.transact(() => {
			emitter.emit('foo');

			EventEmitter.transact(() => {
				emitter.emit('foo');
				emitter.emit('foo');
			});
		});

		expect(onFoo).toHaveBeenCalledTimes(2);
	});
});
