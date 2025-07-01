import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3333,
    open: '/examples/',
    fs: {
      // allow serving files from one level up to access dist/
      allow: ['.']
    }
  },
}); 