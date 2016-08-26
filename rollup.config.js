import eslint from 'rollup-plugin-eslint';

export default {
	entry: 'src/cellx.js',

	format: 'umd',
	moduleName: 'cellx',

	dest: 'dist/cellx.js',

	plugins: [
		eslint()
	]
};
