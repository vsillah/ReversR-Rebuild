// Explicit acquisition only. Qualification never invokes this script automatically.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { metadata, cacheRoot } = require('./fixtures/cad-mit-source');
function verify(bytes) {
  if (bytes.length !== metadata.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== metadata.sha256) throw new Error('FIXTURE_MISMATCH');
  return bytes;
}
async function acquire(fetchSource = fetch) {
  const response = await fetchSource(metadata.sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (response.status !== 200 || !response.body) throw new Error('ACQUISITION_FAILED');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > metadata.bytes) throw new Error('FIXTURE_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
  }
  return verify(Buffer.concat(chunks));
}
async function main() {
  if (process.argv.length !== 2) throw new Error('UNSUPPORTED_ARGUMENT');
  const target = path.join(cacheRoot, metadata.path);
  const bytes = fs.existsSync(target) ? verify(fs.readFileSync(target)) : await acquire();
  fs.mkdirSync(cacheRoot, { recursive: true });
  // Exclusive creation avoids following or overwriting an existing destination.
  if (fs.existsSync(target)) verify(fs.readFileSync(target));
  else fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: 'ready', fixtureId: metadata.id, bytes: bytes.length, sha256: metadata.sha256 }));
}
if (require.main === module) main().catch(() => { console.error('MIT_FIXTURE_ACQUISITION_FAILED'); process.exitCode = 1; });
module.exports = { acquire, verify };
