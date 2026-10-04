'use strict';
// Synthetic in-memory source exercise. Never loads a cloud client or credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { model, fixture } = require('./helpers/cad-controlled-upload-host-fixture');
const source = fs.readFileSync(require('node:path').join(__dirname, '../offline/cad-gcp/journal.ts'), 'utf8');
const api = {};
vm.runInThisContext(`(function(exports,require){${ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText}\n})`)(api, name => {
  assert.equal(name, '../cad-convex/controlledUploadHostModel'); return model;
});
const d = value => String(value).repeat(64).slice(0, 64);
async function input() {
  const { binding } = await fixture();
  const checkpoint = { resourceDigest: binding.resourceBindingDigest, originDigest: d(2), originGeneration: '100',
    epoch: 1, epochDigest: d(6), sequence: 0, payloadDigest: d(2), generation: null, policyDigest: d(3),
    startMs: 1000, deadlineMs: 3601000, timeHighWaterMs: 1000,
    usage: { serviceRequests: 0, storageOperations: 0, payloadBytes: 0 }, namespaceStatus: 'active' };
  const i = { binding, checkpoint, history: [], historyState: 'complete', readback: {},
    command: { event: 'reserve', nonceDigest: d(1), bindingDigest: (await model.keys(binding)).bindingDigest,
      policyDigest: d(3), expectedSequence: 0 },
    clock: { lowerMs: 1100, upperMs: 1101, monotonicElapsedMs: 100 }, concurrentCallers: 2 };
  refresh(i); return i;
}
function refresh(i) {
  const c = i.checkpoint;
  i.readback = Object.fromEntries(['resourceDigest','originDigest','originGeneration','epoch','epochDigest','sequence',
    'payloadDigest','generation','policyDigest','usage'].map(k => [k, structuredClone(c[k])]));
  Object.assign(i.readback, { requestNonceDigest: i.command.nonceDigest, readerAuthorityDigest: d(4),
    writerAuthorityDigest: d(5), observedAtMs: i.clock.lowerMs, expiresAtMs: i.clock.upperMs + 100 });
}
async function advance(i, event) {
  i.command.event = event;
  const r = await api.planAppend(i);
  assert.equal(r.modeledAccepted, true, r.code);
  const p = r.plan;
  i.history.push({ payload: structuredClone(p.payload), payloadDigest: p.payloadDigest, generation: String(1000 + p.payload.sequence) });
  Object.assign(i.checkpoint, { sequence: p.payload.sequence, payloadDigest: p.payloadDigest,
    generation: i.history.at(-1).generation, timeHighWaterMs: p.payload.evaluatedUpperMs, usage: structuredClone(p.usageAfter) });
  i.command.expectedSequence++;
  i.command.nonceDigest = await model.hash(['next-synthetic-nonce', i.command.expectedSequence]);
  i.clock.lowerMs += 10; i.clock.upperMs += 10; i.clock.monotonicElapsedMs += 10;
  refresh(i); return r;
}
function closed(r) {
  for (const key of ['hostQualified','bodyAdmissionAuthorized','liveReady','authenticatedProvenance','forwardRetryAllowed']) assert.equal(r[key], false);
  assert.equal(r.costs, 0);
}
async function rejected(i) { const r = await api.planAppend(i); closed(r); assert.equal(r.modeledAccepted, false, r.code); return r; }
test('immutable journal plans exact bytes and generation-pinned origin/history; never grants authority', async () => {
  const i = await input();
  for (const event of ['reserve','arm','open','consume','close','revoke']) {
    const before = i.history.length, previous = i.checkpoint.usage.storageOperations;
    const r = await advance(i, event); closed(r);
    assert.equal(r.plan.append.ifGenerationMatch, 0);
    assert.deepEqual(JSON.parse(r.plan.append.payloadJson), r.plan.payload);
    assert.equal(r.plan.requiredReads.length, before + 1);
    assert.equal(r.plan.requiredReads[0].ifGenerationMatch, '100');
    assert.equal(r.plan.usageAfter.storageOperations - previous, before + 3);
    assert.equal(r.plan.accounting.versionReconciliationOperations, null);
    assert.equal(r.plan.accounting.providerCostBoundQualified, false);
    assert.equal(r.plan.mutableHeadAuthority, false);
    assert.equal(r.plan.multiObjectAtomicityClaimed, false);
    assert.equal(r.plan.executionEnabled, false);
    assert.throws(() => { r.hostQualified = true; }, TypeError);
    assert.throws(() => { r.plan.payload.binding.sessionId = 'replace'; }, TypeError);
    assert.throws(() => { r.plan.requiredReads.push({}); }, TypeError);
  }
  i.command.event = 'open'; await rejected(i);
});
test('capture all metadata before awaits and reject accessors/custom prototypes/extra keys', async () => {
  const i = await input(), pending = api.planAppend(i);
  i.binding.sessionId = 'changed'; i.command.event = 'consume'; i.checkpoint.usage.storageOperations = 1000;
  const r = await pending; assert.equal(r.modeledAccepted, true); assert.equal(r.plan.payload.event, 'reserve');
  for (const target of ['binding','checkpoint','command','clock','readback']) {
    const x = await input(); let calls = 0;
    Object.defineProperty(x[target], 'unexpected', { enumerable: true, get() { calls++; throw Error('PRIVATE'); } });
    await rejected(x); assert.equal(calls, 0);
    const y = await input(); Object.setPrototypeOf(y[target], { inherited: true }); await rejected(y);
    const z = await input(); z[target].unexpected = true; await rejected(z);
  }
});
test('missing/noncurrent/truncated/conflicting/retired histories cannot be treated as unused', async () => {
  for (const state of ['missing','noncurrent','conflict']) { const i = await input(); i.historyState = state; await rejected(i); }
  for (const mutate of [i => { i.history = []; }, i => { i.history[0].generation = '999'; },
    i => { i.history[0].payload.priorDigest = d(9); }, i => { i.checkpoint.namespaceStatus = 'retired'; },
    i => { i.checkpoint.usage.storageOperations = 0; refresh(i); },
    i => { i.checkpoint.epoch++; refresh(i); }, i => { i.checkpoint.originGeneration = '200'; },
    i => { i.checkpoint.payloadDigest = d(9); refresh(i); }]) {
    const i = await input(); await advance(i, 'reserve'); i.command.event = 'arm'; mutate(i); await rejected(i);
  }
});
test('nonce, policy, independent-reader metadata and full grant/deployment identity bind exactly', async () => {
  for (const mutate of [i => { i.readback.requestNonceDigest = d(9); }, i => { i.command.policyDigest = d(9); },
    i => { i.readback.readerAuthorityDigest = i.readback.writerAuthorityDigest; }, i => { i.command.expectedSequence++; },
    i => { i.binding.commitSha = 'c'.repeat(40); }, i => { i.binding.sessionId = 'other'; }]) {
    const i = await input(); mutate(i); await rejected(i);
  }
  const base = await input(); await advance(base, 'reserve');
  for (const key of Object.keys(base.binding)) {
    const i = structuredClone(base), value = i.binding[key];
    i.binding[key] = typeof value === 'number' ? value + 1 : typeof value === 'boolean' ? !value : `${value}x`;
    i.command.event = 'arm';
    if (model.validBinding(i.binding)) i.command.bindingDigest = (await model.keys(i.binding)).bindingDigest;
    await rejected(i);
  }
  const i = structuredClone(base); i.command.event = 'arm'; i.command.nonceDigest = i.history[0].payload.nonceDigest; refresh(i); await rejected(i);
});
test('stable scope/run/session keys survive window/card changes but cannot reset recorded reservations', async () => {
  const i = await input(), old = await model.keys(i.binding);
  i.binding.windowStartMs++; i.binding.windowEndMs++; i.binding.grantDeadlineMs++;
  const next = await model.keys(i.binding);
  for (const key of ['scopeKey','runKey','sessionKey']) assert.equal(old[key], next[key]);
  const j = await input(); await advance(j, 'reserve'); j.command.event = 'reserve'; await rejected(j);
  await advance(j, 'unknown'); j.command.event = 'arm'; await rejected(j);
});
test('expiry, stale readback, uncertain/reversed clocks and caller caps deny', async () => {
  for (const mutate of [i => { i.clock.upperMs = 2200; }, i => { i.clock.lowerMs = 1102; },
    i => { i.readback.expiresAtMs = 1101; }, i => { i.readback.observedAtMs = 0; },
    i => { i.clock.monotonicElapsedMs = 200; }, i => { i.checkpoint.deadlineMs = 1101; },
    i => { i.concurrentCallers = 3; }, i => { i.concurrentCallers = 0; },
    i => { i.checkpoint.timeHighWaterMs = 1102; }, i => { i.checkpoint.deadlineMs = 3601001; }]) {
    const i = await input(); mutate(i); await rejected(i);
  }
});
test('nonempty-history costs preserve recovery reserve; retries cannot reset usage', async () => {
  const base = await input(); await advance(base, 'reserve');
  for (const [used, accepted] of [[796,true],[797,false]]) {
    const i = structuredClone(base); i.command.event = 'arm'; i.checkpoint.usage.storageOperations = used; refresh(i);
    const r = await api.planAppend(i); assert.equal(r.modeledAccepted, accepted);
    if (accepted) assert.equal(r.plan.usageAfter.storageOperations, 800);
  }
  for (const [event, used, accepted] of [['arm',799,false],['close',996,true],['close',997,false]]) {
    const i = structuredClone(base); i.command.event = event; i.checkpoint.usage.storageOperations = used; refresh(i);
    assert.equal((await api.planAppend(i)).modeledAccepted, accepted);
  }
  for (const [field,value] of [['serviceRequests',799],['payloadBytes',10485760]]) {
    const i = structuredClone(base); i.command.event = 'arm'; i.checkpoint.usage[field] = value; refresh(i); await rejected(i);
  }
});
test('forward payload cap preserves all three restrictive cleanup appends', async () => {
  const i = await input(); await advance(i, 'reserve'); await advance(i, 'arm');
  const {payloadBytes,recordBytes,recoveryPayloadBytes} = api.LIMITS;
  assert.equal(recoveryPayloadBytes, 3 * recordBytes);
  i.command.event = 'open';
  i.checkpoint.usage.payloadBytes = payloadBytes - recordBytes; refresh(i);
  assert.equal((await rejected(i)).code, 'GCP_BUDGET_RESERVED_OR_EXHAUSTED');
  i.checkpoint.usage.payloadBytes = payloadBytes - recoveryPayloadBytes - recordBytes + 1; refresh(i);
  await rejected(i);
  i.checkpoint.usage.payloadBytes--; refresh(i);
  const opened = await advance(i, 'open');
  assert.equal(opened.plan.usageAfter.payloadBytes, payloadBytes - recoveryPayloadBytes);
  for (const event of ['unknown','close','revoke']) {
    const result = await advance(i,event); closed(result);
    assert.ok(result.plan.usageAfter.payloadBytes <= payloadBytes);
    assert.ok(result.plan.usageAfter.serviceRequests <= api.LIMITS.serviceRequests);
    assert.ok(result.plan.usageAfter.storageOperations <= api.LIMITS.storageOperations);
    assert.equal(result.plan.accounting.providerCostBoundQualified,false);
  }
  assert.equal(i.checkpoint.usage.payloadBytes,payloadBytes);
  i.command.event='close'; await rejected(i);
});
test('replacing exported limits cannot inflate caps or erase recovery reserves', async () => {
  const original = api.LIMITS;
  assert.ok(Object.isFrozen(original));
  const base = await input(); await advance(base, 'reserve');
  try {
    api.LIMITS = Object.fromEntries(Object.keys(original).map(key => [key, key.startsWith('recovery') ? 0 : Number.MAX_SAFE_INTEGER]));
    for (const mutate of [
      i => { i.checkpoint.deadlineMs = i.checkpoint.startMs + original.durationMs + 1; },
      i => { i.concurrentCallers = original.callers + 1; },
      i => { i.checkpoint.usage.storageOperations = original.storageOperations - 1; },
      i => { i.checkpoint.usage.serviceRequests = original.serviceRequests - 1; },
      i => { i.checkpoint.usage.payloadBytes = original.payloadBytes - original.recordBytes; },
    ]) {
      const i = structuredClone(base); i.command.event = 'arm'; mutate(i); refresh(i); await rejected(i);
    }
    const i = structuredClone(base); i.command.event = 'arm';
    const r = await api.planAppend(i); assert.equal(r.modeledAccepted,true);
    assert.equal(r.plan.usageAfter.payloadBytes - i.checkpoint.usage.payloadBytes, original.recordBytes);
    assert.equal(r.plan.usageAfter.storageOperations - i.checkpoint.usage.storageOperations, 4);
  } finally { api.LIMITS = original; }
});
test('operation tuple mutations and export replacement cannot change fixed validation', async () => {
  const original = api.EVENTS;
  assert.ok(Object.isFrozen(original));
  assert.throws(() => original.push('injected'), TypeError);
  assert.throws(() => { original[0] = 'injected'; }, TypeError);
  const i = await input(); await advance(i, 'reserve');
  // CommonJS consumers can replace the export property; internal validation
  // must retain its private frozen tuple rather than consult that property.
  try {
    api.EVENTS = ['injected'];
    i.command.event = 'injected'; await rejected(i);
    i.command.event = 'arm';
    assert.equal((await api.planAppend(i)).modeledAccepted, true);
  } finally { api.EVENTS = original; }
  assert.deepEqual(api.EVENTS, ['reserve','arm','open','consume','close','revoke','unknown']);
});
test('replaced denial and record-key exports cannot enable authority or redirect planned paths', async () => {
  const originalDeny = api.deny, originalRecordKey = api.recordKey;
  let calls = 0;
  try {
    api.deny = () => { calls++; return {hostQualified:true,bodyAdmissionAuthorized:true,liveReady:true,private:'SYNTHETIC_SENTINEL'}; };
    api.recordKey = () => { calls++; return 'redirected/SYNTHETIC_SENTINEL'; };
    const hostile = new Proxy({}, {ownKeys() { throw Error('SYNTHETIC_SENTINEL'); }});
    for (const result of [api.authorizeProductionCustody(), await api.planAppend(null), api.classifyWriteOutcome(hostile)]) {
      closed(result); assert.equal(result.modeledAccepted,false);
      assert.ok(Object.isFrozen(result));
      assert.equal(JSON.stringify(result).includes('SYNTHETIC_SENTINEL'),false);
    }
    const i = await input(); await advance(i,'reserve'); i.command.event='arm';
    const result = await api.planAppend(i); assert.equal(result.modeledAccepted,true);
    const prefix = `anchors/${i.checkpoint.resourceDigest}/epoch-${i.checkpoint.epoch}/sequence-`;
    assert.equal(result.plan.append.objectKey, `${prefix}2.json`);
    assert.equal(result.plan.requiredReads[1].objectKey, `${prefix}1.json`);
    assert.equal(calls,0);
  } finally { api.deny = originalDeny; api.recordKey = originalRecordKey; }
});
test('outcome reflection traps return frozen sanitized denial without invoking getters', () => {
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, 'status', { enumerable: true, get() { getterCalls++; throw Error('SYNTHETIC_SENTINEL'); } });
  const inputs = [accessor, ...['ownKeys','getPrototypeOf','getOwnPropertyDescriptor'].map(trap =>
    new Proxy({status:'response-received'}, {[trap]() { throw Error('SYNTHETIC_SENTINEL'); }}))];
  for (const input of inputs) {
    const result = api.classifyWriteOutcome(input);
    closed(result);
    assert.equal(result.code, 'GCP_OUTCOME_INVALID');
    assert.equal(result.modeledAccepted, false);
    assert.equal(result.quarantineRequired, true);
    assert.equal(result.quarantinePersisted, false);
    assert.ok(Object.isFrozen(result));
    assert.equal(JSON.stringify(result).includes('SYNTHETIC_SENTINEL'), false);
  }
  assert.equal(getterCalls, 0);
});
test('write ambiguity and self-consistent fabricated checkpoints never establish production proof', async () => {
  for (const status of ['response-received','lost-response','precondition-failed','missing','conflict']) {
    const r = api.classifyWriteOutcome({status}); closed(r); assert.equal(r.quarantineRequired, true);
    assert.equal(r.quarantinePersisted, false); assert.ok(Object.isFrozen(r));
  }
  let called = false;
  closed(api.authorizeProductionCustody({verified:true, checkpoint: (await input()).checkpoint}, () => { called = true; }));
  assert.equal(called, false);
  // Self-consistent recreated history cannot be detected by unauthenticated input.
  // Even when structurally accepted, this model must remain entirely closed.
  const i = await input(); i.checkpoint.originGeneration = '999'; refresh(i);
  const r = await api.planAppend(i); assert.equal(r.modeledAccepted, true); closed(r);
});
