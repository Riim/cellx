import { config } from './config';

export function logError(...args: Array<any>): void {
	config.logError(...args);
}
