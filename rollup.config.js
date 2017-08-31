import eslint from 'rollup-plugin-eslint';
import babel from 'rollup-plugin-babel';

export default {
	input: 'src/cellx.js',

	external: [
		'@riim/error-logger',
		'@riim/symbol-polyfill',
		'@riim/map-set-polyfill',
		'@riim/mixin',
		'@riim/next-tick'
	],

	plugins: [
		eslint(),
		babel({
			exclude: 'node_modules/**'
		})
	],

	output: {
		file: 'dist/cellx.js',
		format: 'umd',
		name: 'cellx',

		globals: {
			'@riim/error-logger': 'errorLogger',
			'@riim/symbol-polyfill': 'symbolPolyfill',
			'@riim/map-set-polyfill': 'mapSetPolyfill',
			'@riim/mixin': 'mixin',
			'@riim/next-tick': 'nextTick'
		}
	}
};
