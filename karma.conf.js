var argv = require('yargs').argv;

var preprocessors = [];
var reporters = ['mocha'];

if (!argv.debug) {
	preprocessors.push('coverage');
	reporters.push('coverage');
}

module.exports = function(config) {
	config.set({
		singleRun: !argv.debug,
		autoWatch: !!argv.debug,

		frameworks: ['mocha', 'chai', 'sinon'],

		files: [
			'tests/es6-promise.js',
			'dist/cellx.js',
			'tests/*.spec.js'
		],

		preprocessors: {
			'dist/cellx.js': preprocessors,
			'tests/*.spec.js': ['babel']
		},

		babelPreprocessor: {
			options: {
				presets: ['es2015']
			}
		},

		browsers: ['PhantomJS'],

		reporters: reporters,

		coverageReporter: {
			dir: 'coverage',

			reporters: [
				{ type: 'lcov', subdir: '.' },
				{ type: 'text-summary' }
			]
		}
	});
};
