var del = require('del');
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

gulp.task('test', function() {
	del.sync('coverage');

	return gulp.src(['cellx.js', 'tests/*.spec.js'])
		.pipe($.karma({
			configFile: 'karma.conf.js',
			action: 'run'
		}));
});
