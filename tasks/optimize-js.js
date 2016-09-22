var gulp = require('gulp');
var optimizeJs = require('gulp-optimize-js');

gulp.task('optimize-js', function() {
	return gulp.src(['dist/cellx.js', 'dist/cellx.min.js'])
		.pipe(optimizeJs())
		.pipe(gulp.dest('dist'));
});
