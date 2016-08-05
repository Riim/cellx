var pump = require('pump');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('minify', function(done) {
	pump([
		gulp.src('dist/cellx.js'),
		uglify(),
		rename({ suffix: '.min' }),
		gulp.dest('dist')
	], done);
});
