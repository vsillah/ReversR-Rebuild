// Local static/leak audit; prints counts only, never matched private material.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const files = ['convex/cad.ts', 'convex/schema.ts', 'convex/librarySession.ts',
  'offline/cad-convex/backend.d.ts', 'scripts/helpers/cad-convex-source-loader.js',
  'scripts/cad-convex-source.test.js', 'docs/cad-convex-schema-functions-review.md'];
const patterns = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /(?:sk_live_|ghp_|github_pat_)[A-Za-z0-9_]{16,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /us1\.[A-Za-z0-9_-]{43}/, /\/Users\/[^\s'"`]+/, /[A-Za-z0-9+/]{256,}={0,2}/,
  /^.{72}[SGDPT] *\d+\s*$/m];
let hits = 0;
for (const name of files) for (const pattern of patterns) if (pattern.test(read(name))) hits++;
assert.equal(hits, 0, 'Source packet leak pattern detected (content withheld)');
const cad = read('convex/cad.ts');
assert.equal((cad.match(/= internal(?:Query|Mutation)\(\{/g) || []).length, 6);
assert.equal((cad.match(/returns:/g) || []).length, 6);
assert.ok(!/\b(?:query|mutation|action|httpAction)\s*\(/.test(cad));
const backend = read('offline/cad-convex/backend.js');
assert.ok(!/\.collect\s*\(|\.query\([^)]*\)\.filter\s*\(/.test(backend));
assert.ok(!/process\.env|fetch\s*\(/.test(cad + read('convex/librarySession.ts')));
for (const name of fs.readdirSync(path.join(root, 'server')).filter(n => /\.js$/.test(n))) {
  assert.ok(!/require\(['"][^'"]*(?:offline\/cad-convex|\/convex\/cad)/.test(read('server/' + name)));
}
console.log(`CAD source audit passed: ${files.length} files, zero leak pattern matches; internal-only and runtime isolation checks passed`);
