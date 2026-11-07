// npx vite --config scripts/atlas/harness/vite.config.mjs   (dev, port 5174)
// npx vite build --config scripts/atlas/harness/vite.config.mjs   (chunk sizes → harness/dist)
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../../..', import.meta.url));
export default {
  root: here,
  publicDir: `${root}frontend/public`,
  server: { port: 5174, strictPort: true, fs: { allow: [root] } },
  build: { outDir: `${here}dist`, emptyOutDir: true, reportCompressedSize: true },
};
