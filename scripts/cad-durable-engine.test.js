const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createFixture, hex, scope, binding, initialize, reserve, selector } = require('./helpers/cad-durable-engine-fixture');
const { FUNCTIONS, createDurableEngineAdapter } = require('../offline/cad-convex/durableEngineAdapter');
const { createDurableEngineRunner } = require('../offline/cad-convex/durableEngineRunner');
const { fixture: evidenceFixture } = require('./helpers/cad-durable-evidence-fixture');

test('one durable ledger atomically retains shared cost and rejects stale revisions', async () => {
  const f = createFixture();
  assert.equal((await f.invoke('initialize', initialize())).code, 'RUN_INITIALIZED');
  const first = await f.invoke('transact', reserve('first', 0));
  assert.equal(first.code, 'COMMITTED'); assert.equal(first.revision, 1);
  const stale = await f.invoke('transact', reserve('second', 0));
  assert.equal(stale.code, 'CONFLICT'); assert.equal(stale.revision, 1);
  const denied = await f.invoke('transact', { ...reserve('second', 1),
    command: { ...reserve('second', 1).command, reservationMicros: 6400 } });
  assert.equal(denied.code, 'UPLOAD_COST_REJECTED');
  const ledger = f.snapshot().ledgers[0];
  assert.equal(ledger.controlState.records.length, 1); assert.equal(ledger.receipts.length, 1);
  assert.equal(ledger.controlState.records[0].reservationMicros, 100);
});

test('four authority dependencies are reread and revocation blocks fencing without releasing holds', async () => {
  const f = createFixture(); await f.invoke('initialize', initialize());
  const held = await f.invoke('transact', reserve('held', 0));
  const revoked = await f.invoke('changeAuthority', { scope, binding, kind: 'permission',
    expectedGeneration: 1, deadlineAt: 500 });
  assert.equal(revoked.code, 'AUTHORITY_REVOKED');
  const fenced = await f.invoke('transact', { scope, expectedRevision: held.revision,
    selectorDigest: hex('selector-held'), commandDigest: hex('fence-held'), proposalDigest: hex('fence-proposal'),
    command: { type: 'fence', binding, key: 'held', fence: held.fence }, deadlineAt: 500 });
  assert.equal(fenced.code, 'AUTHORITY_REJECTED');
  assert.equal(f.snapshot().ledgers[0].controlState.records[0].status, 'reserved');
});

test('unknown attempts keep holds, use generation-CAS custody and reject synthetic evidence settlement', async () => {
  const f = createFixture(); await f.invoke('initialize', initialize());
  const held = await f.invoke('transact', reserve('unknown', 0));
  let revision = held.revision;
  for (const type of ['fence', 'unknown']) {
    const response = await f.invoke('transact', { scope, expectedRevision: revision,
      selectorDigest: hex('selector-unknown'), commandDigest: hex(type), proposalDigest: hex(type + '-proposal'),
      command: { type, binding, key: 'unknown', fence: held.fence }, deadlineAt: 500 });
    assert.equal(response.code, 'COMMITTED'); revision = response.revision;
  }
  const selected = selector('unknown', held.fence);
  const claim = await f.invoke('claim', { selector: selected, expectedGeneration: 0,
    ownerDigest: hex('custodian'), expiresAt: 200, deadlineAt: 500 });
  assert.equal(claim.code, 'CLAIMED');
  const evidence = { evidenceDigest: hex('evidence'), outcome: 'completed', actualMicros: 80,
    independentEvidenceVerified: true };
  const denied = await f.invoke('settle', { selector: selected, claimGeneration: claim.claimGeneration,
    ownerDigest: hex('custodian'), evidence, deadlineAt: 500 });
  assert.equal(denied.code, 'EVIDENCE_UNVERIFIED');
  assert.equal(f.snapshot().ledgers[0].controlState.records[0].status, 'unknown');
});

test('independently verified evidence settles once and conflicting replay cannot refund again', async () => {
  const f = createFixture({ verifyIndependentEvidence: evidence => ({ ...evidence, independentEvidenceVerified: true }) });
  await f.invoke('initialize', initialize());
  const held = await f.invoke('transact', reserve('settle', 0));
  let revision = held.revision;
  for (const type of ['fence', 'unknown']) {
    const response = await f.invoke('transact', { scope, expectedRevision: revision,
      selectorDigest: hex('selector-settle'), commandDigest: hex(type + '-settle'), proposalDigest: hex(type + '-settle-proposal'),
      command: { type, binding, key: 'settle', fence: held.fence }, deadlineAt: 500 });
    revision = response.revision;
  }
  const selected = selector('settle', held.fence);
  const claim = await f.invoke('claim', { selector: selected, expectedGeneration: 0,
    ownerDigest: hex('custodian'), expiresAt: 200, deadlineAt: 500 });
  const evidence = { evidenceDigest: hex('receipt'), outcome: 'completed', actualMicros: 80,
    independentEvidenceVerified: true };
  assert.equal((await f.invoke('settle', { selector: selected, claimGeneration: claim.claimGeneration,
    ownerDigest: hex('custodian'), evidence, deadlineAt: 500 })).code, 'SETTLED');
  assert.equal(f.snapshot().ledgers[0].controlState.records[0].actualMicros, 80);
  assert.equal((await f.invoke('settle', { selector: selected, claimGeneration: claim.claimGeneration,
    ownerDigest: hex('custodian'), evidence: { ...evidence, actualMicros: 0 }, deadlineAt: 500 })).code,
  'UPLOAD_RECONCILIATION_CONFLICT');
});

test('bounded pages persist progress and stop retains unresolved records', async () => {
  const f = createFixture(); await f.invoke('initialize', initialize());
  let revision = 0;
  for (let i = 0; i < 40; i++) {
    const held = await f.invoke('transact', reserve(`row-${i}`, revision)); revision = held.revision;
  }
  f.setTime(2000);
  const page = await f.invoke('scanPage', { scope, cursor: { after: 0, through: revision },
    limit: 32, custodianDigest: hex('custodian'), deadlineAt: 5000 });
  assert.equal(page.code, 'PAGE_SCANNED'); assert.equal(page.selectors.length, 32);
  assert.deepEqual(page.next, { after: 32, through: 40 });
  assert.deepEqual(f.snapshot().ledgers[0].cursors[0], { custodianDigest: hex('custodian'), after: 32, through: 40 });
  const stopped = await f.invoke('stop', { scope, reasonDigest: hex('stop'), deadlineAt: 5000 });
  assert.equal(stopped.code, 'RUN_STOPPED');
  assert.equal(f.snapshot().ledgers[0].controlState.records.filter(row => row.status !== 'settled').length, 40);
});

test('adapter and runner retry only explicit conflicts, while public synthetic evidence cannot settle', async () => {
  const f = createFixture();
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(key => [key, key]));
  const invoke = (_ref, input) => f.invoke(_ref, input);
  const adapter = createDurableEngineAdapter({ references, runQuery: invoke, runMutation: invoke,
    verifyIndependentEvidence: () => ({ independentEvidenceVerified: true }) });
  const waits = [];
  const runner = createDurableEngineRunner({ adapter, now: f.now, wait: ms => { waits.push(ms); } });
  await runner.execute('initialize', initialize());
  await runner.execute('transact', reserve('first', 0));
  const retried = await runner.execute('transact', reserve('second', 0));
  assert.equal(retried.code, 'COMMITTED'); assert.deepEqual(waits, [100]);
  const proof = evidenceFixture();
  const denied = await runner.execute('settle', { selector: selector('first', 1), claimGeneration: 1,
    ownerDigest: hex('custodian'), deadlineAt: 500 }, proof.receiptBytes, proof.expectedBytes);
  assert.equal(denied.code, 'EVIDENCE_UNVERIFIED');
  assert.equal(adapter.status().stopped, false);
});

test('runtime remains disconnected and user upload body admission stays literal false', () => {
  const route = fs.readFileSync(require.resolve('../server/cadUserUploadRouter'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /durableEngine|cadDurableEngine/);
  for (const directory of ['server', 'src', 'app', 'api', 'components', 'hooks', 'utils']) {
    if (!fs.existsSync(directory)) continue;
    for (const file of fs.readdirSync(directory, { recursive: true }).filter(name => /\.(?:js|jsx|ts|tsx)$/.test(name))) {
      const source = fs.readFileSync(`${directory}/${file}`, 'utf8');
      assert.doesNotMatch(source, /durableEngineAdapter|durableEngineRunner/);
    }
  }
});
