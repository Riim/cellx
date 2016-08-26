import global from '../js/global';
import { map } from '../js/Array';

function noop() {}

/**
 * @typesign (...msg);
 */
function logError() {
	var console = global.console;

	(console && console.error || noop).call(console || global, map.call(arguments, function(part) {
		return part === Object(part) && part.stack || part;
	}).join(' '));
}

export default logError;
