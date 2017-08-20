import eslint from 'rollup-plugin-eslint';
import babel from 'rollup-plugin-babel';

export default {
	input: 'src/cellx.js',

	external: [
		'@riim/symbol-polyfill',
		'@riim/map-set-polyfill'
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
			'@riim/symbol-polyfill': 'symbolPolyfill',
			'@riim/map-set-polyfill': 'mapSetPolyfill'
		}
	}
};
