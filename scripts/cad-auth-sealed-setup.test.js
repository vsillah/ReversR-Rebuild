const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createProviderAdapter } = require('../offline/cad-auth-sealed-setup/providerAdapter');
const { EVENTS, createRouteInstrumentation } = require('../offline/cad-auth-sealed-setup/routeInstrumentation');
const { getSchedule, COUNTERS, scheduleSha256, limitsSha256, createReceiptCollector }
  = require('../offline/cad-auth-sealed-setup/receiptCollector');
const { PACKET, BINDINGS, SOURCES, checkSetup } = require('./cad-auth-sealed-setup-checker');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function receipt(index = 0) {
  const { caseId, path, phase, observationType } = getSchedule()[index];
  return { caseId, path, phase, observationType, provenance: 'LOCAL_SYNTHETIC_ONLY',
    candidateCommit: 'dc7d733cff6d94841725e721cc8e7b0da7be4cff',
    scheduleSha256, limitsSha256, fixtureTarget: 'offline-fixture',
    syntheticAlias: phase === 'pair-u2' ? 'U2/L3' : 'U1/L1',
    startedAtMs: index * 10, endedAtMs: index * 10 + 1, durationMs: 1,
    observedCode: 'DENIED', disposition: 'UNREVIEWED',
    counters: Object.fromEntries(COUNTERS.map(key => [key, 0])) };
}

test('disabled provider adapter ignores all supplied context and cannot invoke dependencies', async () => {
  const poison = new Proxy({}, { get() { throw Error('PRIVATE_SENTINEL'); } });
  const adapter = createProviderAdapter(poison);
  assert.equal(adapter.configured, false);
  assert.equal(adapter.providerBound, false);
  for (const method of ['readAuthenticatedSession', 'readAuthorization']) {
    await assert.rejects(adapter[method](poison, poison), { message: 'AUTH_UNAVAILABLE' });
  }
});

test('route guards stop every body-access form before any underlying read', () => {
  for (const event of EVENTS) {
    const guard = createRouteInstrumentation();
    guard.enter(); guard.beforeVerifier();
    assert.throws(() => guard.beforeBodyAccess(event), /BODY_ACCESS_BLOCKED/);
    assert.throws(() => guard.beforeVerifier(), /BODY_ACCESS_BLOCKED/);
    const snapshot = guard.snapshot();
    assert.equal(snapshot[event], 1);
    assert.equal(snapshot.applicationBytesRead, 0);
    assert.equal(snapshot.actualRouteProven, false);
    assert.equal(snapshot.platformBufferingReviewed, false);
  }
  const premature = createRouteInstrumentation();
  assert.throws(() => premature.beforeVerifier(), /BODY_ACCESS_BLOCKED/);
  assert.throws(() => premature.enter(), /BODY_ACCESS_BLOCKED/);
  const duplicate = createRouteInstrumentation(); duplicate.enter();
  assert.throws(() => duplicate.enter(), /BODY_ACCESS_BLOCKED/);
});

test('schedule covers all 65 cases and 150 slots within ceilings without claiming concurrent proof', () => {
  const schedule = getSchedule();
  assert.equal(new Set(schedule.map(s => s.caseId)).size, 65);
  assert.equal(schedule.length, 150);
  assert.equal(new Set(schedule.map(s => [s.caseId, s.path, s.phase].join('/'))).size, 150);
  for (const entry of schedule.filter(s => s.lifecycleReceiptRequired)) {
    assert.ok(['before', 'after'].includes(entry.phase));
  }
  assert.equal(schedule.filter(s => s.caseId === 'concurrent-credential-isolation').length, 4);
  schedule[0].caseId = 'mutated';
  assert.equal(getSchedule()[0].caseId, 'verified-user-context');
});

test('complete synthetic replay never marks evidence reviewed, accepted or executable', () => {
  const collector = createReceiptCollector();
  for (let index = 0; index < getSchedule().length; index++) assert.equal(collector.ingest(receipt(index)).ok, true);
  const result = collector.snapshot();
  assert.equal(result.complete, true);
  assert.equal(result.receiptCount, 150);
  for (const key of ['executable', 'liveEvidence', 'reviewed', 'providerAccepted']) assert.equal(result[key], false);
  assert.match(result.receipts[0].sanitizedEvidenceSha256, /^[a-f0-9]{64}$/);
  result.receipts[0].receipt.observedCode = 'PRIVATE_SENTINEL';
  assert.equal(collector.snapshot().receipts[0].receipt.observedCode, 'DENIED');
  assert.equal(collector.ingest(receipt()).ok, false);
});

test('malformed, sensitive, unbound, promoted or over-budget receipts stop permanently and are not echoed', () => {
  const mutations = [
    r => { r.extra = 'PRIVATE_SENTINEL'; }, r => { r.provenance = 'LIVE'; },
    r => { r.fixtureTarget = 'https://private.example'; },
    r => { r.syntheticAlias = 'PRIVATE_SENTINEL'; }, r => { r.phase = 'after'; },
    r => { r.path = 'issue'; }, r => { r.observationType = 'INSPECTION'; },
    r => { r.caseId = 'PRIVATE_SENTINEL'; }, r => { r.candidateCommit = 'a'.repeat(40); },
    r => { r.scheduleSha256 = 'a'.repeat(64); }, r => { r.limitsSha256 = 'a'.repeat(64); },
    r => { r.startedAtMs = -1; }, r => { r.endedAtMs = 1800000; },
    r => { r.endedAtMs = 801; }, r => { r.durationMs = 801; },
    r => { r.durationMs = NaN; }, r => { r.durationMs = 0.5; },
    r => { r.disposition = 'PASS'; }, r => { r.observedCode = 'PRIVATE_SENTINEL'; },
    r => { r.counters.readerInvocations = 3; }, r => { r.counters.providerHttpRequests = 5; },
    r => { r.counters.rawHeaders = 'PRIVATE_SENTINEL'; },
    ...COUNTERS.filter(k => !['readerInvocations', 'providerHttpRequests'].includes(k))
      .map(k => r => { r.counters[k] = 1; }),
    ...Object.keys(receipt()).map(k => r => { delete r[k]; }),
  ];
  for (const mutate of mutations) {
    const collector = createReceiptCollector(), input = receipt(); mutate(input);
    const result = collector.ingest(input);
    assert.equal(result.ok, false);
    assert.equal(result.stopped, true);
    assert.equal(result.receiptCount, 0);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
    assert.equal(collector.ingest(receipt()).code, 'COLLECTOR_STOPPED');
  }
});

test('accessor payloads are rejected without reading values', () => {
  let reads = 0;
  const input = receipt();
  Object.defineProperty(input, 'observedCode', { enumerable: true, get() { reads++; throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(createReceiptCollector().ingest(input).ok, false);
  assert.equal(reads, 0);
  for (const input of [null, undefined, {}, [], 'PRIVATE_SENTINEL']) {
    assert.equal(createReceiptCollector().ingest(input).ok, false);
  }
});

test('failure, unknown outcome, explicit stop, duplicate and clock rollback prevent further recording', () => {
  for (const code of ['FAIL', 'UNKNOWN']) {
    const collector = createReceiptCollector(), input = receipt(); input.disposition = code;
    assert.equal(collector.ingest(input).code, 'OBSERVATION_STOP');
    assert.equal(collector.ingest(receipt(1)).code, 'COLLECTOR_STOPPED');
  }
  const unknown = receipt(); unknown.observedCode = 'UNKNOWN';
  assert.equal(createReceiptCollector().ingest(unknown).code, 'OBSERVATION_STOP');
  const stopped = createReceiptCollector(); stopped.stop();
  assert.equal(stopped.ingest(receipt()).ok, false);
  const duplicate = createReceiptCollector(); duplicate.ingest(receipt());
  assert.equal(duplicate.ingest(receipt()).ok, false);
  const rollback = createReceiptCollector(); rollback.ingest(receipt());
  const second = receipt(1); second.startedAtMs = 0;
  assert.equal(rollback.ingest(second).ok, false);
  assert.throws(() => createReceiptCollector({ startsAtMs: 1, expiresAtMs: 0 }), /INVALID_SYNTHETIC_WINDOW/);
  assert.throws(() => createReceiptCollector({ expiresAtMs: 1800001 }), /INVALID_SYNTHETIC_WINDOW/);
});

test('generated setup card binds exact sources but cannot promote any authority or live reference', () => {
  assert.equal(checkSetup(packet()).ok, true);
  for (const key of Object.keys(packet().claims)) {
    const p = packet(); p.claims[key] = true; assert.equal(checkSetup(p).ok, false);
  }
  for (const key of Object.keys(packet().card)) {
    const p = packet(); p.card[key] = 'PRIVATE_SENTINEL';
    const result = checkSetup(p); assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
  }
  for (const file of SOURCES) {
    assert.equal(checkSetup(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) }).ok, false);
  }
  assert.equal(checkSetup(packet(), { readSource: name => {
    if (name !== BINDINGS) return read(name);
    const b = JSON.parse(read(name)); b.immutableTarget.deploymentCommit = 'a'.repeat(40);
    return Buffer.from(JSON.stringify(b));
  } }).ok, false);
  for (const value of [null, [], {}, false]) assert.equal(checkSetup(value).ok, false);
});

test('new source modules remain offline and unmounted from runtime', () => {
  for (const file of SOURCES.filter(f => f.startsWith('offline/') && f.endsWith('.js'))) {
    assert.doesNotMatch(read(file).toString(), /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|convex\/browser|\.listen\s*\(/);
  }
  for (const file of ['server/index.js', 'api/[...path].js', 'server/cadUserUploadRouter.js',
    'server/cadUploadSessionGatewayService.js', 'server/cadProductionSessionVerifierBinding.js',
    'offline/cad-convex/productionVerifierCandidate.js']) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-sealed-setup/);
  }
});
