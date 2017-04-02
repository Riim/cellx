import eslint from 'rollup-plugin-eslint';
import babel from 'rollup-plugin-babel';

export default {
	entry: 'src/cellx.js',

	format: 'umd',
	moduleName: 'cellx',

	dest: 'dist/cellx.js',

	plugins: [
		eslint(),
		babel({
			exclude: 'node_modules/**'
		})
	]
};
