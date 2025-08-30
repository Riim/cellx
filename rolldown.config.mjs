import { defineConfig } from 'rolldown';

export default defineConfig({
	input: 'src/cellx.ts',

	output: {
		file: 'dist/cellx.umd.js',
		format: 'umd',
		name: 'cellx'
	}
});
