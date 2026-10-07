import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'";
const files = { '/': ['index.html','text/html'], '/react':['react.html','text/html'], '/rnw':['react.html','text/html'], '/react-fixture.js':['.generated/react-fixture.js','application/javascript'], '/fixture.js':['fixture.js','application/javascript'], '/style.css':['style.css','text/css'] };
export function createFixtureServer() {
  return http.createServer(async (req,res) => {
    res.setHeader('Content-Security-Policy',csp); res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '') || req.method !== 'GET') { res.writeHead(403).end(); return; }
    const file = files[new URL(req.url,'http://127.0.0.1').pathname];
    if (!file) { res.writeHead(404).end(); return; }
    try { res.setHeader('Content-Type',file[1]); res.end(await readFile(new URL(file[0],import.meta.url))); }
    catch { res.writeHead(500).end(); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] || 5194);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local fixture port');
  createFixtureServer().listen(port,'127.0.0.1',() => console.log(`Synthetic fixture: http://127.0.0.1:${port}/`));
}
