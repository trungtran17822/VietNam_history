import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('.'),
  base: './',
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routesDirectory: here('src/routes'), generatedRouteTree: here('src/routeTree.gen.ts') }),
    react(),
    tailwindcss()
  ],
  server: { port: 8080, strictPort: true },
  preview: { port: 8080, strictPort: true },
  build: { outDir: here('dist'), emptyOutDir: true, chunkSizeWarningLimit: 700 },
  test: { root: here('.'), include: ['src/**/*.test.ts'], environment: 'node' }
});
