const gulp = require('gulp'),
      sass = require('gulp-sass'),
      browserSync = require('browser-sync'),
      useref = require('gulp-useref'),
      uglify = require('gulp-uglify'),
      gulpIf = require('gulp-if'),
      cssnano = require('gulp-cssnano'),
      imagemin = require('gulp-imagemin'),
      cache = require('gulp-cache'),
      del = require('del'),
      runSequence = require('run-sequence'),
      inject = require('gulp-inject-string'),
      spritesmith = require('gulp.spritesmith'),
      merge = require('merge-stream'),
      htmlhint = require('gulp-htmlhint'),
      rename = require('gulp-rename'),
      prompt = require('prompt'),
      fs = require('fs');



/********* Snippets ***********/

const snippets = {
    scriptTag: "<!-- Scripts -->\n\t",
    cssTag: "<!-- CSS -->\n\t",
    index: "test"
}


/******* Tasks **********/
gulp.task('browserSync', function() { // Initiate BrowserSync
   browserSync.init({
      server: {
         baseDir: 'site'
      },
   })
});

gulp.task('sass', function(){
   return gulp.src('site/scss/main.scss')   // Converts main.scss to css file for dev process
       .pipe(sass())
       .pipe(gulp.dest('site/css'))
       .pipe(browserSync.reload({
          stream: true
       }));
});

gulp.task('useref', function() {
    return gulp.src('site/*.html')
        // Concats JS files - No need to concat CSS files
        .pipe(useref())
        // Minifies only if a JS file
        .pipe(gulpIf('*.js', uglify()))
        //Minifies only if a CSS file
        .pipe(gulpIf('*.css', cssnano()))
        .pipe(inject.before('<script src="js/main.min.js"></script>', snippets.scriptTag))
        .pipe(inject.before('<link rel="stylesheet" href="css/styles.min.css">', snippets.cssTag))
        .pipe(gulp.dest('dist'));
});

gulp.task('images', function() {        // Compresses all images.
    gulp.src('site/images/**/*.+(jpeg|jpg|gif|svg|png)')
        .pipe(cache(imagemin({
            interlaced: true
        })))
        .pipe(gulp.dest('dist/images'));    // Moves all images to distribution.
});

gulp.task('fonts', function() { // Moves all font files over to dist
    gulp.src('site/fonts/**/*')
        .pipe(gulp.dest('dist/fonts'));
    return gulp.src('site/css/fonts/**/*')
        .pipe(gulp.dest('dist/css/fonts'));
});

gulp.task('clean:dist', function() { // Completely deletes dist folder
    return del.sync('dist');
});


gulp.task('cache:clear', function(callback) { // Clears cache of project
    return cache.clearAll(callback)
});


gulp.task('sprite', function () {
    gulp.src('site/images/*.+(png)')      // Compress all PNG files
        .pipe(cache(imagemin({
            interlaced: true
        })))
        .pipe(gulp.dest('site/images'));
    // Generate our spritesheet for png files
    var spriteData = gulp.src('site/images/*.png').pipe(spritesmith({
        imgName: 'sprite.png',
        cssName: 'sprite.scss'
    }));
    var imgStream = spriteData.img
        .pipe(gulp.dest('site/images/sprite'), ('dist/images/sprite'))
        .pipe(gulp.dest('dist/images/sprite')); // Destination for sprite PNG
    var cssStream = spriteData.css
        .pipe(gulp.dest('site/scss/dependencies')); // Destination for sprite.scss
    del.sync('site/images/*.+(png)'); // Deletes remaining png files except sprite
});

gulp.task('watch', ['sass', 'browserSync'], function(){           // Runs both browsersync and sass concurrently
    gulp.watch('site/scss/**/*.+(scss|sass)', ['sass']);
    gulp.watch('site/images/**/*.+(jpg|gif|svg|jpeg)', ['images']);
    gulp.watch('site/*.html', browserSync.reload);
    gulp.watch('site/js/**/*.js', browserSync.reload);
    gulp.watch('site/images/*.png', ['sprite']);
});

gulp.task('valid', function () {
    gulp.src('site/index.html')
        .pipe(htmlhint())
        .pipe(htmlhint.reporter());
});

gulp.task('start', function() { // Builds out new project. Careful, this will delete current project.
    // New project prompt
    var new_project = {
        properties: {
            name: {
                message: 'Do you want to start a new project? This will delete current project. Type "yes" to continue',
                required: true
            },
        }
    };

    // Meta Information
    var meta_information = {
        properties: {
            description: {
                message: 'Please enter meta description',
                required:true
            },
            keywords: {
                message: 'Please enter meta keywords',
                required: true
            },
            title: {
                message: 'Please enter site title',
                required: true
            }
        }
    };

    // Navbar type, location and side-panel
    var nav_bar = {
        properties: {
            navbar_location: {
                message: 'Is the navbar "above" or "below" the slider?',
                required:true
            },
            navbar_type: {
                message: 'Is the navbar "split", "logo-left", or "logo-right"?',
                required: true
            }
        }
    }
    var side_panel = {
        properties: {
            side_panel: {
                message: 'Does the navbar have a side panel? "yes" or "No".',
                required: true
            }
        }
    }

    // Start the build new project prompt
    prompt.start();
    prompt.get(new_project, function (err, result) {
        if(result.name === 'yes') {
            del.sync('site/index.html');
            console.log('\nBuilding new project... \nPlease answer the following questions.');
            gulp.src('templates/template-index.html')
                .pipe(rename('index.html'))
                .pipe(gulp.dest('site/'));
            del.sync('site/js/custom.js');
            gulp.src('templates/template-custom.js')
                .pipe(rename('custom.js'))
                .pipe(gulp.dest('site/js/'));
            del.sync('site/scss/main.scss');
            gulp.src('templates/template-main.scss')
                .pipe(rename('main.scss'))
                .pipe(gulp.dest('site/scss'));
            prompt.get(meta_information, function(err, result) {
                gulp.src('site/index.html')
                    .pipe(inject.after('<meta name="description" content="', result.description))
                    .pipe(inject.after('<meta name="keywords" content="', result.keywords))
                    .pipe(inject.after('<title>', result.title))
                    .pipe(gulp.dest('site'));
                prompt.get(nav_bar, function(err, result) {
                    var logo_left = fs.readFileSync("templates/template-nav-logo-left.html", "utf8");
                    var logo_right = fs.readFileSync('templates/template-nav-logo-right.html', "utf8");
                    var split = fs.readFileSync('templates/template-nav-split.html', "utf8");
                    var slider = fs.readFileSync('templates/template-top-slider.html', "utf8");
                    if (result.navbar_location === 'above') {
                        if (result.navbar_type === 'logo-left') {
                            gulp.src('site/index.html')
                                .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + logo_left))
                                .pipe(inject.before('<!-- Content -->', slider + '\n\n'))
                                .pipe(gulp.dest('site'));
                        } else if (result.navbar_type === 'logo-right') {
                            gulp.src('site/index.html')
                                .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + logo_right))
                                .pipe(inject.before('<!-- Content -->', slider + '\n\n'))
                                .pipe(gulp.dest('site'));
                        } else if (result.navbar_type === 'split') {
                            gulp.src('site/index.html')
                                .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + split))
                                .pipe(inject.before('<!-- Content -->', slider + '\n\n'))
                                .pipe(gulp.dest('site'));
                        }
                        else {
                            console.log('Not a valid navbar type. Please insert your own from templates.');
                            gulp.src('site/index.html')
                                .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + slider))
                                .pipe(gulp.dest('site'));
                        }
                    }
                    else if (result.navbar_location === 'below') {
                        if (result.navbar_type === 'logo-left') {
                            gulp.src('site/index.html')
                                .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + slider))
                                .pipe(inject.before('<!-- Content -->', logo_left + '\n\n'))
                                .pipe(gulp.dest('site'));
                        } else if (result.navbar_type === 'logo-right') {
                            gulp.src('site/index.html')
                                .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + slider))
                                .pipe(inject.before('<!-- Content -->', logo_right + '\n\n'))
                                .pipe(gulp.dest('site'));
                        } else if (result.navbar_type === 'split') {
                            gulp.src('site/index.html')
                                .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + slider))
                                .pipe(inject.before('<!-- Content -->', split +'\n\n'))
                                .pipe(gulp.dest('site'));
                        } else {
                            console.log('Not a valid navbar type. Please insert your own from templates.');
                        }
                    } else {
                        console.log('You didn\'t type in a valid navbar type. Please insert your own from templates');
                        gulp.src('site/index.html')
                            .pipe(inject.after('<div id="wrapper" class="clearfix">', '\n\n' + slider))
                            .pipe(gulp.dest('site'));
                    }
                    prompt.get(side_panel, function(err, result) {
                        var side_panel = fs.readFileSync('templates/template-side-panel.html', 'utf8');
                        var side_panel_trigger = fs.readFileSync('templates/template-side-panel-trigger.html', 'utf8');
                        if (result.side_panel === 'yes') {
                            gulp.src('site/index.html')
                                .pipe(inject.after('<body class="stretched">', '\n\n' + side_panel))
                                .pipe(inject.before('</nav>', '\n' + side_panel_trigger + '\n\n'))
                                .pipe(gulp.dest('site'));
                        }
                    });
                });
            });
        } else {
            return console.log('\nA new project was not created.');
        }
    });
});


gulp.task('build', function (callback) {
    runSequence('clean:dist', 'sass', ['valid', 'useref', 'images', 'sprite', 'fonts'],
        callback
    );
});

gulp.task('default', function (callback) {
    runSequence(['sass', 'valid', 'browserSync', 'watch'],
        callback
    );
});


