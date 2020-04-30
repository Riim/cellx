import resolve from 'rollup-plugin-node-resolve';
import { eslint } from 'rollup-plugin-eslint';
import typescript from 'rollup-plugin-typescript2';

export default {
	input: './src/cellx.ts',

	output: {
		file: './dist/cellx.umd.js',
		format: 'umd',
		name: 'cellx'
	},

	// prettier-ignore
	plugins: [
		resolve({ browser: true }),
		eslint(),
		typescript({ clean: true })
	]
};
