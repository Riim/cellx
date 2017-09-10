import eslint from 'rollup-plugin-eslint';
import babel from 'rollup-plugin-babel';

export default {
	input: 'src/cellx.js',

	external: [
		'@riim/logger',
		'@riim/object-assign-polyfill',
		'@riim/symbol-polyfill',
		'@riim/map-set-polyfill',
		'@riim/is',
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
			'@riim/logger': 'errorLogger',
			'@riim/object-assign-polyfill': 'objectAssignPolyfill',
			'@riim/symbol-polyfill': 'symbolPolyfill',
			'@riim/map-set-polyfill': 'mapSetPolyfill',
			'@riim/is': 'is',
			'@riim/mixin': 'mixin',
			'@riim/next-tick': 'nextTick'
		}
	}
};
