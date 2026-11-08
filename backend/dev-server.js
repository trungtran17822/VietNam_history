// Local API server for development and Playwright: same handlers, in-memory store.
// Usage: node dev-server.js [port]   (default 8787; data is lost on exit)
import http from 'node:http';
import { webcrypto } from 'node:crypto';
import { handle } from './src/handlers.js';
import { MemoryStore } from './src/store.js';

globalThis.crypto ??= webcrypto; // Node 18 has no global Web Crypto

const port = Number(process.argv[2] || process.env.PORT || 8787);
const store = new MemoryStore();
const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';

http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(`http://localhost:${port}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
    });
    const response = await handle(request, { store, allowedOrigins });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  })
  .listen(port, () => console.log(`class API (memory) on http://localhost:${port}`));
