// Static, loopback-only review of an existing offline Expo export.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 5180);
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'");
  res.setHeader('Cache-Control', 'no-store');
  try {
    const route = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, `.${route === '/' || route === '/account' ? '/index.html' : route}`);
    if (!file.startsWith(root + path.sep) || req.method !== 'GET') { res.writeHead(403).end(); return; }
    const body = await fs.readFile(file);
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Offline Expo review: http://127.0.0.1:${port}/account`));
