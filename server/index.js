import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWSHandler } from './ws-handler.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.glsl': 'text/plain',
  '.wasm': 'application/wasm',
};

const server = createServer((req, res) => {
  let pathname = new URL(req.url, 'http://localhost').pathname;

  // Try exact file, then fall back to index.html (SPA)
  let filePath = join(DIST, pathname);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, 'index.html');
  }

  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

createWSHandler(server);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
