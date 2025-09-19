import { defineConfig } from 'rolldown';

const libName = 'cellx';

export default defineConfig(() => {
	return [
		['esm', 'js'],
		['umd', 'umd.js']
		// ['commonjs', 'cjs']
	].map(([format, fileExt]) => ({
		input: 'src/cellx.ts',

		output: {
			file: `dist/${libName}.${fileExt}`,
			format,
			name: libName
		}
	}));
});
