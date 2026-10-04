import { defineConfig } from 'vite';

export default defineConfig({
  // percorsi relativi: funziona anche su GitHub Pages o in una sottocartella
  base: './',
  server: { host: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
