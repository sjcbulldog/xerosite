# Single HTML File Generator

This project includes Gulp tasks to generate a single, self-contained HTML file from your Angular application.

## What it does

The Gulp build process:

1. **Builds** your Angular application for production
2. **Concatenates** all CSS files into a single minified stylesheet
3. **Concatenates** all JavaScript files into minified bundles
4. **Inlines** the CSS and JavaScript directly into the HTML file
5. **Minifies** the final HTML output
6. **Copies** any additional assets (images, fonts, etc.)

## Usage

### Install Dependencies

```bash
npm install
```

### Generate Single HTML File

```bash
# Build Angular app and generate single HTML file
npm run build:single

# Verify the generated file
npm run verify

# Or run Gulp directly
npm run gulp generate-single-html
```

### Available Scripts

```bash
# Complete build process
npm run build:single       # Build Angular + generate single HTML

# Verification
npm run verify             # Analyze the generated file

# Individual Gulp tasks
gulp generate-single-html  # Generate complete single HTML file (default)
gulp clean                 # Clean temp and output directories
gulp process-html          # Process HTML file
gulp process-css           # Concatenate and minify CSS
gulp process-js            # Concatenate and minify JavaScript
gulp process-runtime       # Process Angular runtime files
gulp create-single-html    # Create the final inline HTML
gulp copy-assets           # Copy additional assets
```

## Output

The generated files will be in the `./dist-single/` directory:

- `index.html` - Single file containing all HTML, CSS, and JavaScript (~235KB)
- Additional assets (if any) - Images, fonts, etc.

## File Structure

```
frontend/
├── gulpfile.js           # Gulp configuration
├── verify-build.js       # Verification script
├── dist/                 # Angular build output
│   └── frontend/browser/ # Actual build files
├── dist-single/          # Generated single HTML output
├── temp/                 # Temporary processing files (auto-cleaned)
└── package.json          # Dependencies and scripts
```

## Features

- **Self-contained**: All CSS and JavaScript is embedded in the HTML
- **Minified**: Optimized for size and performance
- **Production-ready**: Uses Angular's production build configuration
- **Asset support**: Copies images, fonts, and other assets
- **Error handling**: Graceful handling of missing files
- **Verification**: Built-in script to verify the output

## Use Cases

- **Email templates**: Send complete HTML applications via email
- **Offline applications**: Single file that works without server
- **Embedded widgets**: Easy to embed in other applications
- **Documentation**: Standalone demos and examples
- **Distribution**: Easy to share and deploy single file apps
- **Presentations**: Self-contained demos for presentations

## Technical Details

- **Build target**: Modern Angular uses `dist/frontend/browser/` for output
- **File processing**: Runtime files are processed separately to maintain loading order
- **Minification**: Console logs and debugger statements are removed
- **CSS optimization**: Level 2 minification with inlining
- **Error handling**: Graceful handling of missing CSS/JS files

## Verification

The `verify-build.js` script analyzes the generated file and reports:
- File size
- Whether CSS and JavaScript are properly embedded
- Minification status
- External file dependencies
- Overall self-containment status

## Notes

- The process uses Angular's production build configuration for optimal performance
- If your app has no custom CSS, the CSS embedding step will report no files (this is normal)
- The output is fully self-contained and can be opened directly in any modern web browser
- File size is optimized through minification and compression