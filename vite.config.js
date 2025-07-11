import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3333,
    open: '/examples/',
    fs: {
      // allow serving files from one level up to access dist/
      allow: ['.']
    },
    // Configure selective caching
    middlewareMode: false,
    hmr: {
      overlay: true
    }
  },
  
  // Set static directory for cacheable assets
  publicDir: 'static',
  
  // Additional optimizations for development
  optimizeDeps: {
    // Don't optimize our own library files or D3
    exclude: ['./dist/*', 'd3']
  },
  
  // Configure build to ensure fresh builds
  build: {
    // Clear output dir before build
    emptyOutDir: true,
    // Disable minification for easier debugging
    minify: false,
    // Generate sourcemaps
    sourcemap: true
  },
  
  // Configure how different file types are handled
  define: {
    // Ensure we're in development mode
    __DEV__: true
  },
  
  // Configure middleware for selective caching
  plugins: [
    {
      name: 'selective-cache-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          
          // Cache static assets (favicon, images, etc.)
          if (url.startsWith('/favicon') || url.match(/\.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
          // No cache for dist files (our library builds)
          else if (url.includes('/dist/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('ETag', '');
          }
          // No cache for HTML files and JavaScript files in examples
          else if (url.endsWith('.html') || (url.endsWith('.js') && !url.includes('node_modules'))) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
          
          next();
        });
      }
    }
  ]
});
