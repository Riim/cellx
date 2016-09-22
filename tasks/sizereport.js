var gulp = require('gulp');
var sizereport = require('gulp-sizereport');

gulp.task('sizereport', function() {
	return gulp.src('dist/**/*')
		.pipe(sizereport({
			total: false,
			gzip: true
		}));
});
