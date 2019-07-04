import { config } from './config';

export function logError(...args: Array<any>) {
	config.logError(...args);
}
