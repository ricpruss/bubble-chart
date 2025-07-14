import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3333,
    open: '/examples/',
    fs: {
      // allow serving files from one level up to access dist/
      allow: ['.']
    },
    // Disable caching for all files
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    // Watch for changes in examples directory
    watch: {
      // Watch TypeScript files in examples
      include: ['examples/**/*.ts'],
      // Force reload when examples/js changes
      ignored: ['!**/examples/js/**']
    }
  },
  // Additional optimizations for development
  optimizeDeps: {
    // Don't optimize our own library files or examples
    exclude: ['./dist/*', './examples/**/*']
  },
  // Configure how static files are served
  publicDir: false // Disable public directory since we're serving from root
});
