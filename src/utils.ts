import { configuration } from './configuration';

export function logError(...args: Array<any>) {
	configuration.logError(...args);
}
