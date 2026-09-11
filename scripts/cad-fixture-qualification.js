// Local HTTP contract qualification. Never creates a provider Sandbox.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');
const express = require('express');
const { Worker } = require('node:worker_threads');
const { createSandboxRouter } = require('../server/cadSandboxRouter');
const { createSandboxExecutor } = require('../server/cadSandboxExecutor');
const { createWorkerService } = require('../server/cadWorkerImport');
const { LIMITS, meshPayload } = require('../server/cadWorkerContract');
const matrix = require('./fixtures/cad-public-matrix.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const token = crypto.randomBytes(32).toString('hex');
const privateSentinel = '/private/qualification-sentinel/source.igs';
// Deliberately isolated from process.env and real credentials.
const env = { CAD_IMPORT_EXECUTOR: 'sandbox', VERCEL: '1', CAD_SANDBOX_LIVE_QUALIFIED: 'true', CAD_SANDBOX_ACCESS_TOKEN: token };
function fixtureBody(bytes, mutation) {
  const body = { fileName: 'public-cube.igs', contentBase64: bytes.toString('base64') };
  switch (mutation) {
    case 'none': break;
    case 'extension': body.fileName = 'public-cube.iges'; break;
    case 'crlf': body.contentBase64 = Buffer.from(bytes.toString().replace(/\r?\n/g, '\r\n')).toString('base64'); break;
    case 'text': body.contentBase64 = Buffer.from('synthetic malformed IGES').toString('base64'); break;
    case 'base64': body.contentBase64 = '%%%'; break;
    case 'empty': return {};
    case 'unsupported': body.fileName = 'public-cube.jpg'; break;
    case 'path': body.fileName = privateSentinel; break;
    case 'transform': {
      const rows = bytes.toString().split(/\r?\n/);
      const i = rows.findIndex(row => row[72] === 'D');
      rows[i] = rows[i].slice(0, 48) + '       1' + rows[i].slice(56);
      body.contentBase64 = Buffer.from(rows.join('\n')).toString('base64'); break;
    }
    case 'sourceLimit': body.contentBase64 = Buffer.alloc(LIMITS.inputBytes + 1, 32).toString('base64'); break;
    case 'jsonLimit': return ' '.repeat(LIMITS.jsonBytes + 1);
    case 'json': return '{';
    default: throw new Error('UNKNOWN_MATRIX_MUTATION');
  }
  return body;
}
// The provider interface is simulated; geometry comes from the real fixed OCCT worker.
function localExecutor() {
  const worker = createWorkerService({ makeWorker: options => new Worker(
    path.join(__dirname, 'fixtures/cad-worker-probe.js'), options) });
  let dispatches = 0, stops = 0;
  const executor = createSandboxExecutor({ env, create: async () => {
    dispatches++;
    let bytes, result;
    return {
      persistent: false, vcpus: 1, memory: 2048, timeout: 60000, networkPolicy: 'deny-all',
      async writeFiles(files) { bytes = files.find(file => file.path.endsWith('/source.bin')).content; },
      async runCommand() {
        try {
          const converted = await worker.convert({ fileName: 'public.igs', contentBase64: bytes.toString('base64') });
          result = { status: 'ready', sourceSha256: sha(bytes), guestMemoryBytes: 1, meshes: converted.meshes };
        } catch (error) { result = { status: 'error', code: error.code }; }
        return { exitCode: 0 };
      },
      async readFileToBuffer() { return Buffer.from(JSON.stringify(result)); },
      async stop() { stops++; return { status: 'stopped' }; },
    };
  } });
  return { executor, counts: () => ({ dispatches, stops }) };
}
async function withRoute(config, executor, fn) {
  const app = express();
  app.use('/api/cad', createSandboxRouter({ env: config, executor }));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/cad`;
    await fn(async (body, authorization = `Bearer ${token}`) => {
      const response = await fetch(`${base}/${body === undefined ? 'capabilities' : 'import'}`, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const raw = await response.text();
      assert.ok(!raw.includes(token) && !raw.includes(privateSentinel));
      return { status: response.status, body: JSON.parse(raw) };
    });
  } finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
}
// Evidence is an explicit allowlist; never serialize response diagnostics, messages or paths.
function evidenceRow(id, status, passed) {
  assert.match(id, /^[a-z0-9-]+$/);
  assert.ok(Number.isInteger(status) && status >= 100 && status <= 599);
  assert.equal(typeof passed, 'boolean');
  return { id, httpStatus: status, passed };
}
async function qualify() {
  const packageRoot = path.dirname(require.resolve('occt-import-js/package.json'));
  assert.equal(matrix.fixture, 'test/testfiles/cube-10x10mm/Cube 10x10.igs');
  const bytes = fs.readFileSync(path.join(packageRoot, matrix.fixture));
  assert.equal(sha(bytes), matrix.sha256);
  const report = { schemaVersion: 1, status: 'pass', scope: 'local-http-real-occt-simulated-provider',
    generatedAt: new Date().toISOString(), packageVersion: require('occt-import-js/package.json').version,
    fixtureSha256: sha(bytes), fixtureBytes: bytes.length, matrixSha256: sha(JSON.stringify(matrix)),
    providerCalls: 0, privateFilesRead: 0, checks: [],
    unproven: ['Live hosted execution of this matrix', 'Provider isolation and cleanup', 'Additional independent IGES models', 'Render, STL and dimensional fidelity'] };
  const check = async (id, fn) => {
    try { const status = await fn(); report.checks.push(evidenceRow(id, status, true)); }
    catch { report.checks.push({ id, passed: false }); report.status = 'fail'; }
  };
  const local = localExecutor();
  await withRoute(env, local.executor, async request => {
    await check('configured-capabilities', async () => {
      const r = await request(); assert.equal(r.status, 200); assert.equal(r.body.enabled, true);
      assert.equal(r.body.configured, true); assert.equal(r.body.blocker, null); return r.status;
    });
    for (const [id, auth] of [['missing-auth', ''], ['invalid-auth', 'Bearer invalid']]) {
      await check(id, async () => {
        const before = local.counts(); const r = await request(fixtureBody(bytes, 'none'), auth);
        assert.equal(r.status, 401); assert.equal(r.body.code, 'UNAUTHORIZED');
        assert.equal(r.body.diagnostic, undefined); assert.deepEqual(local.counts(), before); return r.status;
      });
    }
    for (const entry of matrix.cases) await check(entry.id, async () => {
      const before = local.counts(); const body = fixtureBody(bytes, entry.mutation); const r = await request(body);
      assert.equal(r.status, entry.status);
      if (entry.code) assert.equal(r.body.code, entry.code);
      else {
        assert.equal(r.body.status, 'ready'); assert.equal(r.body.source.sha256, sha(Buffer.from(body.contentBase64, 'base64')));
        const geometry = meshPayload(r.body.meshes);
        assert.equal(geometry.triangleCount, 12); assert.equal(geometry.vertexCount, 24);
        assert.equal(r.body.triangleCount, geometry.triangleCount); assert.equal(r.body.vertexCount, geometry.vertexCount);
        assert.equal(r.body.sourceConfidence.status, 'unqualified'); assert.equal(r.body.execution.cleanup, 'stopped');
      }
      assert.equal(local.counts().dispatches - before.dispatches, entry.dispatches);
      assert.equal(local.counts().stops - before.stops, entry.dispatches); return r.status;
    });
  });
  const gates = [
    ['missing-executor', { ...env, CAD_IMPORT_EXECUTOR: '' }],
    ['invalid-executor', { ...env, CAD_IMPORT_EXECUTOR: 'unknown' }],
    ['missing-credentials', { ...env, VERCEL: '' }],
    ['missing-qualification', { ...env, CAD_SANDBOX_LIVE_QUALIFIED: '' }],
    ['missing-token', { ...env, CAD_SANDBOX_ACCESS_TOKEN: '' }],
    ['invalid-token', { ...env, CAD_SANDBOX_ACCESS_TOKEN: 'short' }],
  ];
  for (const [id, config] of gates) await withRoute(config, local.executor, async request => {
    await check(id, async () => {
      const before = local.counts(); const caps = await request();
      assert.equal(caps.status, 200); assert.equal(caps.body.enabled, false); assert.equal(caps.body.configured, false);
      const r = await request(fixtureBody(bytes, 'none')); assert.equal(r.status, 503); assert.equal(r.body.code, 'DISABLED');
      assert.deepEqual(local.counts(), before); return r.status;
    });
  });
  await check('evidence-redaction', async () => {
    const malicious = { diagnostic: { token, path: privateSentinel }, message: token };
    const row = evidenceRow('redaction-probe', 422, true, malicious);
    assert.deepEqual(Object.keys(row), ['id', 'httpStatus', 'passed']);
    assert.ok(!JSON.stringify(row).includes(token) && !JSON.stringify(row).includes(privateSentinel)); return 200;
  });
  report.simulatedDispatches = local.counts().dispatches;
  const serialized = JSON.stringify(report, null, 2) + '\n';
  assert.ok(!serialized.includes(token) && !serialized.includes(privateSentinel));
  return { report, serialized };
}
async function main() {
  if (process.argv.slice(2).some(arg => arg !== '--write')) throw new Error('UNSUPPORTED_ARGUMENT');
  const { report, serialized } = await qualify();
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(__dirname, '../docs/cad-fixture-qualification-evidence.json'), serialized);
  console.log(serialized);
  if (report.status !== 'pass') process.exitCode = 1;
}
if (require.main === module) main().catch(() => { console.error('CAD_FIXTURE_QUALIFICATION_FAILED: inspect local dependency and matrix setup; raw errors suppressed.'); process.exitCode = 1; });
module.exports = { qualify, evidenceRow, fixtureBody };
