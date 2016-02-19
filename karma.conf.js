module.exports = function(config) {
	config.set({
		singleRun: true,
		autoWatch: false,

		frameworks: ['mocha', 'chai', 'sinon'],

		files: [
			'cellx.js',
			'tests/*.spec.js'
		],

		preprocessors: {
			'cellx.js': ['coverage']
		},

		browsers: ['PhantomJS'],

		reporters: ['mocha', 'coverage'],

		coverageReporter: {
			reporters: [
				{ type: 'html' },
				{ type: 'text-summary' }
			]
		}
	});
};
