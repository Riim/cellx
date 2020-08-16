module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	ignorePatterns: ['**/*.js'],
	plugins: ['@typescript-eslint'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier/@typescript-eslint'
	],
	rules: {
		'@typescript-eslint/ban-types': 0,
		'@typescript-eslint/explicit-function-return-type': 0,
		'@typescript-eslint/explicit-module-boundary-types': 0,
		'@typescript-eslint/interface-name-prefix': 0,
		'@typescript-eslint/no-empty-function': 0,
		'@typescript-eslint/no-explicit-any': 0,
		'@typescript-eslint/no-non-null-assertion': 0,
		'no-mixed-spaces-and-tabs': 0,
		'no-prototype-builtins': 0,
		'prefer-const': 0,
		'space-before-function-paren': 0
	}
};
