import { defineConfig } from 'rolldown';

const libName = 'cellx';

export default defineConfig(() => {
	return [
		['es', 'mjs'],
		['cjs', 'cjs'],
		['umd', 'umd.js']
	].map(([format, fileExt]) => ({
		input: 'src/cellx.ts',

		external: ['@riim/event'],

		output: {
			file: `dist/${libName}.${fileExt}`,
			format,
			globals: {
				'@riim/event': '_riim_event'
			},
			name: libName
		}
	}));
});
