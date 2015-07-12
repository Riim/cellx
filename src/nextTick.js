(function() {
	/**
	 * @memberOf cellx
	 *
	 * @example
	 * nextTick(function() {
	 *     console.log('nextTick');
	 * });
	 *
	 * @typesign (cb: ());
	 */
	var nextTick;

	if (global.process && process.toString() == '[object process]' && process.nextTick) {
		nextTick = process.nextTick;
	} else if (global.setImmediate) {
		nextTick = function(cb) {
			setImmediate(cb);
		};
	} else if (global.Promise && isNative(Promise)) {
		var prm = Promise.resolve();

		nextTick = function(cb) {
			prm.then(function() {
				cb();
			});
		};
	} else if (global.postMessage && !global.ActiveXObject) {
		var queue;

		global.addEventListener('message', function() {
			if (queue) {
				var q = queue;

				queue = null;

				for (var i = 0, l = q.length; i < l; i++) {
					try {
						q[i]();
					} catch (err) {
						cellx.logError(err);
					}
				}
			}
		}, false);

		nextTick = function(cb) {
			if (queue) {
				queue.push(cb);
			} else {
				queue = [cb];
				global.postMessage('__tic__', '*');
			}
		};
	} else {
		nextTick = function(cb) {
			setTimeout(cb, 1);
		};
	}

	cellx.nextTick = nextTick;
})();
