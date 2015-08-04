// --------------------------------------------------- //
// -------------------- Config ----------------------- //
// --------------------------------------------------- //

import gulp from 'gulp';
import del from 'del';
import browserSync from 'browser-sync';
import pngquant from 'imagemin-pngquant';
import gulpLoadPlugins from 'gulp-load-plugins';
const $ = gulpLoadPlugins();

const onError = (err) => {
    $.util.log($.util.colors.green(err));
    this.emit('end'); //continue the process in watch
};

const now = new Date();
const nowString = `${now.getDate()}-${now.getMonth() + 1 * 1}-${now.getFullYear()} on ${now.toLocaleTimeString()}`;
    
const config = {
    development: !!$.util.env.development || !!$.util.env.dev,
    banner: `\n/* developed by boerdam - last changed ${nowString} */\n\n`,
    prefixOptions: ['last 2 version', 'ie >= 9'],
    bower: './bower_components',
    node: './node_modules',
    src: './Assets/src',
    dist: './Assets/dist'
};

gulp.task('log', () => {
    if (config.development) {
        $.util.log($.util.colors.bgRed(`--development: ${config.development}. Before distributing make sure to run 'gulp' without the '--development' flag!`));
    }
});

gulp.task('init', () => {
    return gulp.src(['./bower.json', './package.json']).pipe($.install());
});



// --------------------------------------------------- //
// -------------------- Scripts ---------------------- //
// --------------------------------------------------- //

gulp.task('concatJs.vendor', () => {
    return gulp.src([
        `${config.bower}/angular/angular.js`
    ])
    .pipe($.concat('vendor.js'))
    .pipe(gulp.dest(`${config.dist}/Js`));
});

gulp.task('concatJs.main', () => {
    return gulp.src([
        `${config.src}/Js/app.js`,
        `${config.src}/Js/controllers/*.js`
    ])
    .pipe($.babel())
    .pipe($.concat('main.js'))
    .pipe(gulp.dest(`${config.dist}/Js`));
});

var processMinifyJS = (src, name) => {
    return gulp.src(src)
        .pipe($.if(!config.development, $.uglify({ mangle: false })).on('error', (e) => console.log(e.message)))
        .pipe($.header(config.banner))
        .pipe($.rename({ suffix: '.min' }))
        .pipe(gulp.dest(`${config.dist}/Js/`))
        .pipe($.size({ title: `Updated ${name}.min.js` }))
        .pipe(browserSync.stream());
};

gulp.task('minifyJs.vendor', ['concatJs.vendor'], () => {
    return processMinifyJS(`${config.dist}/Js/vendor.js`, 'vendor');  
});

gulp.task('minifyJs.main', ['concatJs.main'], () => {
    return processMinifyJS(`${config.dist}/Js/main.js`, 'main');   
});

gulp.task('scripts', ['minifyJs.vendor', 'minifyJs.main']);

gulp.task('testJs', ['scripts'], () => {
    return gulp.src(`${config.src}/Js/**/*.js`)
        .pipe($.plumber({ errorHandler: onError }))
        .pipe($.jshint({ esnext: true }))
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.plumber.stop());
});



// --------------------------------------------------- //
// ------------------- Styles ------------------------ //
// --------------------------------------------------- //

var stylesStream = (source, name) => {
    return gulp.src(source)
        //.pipe($.if(config.development, $.sourcemaps.init()))
        .pipe($.sass().on('error', onError))
        .pipe($.importCss({ extensions: ["!sass", "!scss"] })) // parse css import directives and insert 
        .pipe($.if(!config.development, $.autoprefixer(config.prefixOptions)))
        .pipe($.if(!config.development, $.combineMediaQueries()))
        .pipe($.if(!config.development, $.csso()))
        //.pipe($.if(config.development, $.sourcemaps.write()))
        .pipe($.rename({ basename: name, suffix: '.min' }))
        .pipe($.header(config.banner))
        .pipe(gulp.dest(`${config.dist}/Css/`))
        .pipe($.filter('*.css'))
        .pipe($.size({ title: `Updated ${name}.min.css` }))
        .pipe(browserSync.stream());
};

gulp.task('styles.vendor', () => {
    return stylesStream(`${config.src}/Sass/vendor/vendor.scss`, 'vendor');
});

gulp.task('styles.main', () => {
    return stylesStream(`${config.src}/Sass/main.scss`, 'main');
});

gulp.task('styles', ['styles.vendor', 'styles.main']);



// --------------------------------------------------- //
// ------------------- Images ------------------------ //
// --------------------------------------------------- //

gulp.task('images', () => {
    return gulp.src(`${config.src}/Img/*`)
        .pipe($.imagemin({
            progressive: true,
            svgoPlugins: [{ removeViewBox: false }],
            use: [pngquant()]
        }))
        .pipe(gulp.dest(`${config.dist}/Img/`));
});



// --------------------------------------------------- //
// -------------------- Watch ------------------------ //
// --------------------------------------------------- //

gulp.task('watch', () => {
    browserSync.init({ server: "./", logLevel: "silent" });
    // browserSync.init({ logLevel: "silent" });
    // Use this scripts before body closing tag 
    // <script type='text/javascript' id="__bs_script__">
    //      document.write("<script async src='http://HOST:3000/browser-sync/browser-sync-client.2.7.10.js'><\/script>".replace("HOST", location.hostname));
    // </script>   
        
    $.watch(`${config.src}/Sass/vendor/**/*.scss`, 
        $.batch((events, done) => gulp.start('styles.vendor', done))
    );

    $.watch([
        `${config.src}/Sass/**/*.scss`, 
        `!${config.src}/Sass/vendor/**/*.scss`, 
    ], $.batch((events, done) => gulp.start('styles.main', done)));

    $.watch(`${config.src}/Js/**/*.js`, 
        $.batch((events, done) => gulp.start('minifyJs.main', done))
    );
    
    $.watch(`${config.src}/Img/*`, 
        $.batch((events, done) => gulp.start('images', done))
    );
    
    gulp.watch(['./Views/**/*.cshtml', './index.html']).on("change", browserSync.reload);

    $.util.log($.util.colors.yellow("Watching styles, scripts and cshtml (BrowserSync enabled)..."));
});



// --------------------------------------------------- //
// -------------------- Clean ------------------------ //
// --------------------------------------------------- //

gulp.task('clean', (cb) => {
    del(`${config.dist}/{Css,Img,Js}`, { 
        force: true 
    }, cb);
});



// --------------------------------------------------- //
// --------------------- Gulp ------------------------ //
// --------------------------------------------------- //

gulp.task('default', ['clean', 'init'], (cb) => {
    return gulp.start('styles', 'log', 'watch');
});
