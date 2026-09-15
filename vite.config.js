import { defineConfig } from 'vite';

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: { host: true },
  build: { target: 'es2020' },
  // MapLibre 6 loads its worker via `new URL(..., import.meta.url)`; Vite's dependency
  // pre-bundler breaks that path, so serve the package as-is in dev.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  // The MapLibre worker is an ES module that imports a shared chunk; bundle it as one.
  worker: { format: 'es' },
});
