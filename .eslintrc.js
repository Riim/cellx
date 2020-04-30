module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier/@typescript-eslint'
	],
	rules: {
		'@typescript-eslint/explicit-function-return-type': [
			'error',
			{
				allowTypedFunctionExpressions: true,
				allowHigherOrderFunctions: true
			}
		],
		'@typescript-eslint/interface-name-prefix': 'off',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'no-mixed-spaces-and-tabs': 'off',
		'prefer-const': 'off',
		'space-before-function-paren': 'off'
	}
};
