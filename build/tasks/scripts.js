var notifier = require('node-notifier');
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

gulp.task('scripts-build', function() {
	return gulp.src('src/cellx.js')
		.pipe($.plumber(function(err) {
			$.util.log(err.toString(), '\n' + $.util.colors.red('--------'));
			notifier.notify({ title: err.name, message: err.message });
		}))
		.pipe($.include())
		.pipe(gulp.dest(''))
		.pipe($.uglify())
		.pipe($.rename({ suffix: '.min' }))
		.pipe(gulp.dest(''));
});

gulp.task('scripts', ['scripts-build'], function() {
	if ($.util.env.dev) {
		gulp.watch('src/**/*.js', ['scripts-build']);
	}
});
