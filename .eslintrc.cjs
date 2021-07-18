module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json'
	},
	ignorePatterns: ['**/*.js'],
	plugins: ['@typescript-eslint', 'github'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'prettier'
	],
	rules: {
		'@typescript-eslint/array-type': ['error', { default: 'generic', readonly: 'generic' }],
		'@typescript-eslint/ban-types': 0,
		'@typescript-eslint/explicit-module-boundary-types': 0,
		'@typescript-eslint/naming-convention': [
			'error',
			{
				selector: 'interface',
				format: ['PascalCase'],
				custom: { regex: '^I[$A-Z]', match: true }
			}
		],
		'@typescript-eslint/no-explicit-any': 0,
		'@typescript-eslint/no-floating-promises': 0,
		'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
		'@typescript-eslint/no-non-null-assertion': 0,
		'@typescript-eslint/no-this-alias': 0,
		'@typescript-eslint/no-unsafe-assignment': 0,
		'@typescript-eslint/no-unsafe-call': 0,
		'@typescript-eslint/no-unsafe-member-access': 0,
		'@typescript-eslint/no-unsafe-return': 0,
		'@typescript-eslint/no-var-requires': 0,
		'@typescript-eslint/prefer-nullish-coalescing': [
			'error',
			{ ignoreMixedLogicalExpressions: false }
		],
		'@typescript-eslint/prefer-regexp-exec': 0,
		'@typescript-eslint/restrict-plus-operands': 0,
		'@typescript-eslint/restrict-template-expressions': 0,
		'@typescript-eslint/unbound-method': 0,
		'github/array-foreach': 'error',
		'no-empty': 0,
		'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
		'no-unreachable': 'error',
		'no-var': 0,
		'prefer-const': 0,
		'prefer-rest-params': 0,
		'space-before-function-paren': [
			'error',
			{ anonymous: 'always', named: 'never', asyncArrow: 'always' }
		]
	}
};
