// Local static/leak audit; prints counts only, never matched private material.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const files = ['offline/cad-convex/devWiring.js', 'offline/cad-convex/devWiring.json',
  'scripts/cad-convex-dev-wiring.test.js', 'docs/cad-dev-convex-auth-wiring-review.md',
  'offline/cad-convex/liveReadiness.js', 'offline/cad-convex/liveReadiness.json',
  'scripts/cad-convex-live-readiness.js', 'scripts/cad-convex-live-readiness.test.js',
  'docs/cad-convex-live-auth-readiness.md', 'offline/cad-convex/passwordPolicy.ts', 'scripts/cad-convex-password-boundary.test.js',
  'docs/cad-convex-password-auth-boundary.md', 'docs/cad-convex-live-wiring-packet.md', 'docs/cad-live-convex-auth-setup-packet.md', 'convex/auth.ts', 'convex/auth.config.ts', 'convex/http.ts',
  'offline/cad-convex/librarySessionHarness.js', 'scripts/cad-convex-auth-assembly.test.js',
  'docs/cad-convex-auth-assembly-review.md',
  'offline/cad-convex/previewRuntime.js', 'offline/cad-convex/previewRuntime.d.ts',
  'scripts/cad-convex-preview-runtime.test.js', 'docs/cad-convex-preview-setup.md', 'scripts/cad-convex-codegen.js', 'package.json', 'package-lock.json',
  ...fs.readdirSync(path.join(root, 'convex/_generated')).map(n => 'convex/_generated/' + n),
'convex/cad.ts', 'convex/schema.ts', 'convex/librarySession.ts',
  'offline/cad-convex/backend.d.ts', 'scripts/helpers/cad-convex-source-loader.js',
  'scripts/cad-convex-source.test.js', 'docs/cad-convex-schema-functions-review.md'];
const patterns = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /(?:sk_live_|ghp_|github_pat_)[A-Za-z0-9_]{16,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /us1\.[A-Za-z0-9_-]{43}/, /\/Users\/[^\s'"`]+/, /[A-Za-z0-9+/]{256,}={0,2}/,
  /^.{72}[SGDPT] *\d+\s*$/m];
let hits = 0;
for (const name of files) for (const pattern of patterns) if (pattern.test(read(name))) hits++;
assert.equal(hits, 0, 'Source packet leak pattern detected (content withheld)');
assert.ok(!/process\.env|fetch\s*\(|https?\.request|require\(['"](?:convex|node:https|node:http)['"]\)/.test(read('offline/cad-convex/previewRuntime.js')));
assert.ok(!/process\.env|fetch\s*\(|require\s*\(/.test(read('offline/cad-convex/librarySessionHarness.js')));
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

for (const directory of ['convex', 'server', 'src', 'app', 'api', 'components', 'hooks', 'utils', 'constants', 'plugins']) {
  function visit(dir) {
    if (!fs.existsSync(path.join(root, dir))) return;
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const name = dir + '/' + entry.name;
      if (entry.isDirectory()) visit(name);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(name))
        assert.ok(!/passwordPolicy|liveReadiness|devWiring/.test(read(name)), 'Offline Password policy or readiness packet referenced by runtime');
    }
  }
  visit(directory);
}
assert.ok(!/process\.env|fetch\s*\(|require\s*\(/.test(read('offline/cad-convex/passwordPolicy.ts')));

console.log(`CAD source audit passed: ${files.length} files, zero leak pattern matches; internal-only and runtime isolation checks passed`);
