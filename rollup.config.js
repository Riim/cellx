import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default {
	input: './src/cellx.ts',

	output: {
		file: './dist/cellx.umd.js',
		format: 'umd',
		name: 'cellx'
	},

	plugins: [resolve({ browser: true }), typescript({ clean: true })]
};
