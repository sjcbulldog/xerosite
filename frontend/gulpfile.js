const gulp = require('gulp');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify');
const htmlmin = require('gulp-htmlmin');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const { deleteSync } = require('del');
const fs = require('fs');
const path = require('path');

// Paths configuration
const paths = {
  dist: './dist/frontend/browser',
  temp: './temp',
  output: './dist-single'
};

// Clean temp and output directories
function clean() {
  try {
    deleteSync([paths.temp, paths.output]);
    return Promise.resolve();
  } catch (error) {
    console.log('Clean error:', error);
    return Promise.resolve();
  }
}

// Copy and process HTML
function processHTML() {
  return gulp.src(`${paths.dist}/index.html`)
    .pipe(gulp.dest(paths.temp));
}

// Concatenate and minify all CSS files
function processCSS() {
  return gulp.src(`${paths.dist}/**/*.css`)
    .pipe(concat('styles.min.css'))
    .pipe(cleanCSS({
      level: 2,
      inline: ['all']
    }))
    .pipe(gulp.dest(paths.temp));
}

// Concatenate and minify all JavaScript files
function processJS() {
  // Get all JS files from the dist directory
  return gulp.src([
    `${paths.dist}/**/*.js`,
    `!${paths.dist}/**/runtime*.js` // Exclude runtime files that need to be first
  ])
    .pipe(concat('app.min.js'))
    .pipe(uglify({
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      mangle: true
    }).on('error', function(err) {
      console.log('Uglify Error:', err.toString());
      this.emit('end');
    }))
    .pipe(gulp.dest(paths.temp));
}

// Process runtime files separately
function processRuntime() {
  return gulp.src(`${paths.dist}/**/runtime*.js`)
    .pipe(concat('runtime.min.js'))
    .pipe(uglify({
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      mangle: false // Don't mangle runtime
    }).on('error', function(err) {
      console.log('Runtime Uglify Error:', err.toString());
      this.emit('end');
    }))
    .pipe(gulp.dest(paths.temp));
}

// Create inline HTML with embedded CSS and JS
function createSingleHTML() {
  return gulp.src(`${paths.temp}/index.html`)
    .pipe(replace(/<link[^>]*href="[^"]*\.css"[^>]*>/g, ''))
    .pipe(replace(/<script[^>]*src="[^"]*\.js"[^>]*><\/script>/g, ''))
    .pipe(replace('</head>', function() {
      let cssContent = '';
      try {
        cssContent = fs.readFileSync(`${paths.temp}/styles.min.css`, 'utf8');
      } catch (err) {
        console.log('No CSS file found, skipping CSS injection');
      }
      return cssContent ? `<style>${cssContent}</style>\n</head>` : '</head>';
    }))
    .pipe(replace('</body>', function() {
      let jsContent = '';
      let runtimeContent = '';
      
      try {
        runtimeContent = fs.readFileSync(`${paths.temp}/runtime.min.js`, 'utf8');
      } catch (err) {
        console.log('No runtime file found');
      }
      
      try {
        jsContent = fs.readFileSync(`${paths.temp}/app.min.js`, 'utf8');
      } catch (err) {
        console.log('No app JS file found');
      }
      
      const scripts = [];
      if (runtimeContent) scripts.push(`<script>${runtimeContent}</script>`);
      if (jsContent) scripts.push(`<script>${jsContent}</script>`);
      
      return scripts.join('\n') + '\n</body>';
    }))
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true
    }))
    .pipe(rename('index.html'))
    .pipe(gulp.dest(paths.output));
}

// Copy assets (images, fonts, etc.)
function copyAssets() {
  return gulp.src([
    `${paths.dist}/**/*`,
    `!${paths.dist}/**/*.js`,
    `!${paths.dist}/**/*.css`,
    `!${paths.dist}/index.html`
  ], { allowEmpty: true })
    .pipe(gulp.dest(paths.output));
}

// Clean up temp directory
function cleanTemp() {
  try {
    deleteSync([paths.temp]);
    return Promise.resolve();
  } catch (error) {
    console.log('Clean temp error:', error);
    return Promise.resolve();
  }
}

// Task to generate single HTML file
const generateSingleHTML = gulp.series(
  clean,
  gulp.parallel(processHTML, processCSS, processJS, processRuntime),
  createSingleHTML,
  copyAssets,
  cleanTemp
);

// Export tasks
exports.clean = clean;
exports['process-html'] = processHTML;
exports['process-css'] = processCSS;
exports['process-js'] = processJS;
exports['process-runtime'] = processRuntime;
exports['create-single-html'] = createSingleHTML;
exports['copy-assets'] = copyAssets;
exports['generate-single-html'] = generateSingleHTML;
exports.default = generateSingleHTML;