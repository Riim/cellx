var webpack = require('webpack');

module.exports = {
	output: {
		library: 'cellx',
		libraryTarget: 'umd'
	},

	module: {
		preLoaders: [
			{
				test: /\.js$/,
				loader: 'jscs'
			},
			{
				test: /\.js$/,
				loader: 'eslint'
			}
		]
	},

	node: {
		console: false,
		global: false,
		process: false,
		Buffer: false,
		__filename: false,
		__dirname: false,
		setImmediate: false
	}
};
