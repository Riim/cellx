import globals from 'globals';
import tseslint from 'typescript-eslint';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const languageOptionsGlobals = {
	globals: {
		...globals.node,
		...globals.browser
	}
};
const jsRules = {
	// использовать только строгие сравнения
	eqeqeq: ['error', 'always'],
	// не смешивать пробелы и табы
	'no-mixed-spaces-and-tabs': [
		'error',
		// кроме smart-tabs
		'smart-tabs'
	],
	// нет недостижимого кода
	// 'no-unreachable': 'error',
	// пробел перед скобками функции
	'space-before-function-paren': [
		'error',
		{
			anonymous: 'always',
			named: 'never', // кроме именованных функций
			asyncArrow: 'always'
		}
	]
	// не использовать перед объявлением
	// 'no-use-before-define': [
	// 	'error',
	// 	{
	// 		// функции можно
	// 		functions: false,
	// 		classes: true,
	// 		variables: true,
	// 		allowNamedExports: true
	// 	}
	// ]
};

export default tseslint.config(
	{
		files: ['**/*.{js,cjs,mjs,jsx}'],
		languageOptions: {
			...languageOptionsGlobals
		},
		extends: [],
		rules: {
			...jsRules
		}
	},
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			},
			...languageOptionsGlobals
		},
		plugins: {
			'@typescript-eslint': tsPlugin
		},
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
			// не забыть await
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					// можно если функция должна возвращать void
					checksVoidReturn: false
				}
			],
			// не ставить лишние касты типов
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
			// использовать "??" вместо "||"
			'@typescript-eslint/prefer-nullish-coalescing': [
				'error',
				{
					// кроме смешанных ситуаций типа `a || (b && c)`
					// ignoreMixedLogicalExpressions: false
				}
			],
			...jsRules
		}
	}
);
