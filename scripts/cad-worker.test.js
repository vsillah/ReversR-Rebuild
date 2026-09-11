const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { Worker } = require('node:worker_threads');
const express = require('express');
const { createWorkerService, createWorkerRouter } = require('../server/cadWorkerImport');
const { LIMITS, meshPayload } = require('../server/cadWorkerContract');
const probe = path.join(__dirname, 'fixtures/cad-worker-probe.js');
function source() {
  const directory = path.join(path.dirname(require.resolve('occt-import-js/package.json')), 'test/testfiles/cube-10x10mm');
  const name = fs.readdirSync(directory).find(value => /\.igs$/i.test(value));
  return { fileName: 'cube' + '.igs', contentBase64: fs.readFileSync(path.join(directory, name)).toString('base64') };
}
async function http(t, service, enabled = true) {
  const app = express();
  app.use('/api/cad', createWorkerRouter({ qualificationEnabled: enabled, service }));
  const listener = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { listener.close(resolve); listener.closeAllConnections(); }));
  await once(listener, 'listening');
  const url = `http://127.0.0.1:${listener.address().port}/api/cad/import`;
  return async body => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
}
function controlled(mode, extra = {}, timeoutMs = 300) {
  const workers = [];
  const service = createWorkerService({ timeoutMs, makeWorker(options) {
    const worker = new Worker(probe, { ...options, workerData: { ...options.workerData, mode, ...extra } });
    workers.push(worker); return worker;
  } });
  return { service, workers };
}

test('public cube converts through HTTP; transport-denied Worker terminates after success', async t => {
  const { service, workers } = controlled('convert', {}, LIMITS.timeoutMs);
  const post = await http(t, service);
  const first = await post(source()), second = await post(source());
  assert.equal(first.status, 200);
  assert.equal(first.body.triangleCount, 12);
  assert.deepEqual(first.body, second.body);
  assert.equal(first.body.sourceConfidence.status, 'unqualified');
  assert.equal(first.body.source.bytes, 11562);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.equal(service.activeCount(), 0);
  assert.ok(workers.every(worker => worker.threadId === -1));
});

test('input errors do not launch a Worker; disabled router fails closed', async t => {
  let calls = 0;
  const service = createWorkerService({ makeWorker() { calls++; throw new Error('Must not run'); } });
  const post = await http(t, service);
  const valid = source();
  for (const [input, status, code] of [
    [{}, 400, 'NO_SOURCE'],
    [{ ...valid, fileName: 'image' + '.jpg' }, 415, 'UNSUPPORTED'],
    [{ ...valid, contentBase64: '!!!!' }, 400, 'MALFORMED'],
    [{ ...valid, contentBase64: Buffer.from('not CAD').toString('base64') }, 400, 'MALFORMED'],
    [{ ...valid, contentBase64: Buffer.alloc(LIMITS.inputBytes + 1).toString('base64') }, 413, 'TOO_LARGE'],
    [{ ...valid, extra: 'not accepted' }, 400, 'MALFORMED'],
    ['{', 400, 'MALFORMED'],
    [' '.repeat(LIMITS.jsonBytes + 1), 413, 'TOO_LARGE'],
  ]) {
    const response = await post(input);
    assert.equal(response.status, status, response.body.code);
    assert.equal(response.body.code, code);
  }
  const disabled = await http(t, service, false);
  assert.equal((await disabled(valid)).body.code, 'DISABLED');
  assert.equal(calls, 0);
});

test('hanging Worker times out through HTTP while parent timer runs; capacity released', async t => {
  const { service, workers } = controlled('hang');
  const post = await http(t, service);
  let ticks = 0;
  const heartbeat = setInterval(() => ticks++, 5);
  t.after(() => clearInterval(heartbeat));
  const response = await post(source());
  assert.equal(response.status, 504);
  assert.equal(response.body.code, 'TIMEOUT');
  assert.ok(ticks > 2);
  assert.equal(workers[0].threadId, -1);
  assert.equal(service.activeCount(), 0);
});

test('hanging WASM is also terminated from the parent event loop', async () => {
  const { service, workers } = controlled('wasm-hang');
  await assert.rejects(service.convert(source()), { code: 'TIMEOUT' });
  assert.equal(workers[0].threadId, -1);
  assert.equal(service.activeCount(), 0);
});

test('cancel and busy handling wait for Worker termination', async () => {
  const { service, workers } = controlled('hang', {}, 2000);
  const controller = new AbortController();
  const pending = service.convert(source(), controller.signal);
  const rejection = assert.rejects(pending, { code: 'CANCELLED' });
  await once(workers[0], 'online');
  await assert.rejects(service.convert(source()), { code: 'BUSY' });
  controller.abort();
  await rejection;
  assert.equal(workers[0].threadId, -1);
  assert.equal(service.activeCount(), 0);
  await assert.rejects(service.convert(source(), controller.signal), { code: 'CANCELLED' });
  assert.equal(workers.length, 1);
});

test('worker crash, exit and invalid output fail closed and release capacity', async () => {
  for (const [mode, extra, code] of [
    ['crash', {}, 'RUNTIME_UNAVAILABLE'], ['exit', {}, 'CONVERSION_FAILED'],
    ['message', { message: '{' }, 'CONVERSION_FAILED'],
    ['message', { message: 'x'.repeat(LIMITS.outputBytes + 1) }, 'OUTPUT_LIMIT'],
    ['message', { message: JSON.stringify({ status: 'ready', meshes: [] }) }, 'NO_GEOMETRY'],
  ]) {
    const { service, workers } = controlled(mode, extra, 2000);
    await assert.rejects(service.convert(source()), { code });
    assert.equal(service.activeCount(), 0);
    assert.equal(workers[0].threadId, -1);
  }
});

test('geometry count and index validation enforce output limits', () => {
  const triangle = { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] };
  assert.throws(() => meshPayload(Array(LIMITS.meshes + 1).fill(triangle)), { code: 'OUTPUT_LIMIT' });
  assert.throws(() => meshPayload([{ ...triangle, positions: Array((LIMITS.vertices + 1) * 3).fill(0) }]), { code: 'OUTPUT_LIMIT' });
  assert.throws(() => meshPayload([{ ...triangle, indices: Array((LIMITS.triangles + 1) * 3).fill(0) }]), { code: 'OUTPUT_LIMIT' });
  assert.throws(() => meshPayload([{ ...triangle, indices: [0, 1, 99] }]), { code: 'INVALID_GEOMETRY' });
  assert.throws(() => meshPayload([{ ...triangle, positions: [NaN, ...triangle.positions.slice(1)] }]), { code: 'INVALID_GEOMETRY' });
});

test('WASM can exceed the JS resource limit: production memory gate remains unresolved', async () => {
  const worker = new Worker(probe, { workerData: { mode: 'memory' }, resourceLimits: { maxOldGenerationSizeMb: 16 } });
  try {
    const [report] = await once(worker, 'message');
    assert.equal(report.wasmBytes, 32 * 1024 * 1024);
    assert.ok(report.wasmBytes > worker.resourceLimits.maxOldGenerationSizeMb * 1024 * 1024);
  } finally { await worker.terminate(); }
});

test('worker request dependency graph has only approved local and packaged imports', () => {
  const expected = {
    'cadWorkerImport.js': ['express', 'node:path', 'node:worker_threads', './cadWorkerContract'],
    'cadMeshWorker.js': ['node:worker_threads', 'node:fs', './cadWorkerContract', 'occt-import-js'],
    'cadWorkerContract.js': ['node:crypto'],
  };
  for (const [name, imports] of Object.entries(expected)) {
    const text = fs.readFileSync(path.join(__dirname, '../server', name), 'utf8');
    assert.deepEqual([...text.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match => match[1]), imports);
    assert.doesNotMatch(text, /child_process|\bDocker\b|fetch\s*\(|\bimport\s*\(|igesSourcePipeline|cadImportProcessor|cadImport\.js/);
    assert.doesNotMatch(text, /(?:writeFile|mkdir|mkdtemp|spawn|execFile)\s*\(/);
  }
});
