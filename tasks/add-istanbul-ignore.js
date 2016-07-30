var gulp = require('gulp');
var replace = require('gulp-replace');

gulp.task('add-istanbul-ignore', function() {
	return gulp.src('dist/cellx.js')
		.pipe(replace(
			/^(\(function webpackUniversalModuleDefinition\(root, factory\) \{)/,
			'$1 /* istanbul ignore next */'
		))
		.pipe(gulp.dest('dist'));
});
