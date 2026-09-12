const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { once } = require('node:events');
const ts = require('typescript');
const { getCadReadiness } = require('../server/cadReadiness');

const root = path.resolve(__dirname, '..');
const readinessSource = fs.readFileSync(path.join(root, 'server/cadReadiness.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server/index.js'), 'utf8');

function assertDisabled(payload) {
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.enabled, false);
  assert.equal(payload.routeMounted, false);
  assert.equal(payload.mode, 'worker-qualified-disabled');
  assert.equal(payload.blocker.code, 'WORKER_WASM_MEMORY_UNBOUNDED');
  assert.ok(payload.blocker.reason.includes('WASM memory'));
  assert.ok(payload.blocker.qualification.includes('local Worker'));
  assert.equal(payload.workerQualification.localOnly, true);
  assert.equal(payload.workerQualification.wasmMemoryCapped, false);
  assert.equal(payload.workerQualification.hostedPackagingQualified, false);
  assert.equal(payload.executor.metadataQualified, true);
  assert.equal(payload.executor.implementationCommit, 'bf80b32777d22be822db0fca095af0e89ea515e5');
  assert.equal(payload.executor.evidenceCommit, '8ab9edfeb0825bd57091ecaf3c0acbf904596582');
  assert.ok(payload.executor.evidence);
  assert.equal(payload.proven.length, 4);
  for (const scope of ['Hosted', 'Native', 'Supplied', 'Provider', 'expiry', 'production']) {
    assert.ok(payload.unproven.some(value => value.includes(scope)));
  }
  assert.match(payload.nextGate, /Explicit approval/);
  for (const gate of ['hosted CAD', 'native/provider', 'CAD-file', 'deployment', 'production']) {
    assert.ok(payload.nextGate.includes(gate));
  }
}

test('readiness is disabled, dependency-free and independent of environment flags', () => {
  // No imports of any kind are permitted, so the route cannot load a CAD pipeline.
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, readinessSource);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.Identifier || token === ts.SyntaxKind.ImportKeyword) {
      assert.ok(!['require', 'import', 'process', 'eval', 'Function'].includes(scanner.getTokenText()));
    }
  }
  const isolated = { module: { exports: {} } };
  vm.runInNewContext(readinessSource, isolated);
  assertDisabled(isolated.module.exports.getCadReadiness());
  const changed = getCadReadiness();
  changed.enabled = true;
  changed.executor.metadataQualified = false;
  changed.proven.length = 0;
  assertDisabled(getCadReadiness());
});

function loadServer(env) {
  const localRequire = createRequire(path.join(root, 'server/index.js'));
  const unexpectedCall = () => { throw new Error('Provider work is forbidden in this test'); };
  const mockRequire = (id) => {
    if (id === '@google/genai') return { GoogleGenAI: unexpectedCall, Type: {}, Modality: {} };
    if (id === 'ollama') return { Ollama: class { constructor() {} chat = unexpectedCall; } };
    if (id === './commercialization') return {
      chargeCommercialCredits: unexpectedCall,
      handleStripeWebhook: unexpectedCall,
      registerCommercialRoutes: () => {},
    };
    return localRequire(id);
  };
  const context = {
    require: mockRequire, module: { exports: {} }, process: { env },
    console, Buffer, URL, __dirname: path.join(root, 'server'),
  };
  vm.runInNewContext(serverSource, context);
  return context.module.exports;
}

test('actual server Sandbox handler stays disabled and inherits CORS', async (t) => {
  const app = loadServer({
    API_CORS_ORIGINS: 'https://allowed.example',
    CAD_IMPORT_ENABLED: 'true', VERCEL: '1', CAD_IMPORT_RUNTIME: 'test-runtime',
  });
  app.use((error, req, res, next) => res.status(500).json({ error: error.message }));
  const listener = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { listener.close(resolve); listener.closeAllConnections(); }));
  await once(listener, 'listening');
  const url = `http://127.0.0.1:${listener.address().port}`;
  const response = await fetch(`${url}/api/cad/capabilities`, { headers: { Origin: 'https://allowed.example' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://allowed.example');
  const status = await response.json();
  assert.equal(status.enabled, false);
  assert.equal(status.configured, false);
  assert.equal(status.routeMounted, true);
  assert.equal(status.blocker.code, 'SANDBOX_GATE_MISSING');
  const blocked = await fetch(`${url}/api/cad/capabilities`, { headers: { Origin: 'https://blocked.example' } });
  assert.equal(blocked.status, 500);
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  const preflight = await fetch(`${url}/api/cad/capabilities`, {
    method: 'OPTIONS', headers: { Origin: 'https://allowed.example', 'Access-Control-Request-Method': 'GET' },
  });
  assert.equal(preflight.status, 204);
  const denied = await fetch(`${url}/api/cad/import`, { method: 'POST' });
  assert.equal(denied.status, 503);
  assert.equal((await denied.json()).code, 'DISABLED');
  for (const route of ['/api/cad/import-source-record', '/api/cad/capabilities']) {
    const rejected = await fetch(`${url}${route}`, { method: 'POST' });
    assert.equal(rejected.status, 404);
  }
});

test('public slice contains only allowed source files and no private artifacts or runtime imports', () => {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const base = git('merge-base', 'HEAD', 'origin/main').trim();
  const files = [...new Set([
    ...git('diff', '--name-only', base).trim().split('\n'),
    ...git('ls-files', '--others', '--exclude-standard').trim().split('\n'),
  ].filter(Boolean))];
  const allowed = ['server/cadReadiness.js', 'server/index.js', 'scripts/cad-readiness.test.js', 'docs/cad-capabilities.md', 'scripts/cad-stock-qualification.js', 'server/cadWorkerContract.js', 'server/cadMeshWorker.js', 'server/cadWorkerImport.js', 'scripts/cad-worker.test.js', 'scripts/fixtures/cad-worker-probe.js', 'package.json', 'package-lock.json', 'server/cadSandboxConfig.js', 'server/cadSandboxExecutor.js', 'server/cadSandboxRouter.js', 'server/cadSandboxRunner.js', 'scripts/cad-sandbox-diagnostic.js', 'scripts/cad-sandbox.test.js', 'vercel.json', 'scripts/cad-fixture-qualification.js', 'scripts/cad-live-hosted-fixture-matrix.js', 'scripts/cad-fixture-qualification.test.js', 'scripts/fixtures/cad-mit-source.js', 'scripts/fixtures/cad-vibe-source.js', 'scripts/fixtures/cad-poseidon-sources.js', 'scripts/fixtures/poseidon-bsd/Pump Cover Slide.iges', 'scripts/fixtures/poseidon-bsd/Pump Syringe Brace.iges', 'scripts/fixtures/poseidon-bsd/LICENSE', 'scripts/fixtures/vibe-mit/solid.igs', 'scripts/fixtures/vibe-mit/LICENSE', 'scripts/fixtures/kantoku-mit/sample.igs', 'scripts/fixtures/kantoku-mit/LICENSE', 'scripts/fixtures/cad-public-matrix.json', 'docs/cad-fixture-qualification.md', 'docs/cad-fixture-qualification-evidence.json', 'docs/cad-live-hosted-public-fixture-matrix-evidence.json'];
  for (const file of files) assert.ok(allowed.includes(file), `Unexpected public file: ${file}`);
  // Preserve the authorized upstream bytes, including IGES fixed-width whitespace.
  // These public assets are checked byte-for-byte instead of scanned as source code.
  const assets = new Map([
    ['scripts/fixtures/poseidon-bsd/Pump Cover Slide.iges', [48357, '054992f5b7cd0fc3cd2f2f2ac8358b329708b7573a6ee154d9ddf128b1ff0402']],
    ['scripts/fixtures/poseidon-bsd/Pump Syringe Brace.iges', [40824, 'ffa127dfd22931f5b518b466a49dca91b4d35fa1361ead8dba37dd6b7868a60c']],

    ['scripts/fixtures/kantoku-mit/sample.igs', [24948, 'f2ebe63992eaf1f91b33d1f1773b3fa0ad5eb2fe66f1a477fb5f86f0427e1893']],
    ['scripts/fixtures/vibe-mit/solid.igs', [12393, 'd1e88b9e5ab38751e22bda59977d4aa37fd523040f75bc8a2f3428b50f562d71']],
  ]);
  for (const [asset, [bytes, sha256]] of assets) {
    const assetBytes = fs.readFileSync(path.join(root, asset));
    assert.equal(assetBytes.length, bytes);
    assert.equal(require('node:crypto').createHash('sha256').update(assetBytes).digest('hex'), sha256);
  }
  const patch = git('diff', '--unified=0', base, '--', ...allowed.filter(file => !assets.has(file)));
  const additions = patch.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).join('\n');
  const untracked = git('ls-files', '--others', '--exclude-standard').trim().split('\n').filter(Boolean);
  const publicText = [additions, ...untracked.filter(file => !assets.has(file)).map(file => fs.readFileSync(path.join(root, file), 'utf8'))].join('\n');
  const forbidden = [
    /\/(?:Users|home)\/[\w.-]+/,
    new RegExp('Down' + 'loads'),
    /\.local\//,
    /[\w-]+\.(?:igs|iges|jpe?g)\b/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\b(?:sk|ghp)[_-][A-Za-z0-9]{20,}\b/,
  ];
  // Exact public/synthetic fixture names are permitted; arbitrary CAD names remain forbidden.
  const fixtureSafeText = publicText.replace(/Cube 10x10\.igs|public-cube\.iges|public-cube\.igs|public-cube\.jpg|public\.igs|source\.igs|sample\.igs|solid\.igs|Pump Cover Slide\.iges|Pump Syringe Brace\.iges|Pump%20Cover%20Slide\.iges|Pump%20Syringe%20Brace\.iges/g, '[fixture]');
  for (const pattern of forbidden) assert.doesNotMatch(fixtureSafeText, pattern);
  const addedServer = git('diff', '--unified=0', base, '--', 'server/index.js')
    .split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).join('\n');
  const requires = [...addedServer.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
  assert.ok(requires.every(id => id === './cadSandboxRouter'));
  assert.ok(serverSource.includes("require('./cadSandboxRouter')"));
  assert.doesNotMatch(addedServer, /\bimport\b|igesSourcePipeline|cadImportProcessor|child_process/);
});
