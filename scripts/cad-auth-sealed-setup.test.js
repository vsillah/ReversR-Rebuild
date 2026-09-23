const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createProviderAdapter } = require('../offline/cad-auth-setup/providerAdapter');
const { createBodyInstrumentation } = require('../offline/cad-auth-setup/bodyInstrumentation');
const { ZERO, getSchedule, fixtureFor, validateReceipt, createCollector, digest } = require('../offline/cad-auth-setup/collector');
const { PACKET, SOURCES, MANIFESTS, expectedSetup, checkSetup } = require('./cad-auth-sealed-setup-checker');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
const fixtures = () => getSchedule().map(fixtureFor);

test('provider interface remains unbound even with injected live-looking options', async () => {
  let invoked = 0;
  const adapter = createProviderAdapter({ enabled: true, readAuthenticatedSession: () => invoked++ });
  assert.equal(adapter.configured, false);
  for (const method of ['readAuthenticatedSession', 'readAuthorization']) {
    await assert.rejects(adapter[method]({ get authorization() { invoked++; throw Error(); } }),
      { message: 'PROVIDER_ADAPTER_UNBOUND' });
  }
  assert.equal(invoked, 0);
});

test('body guard counts attempts without a stream, including parsers and stream aliases', () => {
  for (const key of ['body', 'rawBody', '_readableState', 'socket', 'connection']) {
    const guard = createBodyInstrumentation();
    assert.throws(() => guard.requestFacade[key], /BODY_ACCESS_FORBIDDEN/);
    assert.equal(guard.snapshot().bodyGetterAttempts, 1);
    assert.equal(guard.snapshot().applicationBodyBytesRead, 0);
  }
  for (const key of ['read', 'pipe', 'unpipe', 'resume', 'setEncoding', 'on', 'once',
    'addListener', 'prependListener', 'prependOnceListener', 'emit', 'iterator', 'compose', Symbol.asyncIterator]) {
    const guard = createBodyInstrumentation();
    assert.throws(() => guard.requestFacade[key]('data'), /BODY_ACCESS_FORBIDDEN/);
    assert.equal(guard.snapshot().readAttempts, 1);
  }
  for (const key of ['json', 'text', 'arrayBuffer', 'blob', 'formData']) {
    const guard = createBodyInstrumentation();
    assert.throws(() => guard.requestFacade[key](), /BODY_ACCESS_FORBIDDEN/);
    assert.equal(guard.snapshot().parserInvocations, 1);
    assert.equal(guard.snapshot().actualRouteObserved, false);
  }
  const guard = createBodyInstrumentation();
  assert.throws(guard.beforeParser, /BODY_ACCESS_FORBIDDEN/);
  assert.throws(() => Object.defineProperty(guard.requestFacade, 'body', { value: 'x' }), /BODY_ACCESS_FORBIDDEN/);
  assert.equal(guard.snapshot().stopped, true);
  assert.equal(guard.snapshot().platformBufferingEvidence, null);
});

test('schedule covers 65 cases, both paths and paired lifecycle phases within limits', () => {
  const plan = JSON.parse(read('docs/cad-auth-live-evidence-plan.json'));
  const rows = getSchedule();
  assert.equal(rows.length, 148);
  assert.equal(new Set(rows.map(row => row.caseId)).size, 65);
  assert.equal(new Set(rows.map(row => [row.caseId, row.path, row.phase].join('/'))).size, rows.length);
  for (const c of plan.cases) for (const method of c.paths) {
    assert.deepEqual(rows.filter(row => row.caseId === c.id && row.path === method).map(row => row.phase),
      c.requiresSeparateLifecycleSetup ? ['before', 'after'] : ['single']);
  }
  rows[0].caseId = 'tampered';
  assert.notEqual(getSchedule()[0].caseId, 'tampered');
});

test('collector hashes synthetic allowlisted data and never grants live authority', () => {
  const input = fixtures();
  const result = createCollector().collect(input);
  assert.equal(result.ok, true);
  assert.equal(result.liveEvidence, false);
  assert.equal(result.productionVerifierAccepted, false);
  assert.equal(result.receiptPublicationAllowed, false);
  assert.equal(result.receipts[0].sanitizedEvidenceSha256, digest(input[0]));
  input[0].syntheticAlias = 'bad';
  assert.equal(result.receipts[0].syntheticAlias, 'U1/L1');
});

test('validator rejects unknown fields, live claims, leaks and mismatched case/path/phase', () => {
  const slot = getSchedule()[0];
  for (const [key, value] of Object.entries({ tokens: 'private-sentinel', rawHeaders: 'private-sentinel',
    reviewerRef: 'private-sentinel', deploymentRef: 'private-sentinel', mode: 'LIVE',
    caseId: 'unknown', path: 'issue', phase: 'after', observationType: 'FAKE',
    expectedCode: 'GRANTED', observedCode: 'SIMULATED_EXPECTATION_FAILED', syntheticAlias: 'U3/L4' })) {
    const receipt = { ...fixtureFor(slot), [key]: value };
    assert.equal(validateReceipt(receipt, slot), false, key);
    const input = fixtures(); input[0] = receipt;
    const result = createCollector().collect(input);
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
  }
});

test('unsafe counters, invalid deadlines and unexpected HTTP work stop collection', () => {
  const slot = getSchedule()[0];
  for (const key of ZERO) for (const value of [1, -1, null, '0', NaN, Infinity]) {
    assert.equal(validateReceipt({ ...fixtureFor(slot), [key]: value }, slot), false, key);
  }
  for (const [key, values] of Object.entries({ elapsedMs: [800, -1, 0.5, NaN],
    readerInvocations: [3, -1, 0.5, NaN], providerHttpRequests: [1, -1, NaN] })) {
    for (const value of values) assert.equal(validateReceipt({ ...fixtureFor(slot), [key]: value }, slot), false);
  }
  assert.equal(validateReceipt({ ...fixtureFor(slot), elapsedMs: 799, readerInvocations: 2 }, slot), true);
});

test('missing, duplicate, reordered and partial receipt sets stop and consume the attempt', () => {
  const variants = [input => input.slice(1), input => [...input, input[0]],
    input => { input[1] = input[0]; return input; }, input => input.reverse(),
    input => { input[50].providerWrites = 1; return input; }];
  for (const mutate of variants) {
    const collector = createCollector();
    assert.equal(collector.collect(mutate(fixtures())).ok, false);
    assert.equal(collector.collect(fixtures()).code, 'RETRY_FORBIDDEN');
  }
  const collector = createCollector();
  assert.equal(collector.collect(fixtures()).ok, true);
  assert.equal(collector.collect(fixtures()).code, 'RETRY_FORBIDDEN');
});

test('receipt getters and provider callbacks are never evaluated by validator', () => {
  let invoked = 0;
  const slot = getSchedule()[0], receipt = fixtureFor(slot);
  Object.defineProperty(receipt, 'observedCode', { enumerable: true, get() { invoked++; return 'private-sentinel'; } });
  assert.equal(validateReceipt(receipt, slot), false);
  assert.equal(createCollector().collect(() => invoked++).ok, false);
  assert.equal(invoked, 0);
});

test('generated review card binds source and retains every live gate', () => {
  const p = packet();
  assert.equal(checkSetup(p).ok, true);
  assert.deepEqual(p, expectedSetup());
  assert.equal(p.card.id, 'cad-auth-sealed-evidence-card-v1');
  for (const value of Object.values(p.claims)) assert.equal(value, false);
  assert.equal(p.card.exactCommandLine, null);
  assert.equal(p.card.dryRunCommandLine, null);
  assert.equal(p.card.liveApprovalPhrase, null);
  assert.equal(p.card.sealed, false);
  assert.equal(p.logicalOperations, 148);
  for (const manifest of Object.values(p.bindingManifests)) {
    for (const group of Object.values(manifest.bindings)) for (const value of Object.values(group)) assert.equal(value, null);
  }
});

test('card drift and any authority promotion are rejected without echoing data', () => {
  const mutations = [p => { p.card.executable = true; }, p => { p.card.sealed = true; },
    p => { p.card.exactCommandLine = 'private-sentinel'; }, p => { p.remainingGates = []; },
    p => { p.sourceBindings = {}; }, p => { p.schedule.pop(); },
    ...Object.keys(packet().claims).map(key => p => { p.claims[key] = true; }),
    ...Object.keys(packet().limits).map(key => p => { p.limits[key]++; })];
  for (const mutate of mutations) {
    const p = packet(); mutate(p);
    const result = checkSetup(p);
    assert.equal(result.ok, false);
    assert.equal(result.executable, false);
    assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
  }
  for (const file of SOURCES) {
    assert.equal(checkSetup(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) }).ok, false, file);
  }
});

test('generator itself rejects populated or weakened manifests, including extra fields', () => {
  for (const file of MANIFESTS) for (const mutate of [m => { m.extra = 'private-sentinel'; },
    m => { m.bindingAuthority = true; }, m => { m.policy = {}; }, m => {
      const group = Object.values(m.bindings)[0]; group[Object.keys(group)[0]] = 'private-sentinel';
    }]) {
    assert.throws(() => expectedSetup(name => {
      if (name !== file) return read(name);
      const manifest = JSON.parse(read(name)); mutate(manifest);
      return Buffer.from(JSON.stringify(manifest));
    }), /LIVE_BINDING_NOT_ALLOWED/);
  }
});

test('setup sources have no network/env/process execution and are absent from runtime', () => {
  for (const file of SOURCES.filter(name => name.endsWith('.js') && !name.endsWith('.test.js'))) {
    assert.doesNotMatch(read(file).toString(), /process\.env|fetch\s*\(|child_process|https?\.request|createServer|\.listen\s*\(/, file);
  }
  for (const dir of ['server', 'api', 'convex', 'app', 'components']) {
    const walk = folder => {
      for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'),
          /cad-auth-setup|cad-auth-sealed-setup/, file);
      }
    };
    walk(path.join(root, dir));
  }
});


test('hidden fields and array accessors cannot smuggle data past the receipt allowlist', () => {
  for (const key of ['hiddenSecret', Symbol('secret')]) {
    const receipt = fixtureFor(getSchedule()[0]);
    Object.defineProperty(receipt, key, { value: 'private-sentinel', enumerable: false });
    assert.equal(validateReceipt(receipt, getSchedule()[0]), false);
  }
  let reads = 0;
  const input = fixtures();
  Object.defineProperty(input, 0, { get() { reads++; throw Error('private-sentinel'); } });
  const result = createCollector().collect(input);
  assert.equal(result.ok, false);
  assert.equal(reads, 0);
  assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
});

test('CLI rejects execution, sealing and unknown flags without rewriting the review card', () => {
  const { spawnSync } = require('node:child_process');
  const before = read(PACKET);
  for (const args of [['--execute'], ['--seal'], ['--dry-run'], ['--write-review-card', '--execute']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-sealed-setup-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout), { ok: false, executable: false, code: 'SOURCE_SETUP_BLOCKED' });
    assert.deepEqual(read(PACKET), before);
  }
  for (const invalid of [null, {}, [], true, 'private-sentinel']) assert.equal(checkSetup(invalid).ok, false);
});
