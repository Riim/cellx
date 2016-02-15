/**
 * @typesign (cb: ());
 */
var nextTick = (function() {

	if (global.process && process.toString() == '[object process]' && process.nextTick) {
		return process.nextTick;
	}

	if (global.setImmediate) {
		return function nextTick(cb) {
			setImmediate(cb);
		};
	}

	if (global.Promise && Promise.toString().indexOf('[native code]') != -1) {
		var prm = Promise.resolve();

		return function nextTick(cb) {
			prm.then(function() {
				cb();
			});
		};
	}

	if (global.postMessage && !global.ActiveXObject) {
		var queue;

		global.addEventListener('message', function() {
			if (queue) {
				var q = queue;

				queue = null;

				for (var i = 0, l = q.length; i < l; i++) {
					try {
						q[i]();
					} catch (err) {
						cellx._logError(err);
					}
				}
			}
		});

		return function nextTick(cb) {
			if (queue) {
				queue.push(cb);
			} else {
				queue = [cb];
				postMessage('__tic__', '*');
			}
		};
	}

	return function nextTick(cb) {
		setTimeout(cb, 1);
	};

})();
