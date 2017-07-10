import ErrorLogger from '../ErrorLogger';
import global from '../JS/global';

/**
 * @typesign (callback: ());
 */
var nextTick;

/* istanbul ignore next */
if (global.process && process.toString() == '[object process]' && process.nextTick) {
	nextTick = process.nextTick;
} else if (global.setImmediate) {
	nextTick = function nextTick(callback) {
		setImmediate(callback);
	};
} else if (global.Promise && Promise.toString().indexOf('[native code]') != -1) {
	var prm = Promise.resolve();

	nextTick = function nextTick(callback) {
		prm.then(function() {
			callback();
		});
	};
} else {
	var queue;

	global.addEventListener('message', function() {
		if (queue) {
			var track = queue;

			queue = null;

			for (var i = 0, l = track.length; i < l; i++) {
				try {
					track[i]();
				} catch (err) {
					ErrorLogger.log(err);
				}
			}
		}
	});

	nextTick = function nextTick(callback) {
		if (queue) {
			queue.push(callback);
		} else {
			queue = [callback];
			postMessage('__tic__', '*');
		}
	};
}

export default nextTick;
