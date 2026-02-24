const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['src/background.js'],
    bundle: true,
    outfile: 'background.bundle.js',
    minify: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    target: ['chrome100'],
    format: 'esm', // Use ESM format if possible, or iife
    // Fixes Node.js core modules being imported by transformers.js in the browser
    define: {
        'process.env.NODE_ENV': '"production"'
    }
}).catch(() => process.exit(1));
