import { defineConfig } from 'vite';

// Built into dist/ and served by tools/tablero.py (which also stores the images and boards)
export default defineConfig({
  base: '/',
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
