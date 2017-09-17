import eslint from 'rollup-plugin-eslint';
import babel from 'rollup-plugin-babel';

export default {
	input: 'src/cellx.js',

	external: [
		'@riim/is',
		'@riim/logger',
		'@riim/map-set-polyfill',
		'@riim/mixin',
		'@riim/next-tick',
		'@riim/object-assign-polyfill',
		'@riim/symbol-polyfill'
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
			'@riim/is': 'is',
			'@riim/logger': 'errorLogger',
			'@riim/map-set-polyfill': 'mapSetPolyfill',
			'@riim/mixin': 'mixin',
			'@riim/next-tick': 'nextTick',
			'@riim/object-assign-polyfill': 'objectAssignPolyfill',
			'@riim/symbol-polyfill': 'symbolPolyfill'
		}
	}
};
