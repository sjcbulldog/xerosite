#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const singleHtmlPath = './dist-single/index.html';
const distPath = './dist/frontend/browser';

console.log('🔍 Verifying single HTML file generation...\n');

// Check if Angular build exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Angular build not found. Run "npm run build" first.');
  process.exit(1);
}

// Check if single HTML file exists
if (!fs.existsSync(singleHtmlPath)) {
  console.error('❌ Single HTML file not found. Run "npm run build:single" first.');
  process.exit(1);
}

// Get file stats
const stats = fs.statSync(singleHtmlPath);
const content = fs.readFileSync(singleHtmlPath, 'utf8');

// Verify content
const hasCSS = content.includes('<style>');
const hasJS = content.includes('<script>');
const isMinified = !content.includes('\n  ') && content.length < content.replace(/\s+/g, ' ').length + 1000;

console.log('📊 Single HTML File Analysis:');
console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`   CSS embedded: ${hasCSS ? '✅' : '❌'}`);
console.log(`   JavaScript embedded: ${hasJS ? '✅' : '❌'}`);
console.log(`   Minified: ${isMinified ? '✅' : '❌'}`);

// Check for external references
const externalCSS = content.match(/<link[^>]*href[^>]*\.css[^>]*>/g);
const externalJS = content.match(/<script[^>]*src[^>]*\.js[^>]*>/g);

console.log(`   External CSS files: ${externalCSS ? externalCSS.length : 0}`);
console.log(`   External JS files: ${externalJS ? externalJS.length : 0}`);

// Overall assessment
if (hasCSS && hasJS && !externalCSS && !externalJS) {
  console.log('\n🎉 Success! Single HTML file is properly generated and self-contained.');
} else {
  console.log('\n⚠️  Warning: The file may not be fully self-contained.');
}

console.log('\n📁 Output location: ./dist-single/index.html');
console.log('🌐 You can open this file directly in a web browser.');