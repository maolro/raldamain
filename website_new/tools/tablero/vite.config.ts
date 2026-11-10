import { defineConfig } from 'vite';

// Built into dist/ and served by tools/tablero.py (which also stores the images and boards)
export default defineConfig({
  base: '/',
  // (its files under /app: /assets is the website's, for the sheet window)
  // every build's files get new names (its time is in the code): nothing a cache kept from an earlier
  // build (Cloudflare, for tablero.raldamain.com) can get in the way, not even a "not found"
  define: { __BUILD__: JSON.stringify(new Date().toISOString()) },
  build: { outDir: 'dist', assetsDir: 'app', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
