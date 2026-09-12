const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { EventEmitter, once } = require('node:events');
const express = require('express');
const { createSandboxExecutor } = require('../server/cadSandboxExecutor');
const { createSandboxRouter } = require('../server/cadSandboxRouter');
const { assets, sandboxReadiness, SANDBOX_LIMITS } = require('../server/cadSandboxConfig');
const { LIMITS } = require('../server/cadWorkerContract');
const env = { CAD_IMPORT_EXECUTOR: 'sandbox', VERCEL: '1', CAD_SANDBOX_LIVE_QUALIFIED: 'true', CAD_SANDBOX_ACCESS_TOKEN: 't'.repeat(40) };
function source() {
  const directory = path.join(path.dirname(require.resolve('occt-import-js/package.json')), 'test/testfiles/cube-10x10mm');
  const file = fs.readdirSync(directory).find(name => /\.igs$/i.test(name));
  return { fileName: 'cube' + '.igs', contentBase64: fs.readFileSync(path.join(directory, file)).toString('base64') };
}
function igesRow(section, sequence, body = '') {
  return body.padEnd(72, ' ').slice(0, 72) + section + String(sequence).padStart(7, ' ');
}
function externalReferenceIges(targetBytes = 145140) {
  const rows = [
    igesRow('S', 1, 'large synthetic private-size preflight'),
    igesRow('G', 1, ','),
    igesRow('D', 1, '     416'),
    igesRow('D', 2),
  ];
  for (let i = 1; Buffer.byteLength(rows.join('\n') + '\n' + igesRow('T', 1)) <= targetBytes; i++) {
    rows.push(igesRow('P', i, `${i},`));
  }
  rows.push(igesRow('T', 1));
  const bytes = Buffer.from(rows.join('\n') + '\n', 'ascii');
  assert.ok(bytes.length > 145140 && bytes.length < LIMITS.inputBytes);
  return { fileName: 'external-reference-synthetic' + '.ig' + 's', contentBase64: bytes.toString('base64') };
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function eventStream(value) {
  const stream = new EventEmitter();
  stream.destroy = () => {};
  process.nextTick(() => { stream.emit('data', Buffer.from(value)); stream.emit('end'); });
  return stream;
}
function fake(mode, options = {}) {
  const calls = [];
  let files;
  const sandbox = { persistent: false, vcpus: 1, memory: 2048, timeout: SANDBOX_LIMITS.lifetimeMs,
    async writeFiles(value, opts) { calls.push(['write', value, opts]); files = value; if (mode === 'write-error') throw new Error('provider secret diagnostic'); },
    async runCommand(value) { calls.push(['run', value]); if (mode === 'hang') return new Promise(() => {}); return { exitCode: ['nonzero', 'nonzero-stop-error'].includes(mode) ? 1 : 0 }; },
    result() {
      const bytes = files.find(file => file.path.endsWith('/source.bin')).content;
      const data = { status: 'ready', sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'), guestMemoryBytes: 1900 * 1024 * 1024,
        meshes: [{ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] }] };
      if (mode === 'guest-memory-report') data.guestMemoryBytes = 2398654464;
      if (mode === 'binding') data.sourceSha256 = 'wrong';
      if (mode === 'geometry') data.meshes[0].indices = [0, 1, 99];
      if (mode === 'empty') data.meshes = [];
      if (mode === 'guest-diagnostic') return { status: 'error', code: 'CONVERSION_FAILED', diagnostic: { phase: 'read_iges', source: { bytes: 11562, sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3' }, wasm: { bytes: 7604031, sha256: '33391fc9d94ea5c869a6718488bf0a9a464222bac9bdc764dfe1690cef281952' }, occtResult: { success: false, meshCount: 0 }, error: 'CONVERSION_FAILED' } };
      if (mode === 'guest-error-no-diagnostic') return { status: 'error', code: 'CONVERSION_FAILED' };
      return data;
    },
    async readFile(value) {
      calls.push(['read', value]);
      if (mode === 'missing') return null;
      if (mode === 'oversize') return Readable.from([Buffer.alloc(LIMITS.outputBytes), Buffer.from('x')]);
      if (mode === 'malformed') return Readable.from(['{']);
      const data = sandbox.result();
      if (mode === 'event-stream') return eventStream(JSON.stringify(data));
      return Readable.from([JSON.stringify(data)]);
    },
    async stop(opts) { calls.push(['stop', opts]); if (['stop-error', 'nonzero-stop-error'].includes(mode)) throw new Error('cleanup failed'); if (mode === 'stop-hang') return new Promise(() => {}); return mode === 'snapshot' ? { status: 'stopped', snapshot: {} } : { status: 'stopped' }; },
  };
  if (mode === 'buffer') sandbox.readFileToBuffer = async value => { calls.push(['read-buffer', value]); return Buffer.from(JSON.stringify(sandbox.result())); };
  if (mode === 'persistent') sandbox.persistent = true;
  if (mode === 'memory') sandbox.memory = 4096;
  const create = async value => { calls.push(['create', value]); if (mode === 'create-error') throw new Error('provider secret diagnostic'); if (mode === 'late') await pause(60); return sandbox; };
  return { calls, executor: createSandboxExecutor({ env, create, requestMs: 1000, cleanupMs: 50, ...options }) };
}
async function app(t, config = env, executor) {
  const server = express();
  server.use('/api/cad', createSandboxRouter({ env: config, executor }));
  const listener = server.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { listener.close(resolve); listener.closeAllConnections(); }));
  await once(listener, 'listening');
  return `http://127.0.0.1:${listener.address().port}/api/cad`;
}
async function post(url, body, authorization = `Bearer ${env.CAD_SANDBOX_ACCESS_TOKEN}`) {
  const response = await fetch(`${url}/import`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test('fake Sandbox enforces fixed request, bounded output and confirmed stop through HTTP', async t => {
  const { calls, executor } = fake();
  const url = await app(t, env, executor);
  const caps = await (await fetch(`${url}/capabilities`)).json();
  assert.equal(caps.enabled, true); assert.equal(caps.routeMounted, true); assert.equal(caps.configured, true);
  assert.equal(caps.sandbox.liveQualification, 'operator-attested');
  assert.equal(caps.workerQualification.hostedPackagingQualified, true);
  assert.equal(caps.workerQualification.livePublicFixtureMatrixQualified, true);
  assert.ok(caps.proven.some(value => value.includes('Live hosted public fixture matrix')));
  assert.ok(caps.proven.some(value => value.includes('without hosted Sandbox dispatch')));
  assert.ok(caps.nextGate.includes('Private CAD'));
  assert.ok(!caps.nextGate.includes('configuring the protected route'));
  assert.ok(!caps.unproven.some(value => value.includes('Broader public fixture matrix')));
  assert.ok(!caps.unproven.some(value => value.includes('production smoke')));
  for (const scope of ['Private CAD', 'Arbitrary-model', 'Render and STL', 'Dimensional/manufacturing']) {
    assert.ok(caps.unproven.some(value => value.includes(scope)));
  }
  const response = await post(url, source());
  assert.equal(response.status, 200); assert.equal(response.body.triangleCount, 1);
  assert.equal(response.body.execution.cleanup, 'stopped');
  assert.equal(response.body.sourceConfidence.status, 'unqualified');
  assert.deepEqual(calls.map(call => call[0]), ['create', 'write', 'run', 'read', 'stop']);
  const request = calls[0][1];
  assert.equal(request.persistent, false); assert.equal(request.networkPolicy, 'deny-all');
  assert.deepEqual(request.resources, { vcpus: 1 }); assert.equal(request.timeout, 60000);
  assert.equal(request.runtime, 'node24'); assert.equal(request.region, 'iad1');
  assert.deepEqual(request.env, {}); assert.deepEqual(request.ports, []);
  assert.equal(request.token, undefined); assert.equal(request.source, undefined);
  const files = calls[1][1];
  assert.equal(files.length, 7); assert.ok(files.every(file => file.mode === 0o600));
  assert.ok(files.every(file => file.path.startsWith('/vercel/sandbox/')));
  assert.ok(!JSON.stringify(calls).includes(env.CAD_SANDBOX_ACCESS_TOKEN));
  assert.equal(calls[2][1].timeoutMs, 10000); assert.equal(calls[2][1].sudo, false);
  assert.equal(executor.activeCount(), 0);
});

test('missing gates and unauthorized/invalid requests never create a Sandbox', async t => {
  const { calls, executor } = fake();
  for (const config of [{}, { ...env, CAD_IMPORT_EXECUTOR: '' }, { ...env, CAD_SANDBOX_LIVE_QUALIFIED: '' }, { ...env, CAD_SANDBOX_ACCESS_TOKEN: '' }, { ...env, VERCEL: '' }]) {
    const url = await app(t, config, executor);
    const caps = await (await fetch(`${url}/capabilities`)).json();
    assert.equal(caps.enabled, false); assert.equal(caps.configured, false); assert.ok(caps.blocker.missing.length);
    assert.equal((await post(url, source())).body.code, 'DISABLED');
  }
  const url = await app(t, env, executor);
  assert.equal((await post(url, source(), '')).status, 401);
  for (const [body, code] of [[{}, 'NO_SOURCE'], ['{', 'MALFORMED'], [{ ...source(), fileName: 'image' + '.jpg' }, 'UNSUPPORTED'], [{ ...source(), contentBase64: Buffer.alloc(LIMITS.inputBytes + 1).toString('base64') }, 'TOO_LARGE'], [externalReferenceIges(), 'UNSUPPORTED'], [' '.repeat(LIMITS.jsonBytes + 1), 'TOO_LARGE']]) {
    assert.equal((await post(url, body)).body.code, code);
  }
  assert.equal(calls.length, 0);
});

test('SDK and result failures always stop a created VM and return sanitized codes', async () => {
  for (const [mode, code] of [['create-error', 'RUNTIME_UNAVAILABLE'], ['write-error', 'RUNTIME_UNAVAILABLE'], ['nonzero', 'CONVERSION_FAILED'], ['missing', 'CONVERSION_FAILED'], ['oversize', 'OUTPUT_LIMIT'], ['malformed', 'RUNTIME_UNAVAILABLE'], ['binding', 'INVALID_GEOMETRY'], ['geometry', 'INVALID_GEOMETRY'], ['empty', 'NO_GEOMETRY'], ['persistent', 'RUNTIME_UNAVAILABLE'], ['memory', 'RUNTIME_UNAVAILABLE']]) {
    const { calls, executor } = fake(mode);
    await assert.rejects(executor.convert(source()), { code });
    assert.equal(calls.filter(call => call[0] === 'stop').length, mode === 'create-error' ? 0 : 1);
    assert.equal(executor.activeCount(), 0);
  }
});

test('nonzero Sandbox commands include command-exit diagnostics', async () => {
  const { executor } = fake('nonzero');
  await assert.rejects(() => executor.convert(source()), error => {
    assert.equal(error.code, 'CONVERSION_FAILED');
    assert.equal(error.diagnostic.phase, 'command_exit');
    assert.equal(error.diagnostic.exitCode, 1);
    return true;
  });
});

test('primary conversion diagnostics are preserved when cleanup also fails', async () => {
  const { executor } = fake('nonzero-stop-error');
  await assert.rejects(() => executor.convert(source()), error => {
    assert.equal(error.code, 'CONVERSION_FAILED');
    assert.equal(error.diagnostic.phase, 'command_exit');
    assert.equal(error.diagnostic.exitCode, 1);
    return true;
  });
  assert.equal(executor.cleanupBlocked(), true);
  await assert.rejects(executor.convert(source()), { code: 'CLEANUP_FAILED' });
});

test('executor adds stage diagnostics when guest errors omit details', async () => {
  const { executor } = fake('guest-error-no-diagnostic');
  await assert.rejects(() => executor.convert(source()), error => {
    assert.equal(error.code, 'CONVERSION_FAILED');
    assert.equal(error.diagnostic.phase, 'executor_error');
    assert.equal(error.diagnostic.code, 'CONVERSION_FAILED');
    assert.ok(error.diagnostic.stages.some(stage => stage.name === 'command_finished'));
    assert.ok(error.diagnostic.stages.some(stage => stage.name === 'result_read' && stage.status === 'error'));
    return true;
  });
});

test('authorized Sandbox conversion failures include bounded guest diagnostics without exposing tokens', async t => {
  const { executor } = fake('guest-diagnostic');
  const url = await app(t, env, executor);
  const response = await post(url, source());
  assert.equal(response.status, 422);
  assert.equal(response.body.code, 'CONVERSION_FAILED');
  assert.equal(response.body.diagnostic.phase, 'read_iges');
  assert.equal(response.body.diagnostic.source.sha256, '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3');
  assert.ok(!JSON.stringify(response.body).includes(env.CAD_SANDBOX_ACCESS_TOKEN));
});

test('ambiguous Sandbox creation rejection blocks retries without a handle', async () => {
  const { calls, executor } = fake('create-error');
  await assert.rejects(executor.convert(source()), { code: 'RUNTIME_UNAVAILABLE' });
  assert.equal(executor.cleanupBlocked(), true);
  await assert.rejects(executor.convert(source()), { code: 'CLEANUP_FAILED' });
  assert.deepEqual(calls.map(call => call[0]), ['create']);
});

test('SDK event streams are accepted under the result cap', async () => {
  const { executor } = fake('event-stream');
  const response = await executor.convert(source());
  assert.equal(response.triangleCount, 1);
  assert.equal(response.execution.cleanup, 'stopped');
});

test('SDK buffer reads are preferred when available', async () => {
  const { calls, executor } = fake('buffer');
  const response = await executor.convert(source());
  assert.equal(response.triangleCount, 1);
  assert.ok(calls.some(call => call[0] === 'read-buffer'));
  assert.ok(!calls.some(call => call[0] === 'read'));
});

test('provider session memory is authoritative over guest os.totalmem report', async () => {
  const { executor } = fake('guest-memory-report');
  const response = await executor.convert(source());
  assert.equal(response.triangleCount, 1);
  assert.equal(response.execution.memoryMb, 2048);
  assert.equal(response.execution.guestMemoryBytes, 2398654464);
});

test('timeout and cancellation stop VM with fresh cleanup signal; busy fails closed', async () => {
  const timed = fake('hang', { requestMs: 30 });
  await assert.rejects(timed.executor.convert(source()), { code: 'TIMEOUT' });
  assert.equal(timed.calls.at(-1)[0], 'stop');
  assert.equal(timed.calls.at(-1)[1].signal.aborted, false);
  const cancelled = fake('hang');
  const controller = new AbortController();
  const pending = cancelled.executor.convert(source(), controller.signal);
  const rejection = assert.rejects(pending, { code: 'CANCELLED' });
  await pause(10);
  await assert.rejects(cancelled.executor.convert(source()), { code: 'BUSY' });
  controller.abort(); await rejection;
  assert.equal(cancelled.calls.at(-1)[0], 'stop');
});

test('late creation is stopped without upload; ambiguous creation blocks more work', async () => {
  const { calls, executor } = fake('late', { requestMs: 10 });
  await assert.rejects(executor.convert(source()), { code: 'TIMEOUT' });
  await pause(80);
  assert.deepEqual(calls.map(call => call[0]), ['create', 'stop']);
  await assert.rejects(executor.convert(source()), { code: 'CLEANUP_FAILED' });
});

test('cleanup errors and stalls fail the result and trip circuit breaker', async () => {
  for (const mode of ['stop-error', 'stop-hang', 'snapshot']) {
    const { executor, calls } = fake(mode);
    await assert.rejects(executor.convert(source()), { code: 'CLEANUP_FAILED' });
    await assert.rejects(executor.convert(source()), { code: 'CLEANUP_FAILED' });
    assert.equal(calls.filter(call => call[0] === 'create').length, 1);
  }
});

test('capabilities disable execution after unconfirmed cleanup', async t => {
  const { executor } = fake('stop-error');
  const url = await app(t, env, executor);
  assert.equal((await post(url, source())).body.code, 'CLEANUP_FAILED');
  const caps = await (await fetch(`${url}/capabilities`)).json();
  assert.equal(caps.configured, true);
  assert.equal(caps.enabled, false);
  assert.equal(caps.blocker.code, 'CLEANUP_FAILED');
});

test('SDK resolves, asset pack is bounded, explicit credentials gate is recognized', () => {
  assert.equal(typeof require('@vercel/sandbox').Sandbox.create, 'function');
  const pack = assets();
  assert.ok(pack.reduce((sum, file) => sum + file.content.length, 0) < SANDBOX_LIMITS.assetBytes);
  assert.equal(sandboxReadiness({ ...env, VERCEL: '', VERCEL_TOKEN: 'test', VERCEL_TEAM_ID: 'team', VERCEL_PROJECT_ID: 'project' }).configured, true);
});

test('diagnostic defaults to skip with no SDK create and no output files', async () => {
  const logs = [], original = console.log;
  console.log = line => logs.push(line);
  try { await require('./cad-sandbox-diagnostic').main(); } finally { console.log = original; }
  assert.ok(logs.some(line => line.startsWith('SKIP:')));
});

test('Vercel function bundle includes CAD runtime assets', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
  const pattern = Object.keys(config.functions || {}).find(key => key === 'api/*.js');
  assert.ok(pattern);
  assert.equal(pattern === 'api/*.js' && /^api\/[^/]+\.js$/.test('api/[...path].js'), true);
  const includeFiles = config.functions[pattern].includeFiles;
  assert.equal(includeFiles, '{server/**,node_modules/occt-import-js/dist/**}');
});

test('Sandbox graph permits only SDK provider access and fixed guest assets', () => {
  const allowed = {
    'cadSandboxConfig.js': ['node:fs', 'node:path', 'node:crypto'],
    'cadSandboxExecutor.js': ['node:crypto', './cadWorkerContract', './cadSandboxConfig'],
    'cadSandboxRouter.js': ['express', 'node:crypto', './cadWorkerContract', './cadReadiness', './cadSandboxConfig', './cadSandboxExecutor'],
    'cadSandboxRunner.js': ['node:fs', 'node:os', 'node:crypto', './cadWorkerContract', './occt.js'],
  };
  for (const [file, expected] of Object.entries(allowed)) {
    const text = fs.readFileSync(path.join(__dirname, '../server', file), 'utf8');
    assert.deepEqual([...text.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match => match[1]), expected);
    assert.doesNotMatch(text, file === 'cadSandboxExecutor.js'
      ? /child_process|\bDocker\b|fetch\s*\(|igesSourcePipeline|cadImportProcessor/
      : /child_process|\bDocker\b|fetch\s*\(|igesSourcePipeline|cadImportProcessor|\bimport\s*\(/);
  }
  assert.match(fs.readFileSync(path.join(__dirname, '../server/cadSandboxExecutor.js'), 'utf8'), /import\('@vercel\/sandbox'\)/);
});
