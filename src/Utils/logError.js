import global from '../JS/global';
import noop from './noop';

var map = Array.prototype.map;

/**
 * @typesign (...msg);
 */
function logError() {
	var console = global.console;

	(console && console.error || noop).call(console || global, map.call(arguments, function(arg) {
		return arg === Object(arg) && arg.stack || arg;
	}).join(' '));
}

export default logError;
