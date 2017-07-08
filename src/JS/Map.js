import { UID as KEY_UID } from '../keys';
import nextUID from '../Utils/nextUID';
import global from './global';
import Symbol from './Symbol';

var hasOwn = Object.prototype.hasOwnProperty;

var Map = global.Map;

if (!Map || Map.toString().indexOf('[native code]') == -1 || !new Map([[1, 1]]).size) {
	var entryStub = {
		value: undefined
	};

	Map = function Map(entries) {
		this._entries = Object.create(null);
		this._objectStamps = {};

		this._first = null;
		this._last = null;

		this.size = 0;

		if (entries) {
			for (var i = 0, l = entries.length; i < l; i++) {
				this.set(entries[i][0], entries[i][1]);
			}
		}
	};

	Map.prototype = {
		constructor: Map,

		has: function has(key) {
			return !!this._entries[this._getValueStamp(key)];
		},

		get: function get(key) {
			return (this._entries[this._getValueStamp(key)] || entryStub).value;
		},

		set: function set(key, value) {
			var entries = this._entries;
			var keyStamp = this._getValueStamp(key);

			if (entries[keyStamp]) {
				entries[keyStamp].value = value;
			} else {
				var entry = entries[keyStamp] = {
					key: key,
					keyStamp: keyStamp,
					value: value,
					prev: this._last,
					next: null
				};

				if (this.size++) {
					this._last.next = entry;
				} else {
					this._first = entry;
				}

				this._last = entry;
			}

			return this;
		},

		delete: function delete_(key) {
			var keyStamp = this._getValueStamp(key);
			var entry = this._entries[keyStamp];

			if (!entry) {
				return false;
			}

			if (--this.size) {
				var prev = entry.prev;
				var next = entry.next;

				if (prev) {
					prev.next = next;
				} else {
					this._first = next;
				}

				if (next) {
					next.prev = prev;
				} else {
					this._last = prev;
				}
			} else {
				this._first = null;
				this._last = null;
			}

			delete this._entries[keyStamp];
			delete this._objectStamps[keyStamp];

			return true;
		},

		clear: function clear() {
			var entries = this._entries;

			for (var stamp in entries) {
				delete entries[stamp];
			}

			this._objectStamps = {};

			this._first = null;
			this._last = null;

			this.size = 0;
		},

		_getValueStamp: function _getValueStamp(value) {
			switch (typeof value) {
				case 'undefined': {
					return 'undefined';
				}
				case 'object': {
					if (value === null) {
						return 'null';
					}

					break;
				}
				case 'boolean': {
					return '?' + value;
				}
				case 'number': {
					return '+' + value;
				}
				case 'string': {
					return ',' + value;
				}
			}

			return this._getObjectStamp(value);
		},

		_getObjectStamp: function _getObjectStamp(obj) {
			if (!hasOwn.call(obj, KEY_UID)) {
				if (!Object.isExtensible(obj)) {
					var stamps = this._objectStamps;
					var stamp;

					for (stamp in stamps) {
						if (hasOwn.call(stamps, stamp) && stamps[stamp] == obj) {
							return stamp;
						}
					}

					stamp = nextUID();
					stamps[stamp] = obj;

					return stamp;
				}

				Object.defineProperty(obj, KEY_UID, {
					value: nextUID()
				});
			}

			return obj[KEY_UID];
		},

		forEach: function forEach(cb, context) {
			var entry = this._first;

			while (entry) {
				cb.call(context, entry.value, entry.key, this);

				do {
					entry = entry.next;
				} while (entry && !this._entries[entry.keyStamp]);
			}
		},

		toString: function toString() {
			return '[object Map]';
		}
	};

	[
		['keys', function keys(entry) {
			return entry.key;
		}],
		['values', function values(entry) {
			return entry.value;
		}],
		['entries', function entries(entry) {
			return [entry.key, entry.value];
		}]
	].forEach(function(settings) {
		var getStepValue = settings[1];

		Map.prototype[settings[0]] = function() {
			var entries = this._entries;
			var entry;
			var done = false;
			var map = this;

			return {
				next: function() {
					if (!done) {
						if (entry) {
							do {
								entry = entry.next;
							} while (entry && !entries[entry.keyStamp]);
						} else {
							entry = map._first;
						}

						if (entry) {
							return {
								value: getStepValue(entry),
								done: false
							};
						}

						done = true;
					}

					return {
						value: undefined,
						done: true
					};
				}
			};
		};
	});
}

if (!Map.prototype[Symbol.iterator]) {
	Map.prototype[Symbol.iterator] = Map.prototype.entries;
}

export default Map;
