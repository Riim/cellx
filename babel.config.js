module.exports = {
	plugins: [
		[
			'@babel/plugin-transform-block-scoping',
			{
				throwIfClosureRequired: true
			}
		]
	]
};
