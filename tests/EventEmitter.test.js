let { EventEmitter } = require('../dist/cellx.umd');

describe('EventEmitter', () => {
	test('#getEvents()', () => {
		let emitter = new EventEmitter();
		let onFoo = function() {};
		let onBar = function() {};

		emitter.on({
			foo: onFoo,
			bar: onBar
		});

		expect(emitter.getEvents('foo').length).toBe(1);
		expect(emitter.getEvents('foo')).toEqual(emitter.getEvents().foo);
	});

	test('#on()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();
		let onBar = jest.fn();

		emitter.on('foo', onFoo);
		emitter.on({
			bar: onBar
		});

		emitter.emit('foo');

		expect(onFoo).toHaveBeenCalledTimes(1);
		expect(onBar).toHaveBeenCalledTimes(0);

		emitter.emit('bar');

		expect(onFoo).toHaveBeenCalledTimes(1);
		expect(onBar).toHaveBeenCalledTimes(1);
	});

	test('#off()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();
		let onBar = jest.fn();

		emitter.on({
			foo: onFoo,
			bar: onBar
		});

		emitter.off('foo', onFoo);
		emitter.off({
			bar: onBar
		});

		emitter.emit('foo');
		emitter.emit('bar');

		expect(onFoo).not.toHaveBeenCalled();
		expect(onBar).not.toHaveBeenCalled();
	});

	test('#once()', () => {
		let emitter = new EventEmitter();
		let onFoo = jest.fn();

		emitter.once('foo', onFoo);

		emitter.emit('foo');
		emitter.emit('foo');

		expect(onFoo).toHaveBeenCalledTimes(1);
	});
});
