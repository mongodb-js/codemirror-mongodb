var browserify = require('browserify');
var watchify = require('watchify');
var prettyTime = require('pretty-hrtime');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gulp = require('gulp');
var webserver = require('gulp-webserver');
var gutil = require('gulp-util');
var less = require('gulp-less');
var deploy = require('gulp-gh-pages');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var CleanCSS = require('less-plugin-clean-css');
var merge = require('merge-stream');
var pkg = require('./package.json');

gulp.task('default', ['develop']);

gulp.task('serve', function() {
  return gulp.src('dist').pipe(
    webserver({
      host: 'localhost',
      port: 3000,
      open: true,
      directoryListing: false,
      livereload: true
    })
  );
});

gulp.task('develop', ['assets', 'less', 'serve'], function() {
  gulp.watch(['index.less'], ['less']);
  gulp.watch(['index.html'], ['assets']);

  /**
   * Gulp's [fast browserify builds recipe](http://git.io/iiCk-A)
   */
  var bundler = watchify(
    browserify('./demo.js', {
      cache: {},
      packageCache: {},
      fullPaths: true,
      debug: false
    })
  );

  function rebundle(changed) {
    var start = process.hrtime();
    if (changed) {
      gutil.log('Changed', "'" + gutil.colors.cyan(changed[1]) + "'");
    }

    gutil.log('Starting', "'" + gutil.colors.cyan('rebundle') + "'...");
    return bundler
      .bundle()
      .pipe(source('demo.js'))
      .pipe(gulp.dest('dist/'))
      .on('end', function() {
        var time = prettyTime(process.hrtime(start));
        gutil.log(
          'Finished',
          "'" + gutil.colors.cyan('rebundle') + "'",
          'after',
          gutil.colors.magenta(time)
        );
      });
  }
  bundler.on('update', rebundle);
  return rebundle();
});

// Compile LESS to CSS.
gulp.task('less', function() {
  return gulp
    .src('index.less')
    .pipe(sourcemaps.init())
    .pipe(less(pkg.less))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('dist'));
});

gulp.task('assets', function() {
  return gulp.src('index.html').pipe(gulp.dest('dist/'));
});

// Build in production mode.
gulp.task('build', ['assets'], function() {
  var js = browserify('./demo.js')
    .bundle()
    .pipe(source('demo.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('dist/'));

  // Setup less plugin that will clean and compress.
  var cleaner = new CleanCSS({
    root: __dirname,
    keepSpecialComments: 0,
    advanced: true
  });

  var css = gulp
    .src('src/*.less')
    .pipe(
      less({
        plugins: [cleaner],
        paths: []
      })
    )
    .pipe(gulp.dest('dist'));

  return merge(js, css);
});

// Deploy to gh pages if we're on master.
// Automatically triggered by wercker when a build in master passes tests.
gulp.task('deploy', ['build'], function() {
  var opts = {
    branch: 'gh-pages', // org/username uses master, else gh-pages
    message: '[ci skip] gh-pages deploy ' +
      (process.env.GIT_COMMIT_MESSAGE || '')
  };

  return gulp.src('dist/{*,**/*}').pipe(deploy(opts));
});
