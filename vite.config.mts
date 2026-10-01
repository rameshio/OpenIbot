import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  root: path.resolve('renderer'), base: './', plugins: [react()],
  css: { postcss: { plugins: [] } },
  server: { host: '127.0.0.1', port: 5177, strictPort: true },
  build: { outDir: path.resolve('dist-renderer'), emptyOutDir: true, sourcemap: false },
});
