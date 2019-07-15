import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import tslint from "rollup-plugin-tslint";
import typescript from 'rollup-plugin-typescript2';

export default {
	input: './src/cellx.ts',

	output: {
		file: './dist/cellx.umd.js',
		format: 'umd',
		name: 'cellx'
	},

	plugins: [
		resolve({ browser: true }),
		commonjs({ include: /node_modules/ }),
		tslint(),
		typescript({ clean: true })
	]
};
