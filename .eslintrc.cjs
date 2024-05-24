module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json'
	},
	plugins: ['@typescript-eslint', 'github'],
	extends: [],
	rules: {
		'@typescript-eslint/array-type': ['error', { default: 'generic', readonly: 'generic' }],
		'@typescript-eslint/naming-convention': [
			'error',
			{
				selector: 'interface',
				format: ['PascalCase'],
				custom: { regex: '^I[$A-Z]', match: true }
			}
		],
		'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
		'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': [
			'error',
			{ ignoreMixedLogicalExpressions: true }
		],
		'github/array-foreach': 'error',
		'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
		'no-unreachable': 'error',
		'space-before-function-paren': [
			'error',
			{ anonymous: 'always', named: 'never', asyncArrow: 'always' }
		]
	}
};
