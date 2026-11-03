import { defineConfig } from 'vite';

// Built into dist/ and served by tools/tablero.py (which also stores the images and boards)
export default defineConfig({
  base: '/',
  // (its files under /app: /assets is the website's, for the sheet window)
  build: { outDir: 'dist', assetsDir: 'app', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
