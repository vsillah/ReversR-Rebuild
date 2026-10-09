const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { model, load, fixture, syntheticDb, databaseRows } = require('./helpers/cad-controlled-upload-host-fixture');
const store = load('convex/cadControlledUploadStore.ts');
const bridge = load('offline/cad-convex/controlledUploadHostBridge.ts');
const host = load('convex/cadControlledUploadHost.ts');
const forwards = model.OPERATIONS.slice(0, 5);
function closed(result) {
  assert.equal(result.sourceOnly, true); assert.equal(result.hostQualified, false);
  assert.equal(result.bodyAdmissionAuthorized, false); assert.equal(result.liveReady, false); assert.equal(result.costs, 0);
}
async function consumed() { const f = await fixture(); for (const op of forwards) assert.equal((await f.advance(op)).modelAccepted, true, op); return f; }

test('synthetic canonical binding and result hashes ignore object insertion order', async () => {
  const f = await fixture();
  const reverse = value => Array.isArray(value) ? value.map(reverse) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([k,v]) => [k, reverse(v)])) : value;
  const k = await model.keys(f.binding);
  const expected = crypto.createHash('sha256').update(JSON.stringify(['controlled-binding-v1', ...model.BINDING_FIELDS.map(k => f.binding[k])])).digest('hex');
  assert.equal(k.bindingDigest, expected);
  assert.deepEqual(await model.keys(reverse(f.binding)), k);
  const p = await f.principal();
  const a = await model.transition(f.state, f.command('claimRun'), p, f.auth, 1100);
  const b = await model.transition(reverse(f.state), reverse(f.command('claimRun')), reverse(p), reverse(f.auth), 1100);
  assert.equal(a.plan.receipt.resultDigest, b.plan.receipt.resultDigest);
});

test('synthetic stable scope/run/session keys exclude changed window/card/deployment and bind full supply identity', async () => {
  const f = await fixture(), original = await model.keys(f.binding);
  const changed = { ...f.binding, windowStartMs: 3000, windowEndMs: 4000, grantDeadlineMs: 4000,
    commandCardSha256: 'b'.repeat(64), deploymentReference: 'synthetic-other-deployment' };
  const next = await model.keys(changed);
  for (const key of ['scopeKey','runKey','sessionKey']) assert.equal(next[key], original[key]);
  assert.notEqual(next.bindingDigest, original.bindingDigest);
  for (const field of model.BINDING_FIELDS) {
    const s = structuredClone(f.state);
    const v = s.grant.binding[field];
    s.grant.binding[field] = typeof v === 'string' ? v + 'x' : typeof v === 'number' ? v + 1 : !v;
    assert.equal(await model.validSnapshot(s), false, field);
  }
});

test('synthetic ordered irreversible claim/arm/open/consume then expired recovery keeps tombstones', async () => {
  const f = await fixture();
  for (const op of ['consumeAttemptBeforeBodyRead','openBodyAdmissionFence','armRollback','claimAttempt']) {
    const result = await f.advance(op); closed(result); assert.equal(result.modelAccepted, false);
  }
  for (const op of forwards) { const r = await f.advance(op); closed(r); assert.equal(r.modelAccepted, true); }
  assert.equal(await model.validSnapshot(f.state), true);
  for (const op of forwards) assert.equal((await f.advance(op)).modelAccepted, false);
  assert.equal((await f.advance('closeBodyAdmissionFence', 3000)).modelAccepted, true);
  assert.equal((await f.advance('revokeSessionAndLateGrants', 3000)).modelAccepted, true);
  assert.equal(f.state.scope.runSpent, true); assert.equal(f.state.attempt.attemptSpent, true);
  assert.equal(f.state.attempt.consumed, true); assert.equal(f.state.tombstone.consumed, true);
  assert.equal(f.state.tombstone.revoked, true); assert.equal(f.state.attempt.fenceOpen, false);
  assert.equal((await f.advance('claimRun', 1100)).modelAccepted, false);
});

test('synthetic independent instances/restarts cannot acquire a second run from the same snapshot state', async () => {
  const f = await fixture(); const initial = structuredClone(f.state); const c = f.command('claimRun');
  await f.advance('claimRun');
  const restarted = structuredClone(f.state);
  const result = await model.transition(restarted, c, await f.principal(), f.auth, 1100);
  assert.equal(result.modelAccepted, false);
  const freshRevision = { ...c, expectedRevision: restarted.scope.revision };
  assert.equal((await model.transition(restarted, freshRevision, await f.principal(), f.auth, 1100)).modelAccepted, false);
  // Restoring the pre-spend snapshot cannot be detected by pure state alone; custody verifier stays closed.
  assert.equal((await model.transition(initial, c, await f.principal(), f.auth, 1100)).modelAccepted, true);
  assert.equal(bridge.verifyCustodyContinuity(initial).modelAccepted, false);
});

test('synthetic unknown response/crash after each forward boundary stays spent and recovers restrictively', async () => {
  for (let boundary = 0; boundary < forwards.length; boundary++) {
    const f = await fixture(); for (const op of forwards.slice(0, boundary + 1)) await f.advance(op);
    const r = await f.advance('markUnknown', 1101); assert.equal(r.modelAccepted, true);
    for (const op of forwards) assert.equal((await f.advance(op, 1102)).modelAccepted, false);
    await f.advance('closeBodyAdmissionFence', 3000); await f.advance('revokeSessionAndLateGrants', 3000);
    assert.equal(f.state.scope.permanentStop, true); assert.equal(f.state.tombstone.spent, true);
  }
});

test('synthetic exact time boundaries, authority generation, role and clock regression deny without a read permit', async () => {
  for (const now of [999, 2000, 2001, NaN, Infinity, -1]) {
    const f = await fixture(); assert.equal((await f.advance('claimRun', now)).modelAccepted, false);
  }
  for (const now of [1000, 1999]) { const f = await fixture(); assert.equal((await f.advance('claimRun', now)).modelAccepted, true); }
  const f = await fixture(); await f.advance('claimRun', 1200);
  assert.equal((await f.advance('claimAttempt', 1199)).modelAccepted, false);
  assert.equal(f.state.scope.permanentStop, false); // persistence of regression stop remains unresolved, never claim it
  for (const key of Object.keys(f.auth.generations)) {
    const auth = structuredClone(f.auth); auth.generations[key]++;
    assert.equal((await model.transition(f.state, f.command('claimAttempt'), await f.principal(), auth, 1201)).modelAccepted, false, key);
  }
  for (const patch of [{ role: 'smoke-verifier' }, { active: false }, { generation: 2 }, { expiresAtMs: 1201 }]) {
    assert.equal((await model.transition(f.state, f.command('claimAttempt'), { ...await f.principal(), ...patch }, f.auth, 1201)).modelAccepted, false);
  }
});

test('synthetic corruption, unknown/accessor metadata, unsafe integer exhaustion and missing rollback reject', async () => {
  const f = await consumed();
  const corrupt = [s => { s.tombstone.consumed = false; }, s => { s.attempt.rollbackArmed = false; },
    s => { s.attempt.revision++; }, s => { s.scope.grantHistoryDigests.push('b'.repeat(64)); },
    s => { s.grant.extra = 'SYNTHETIC_PRIVATE_SENTINEL'; }, s => { s.scope.revision = Infinity; }];
  for (const edit of corrupt) { const s = structuredClone(f.state); edit(s); assert.equal(await model.validSnapshot(s), false); }
  let access = 0; const p = await f.principal(); Object.defineProperty(p, 'secret', { enumerable: true, get() { access++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); } });
  const r = await model.transition(f.state, f.command('claimRun'), p, f.auth, 1200);
  assert.equal(r.modelAccepted, false); assert.equal(access, 0); assert.doesNotMatch(JSON.stringify(r), /SYNTHETIC_PRIVATE/);
  const unspent = await fixture(); unspent.state.scope.revision = Number.MAX_SAFE_INTEGER;
  assert.equal((await unspent.advance('claimRun')).code, 'REVISION_EXHAUSTED');
  f.state.scope.authorityGeneration = Number.MAX_SAFE_INTEGER;
  assert.equal((await f.advance('revokeSessionAndLateGrants')).code, 'REVISION_EXHAUSTED');
});

test('synthetic typed store reads exact current authority but refuses to invent absent login/upload generation proofs', async () => {
  const f = await fixture(); const rows = await databaseRows(f); const db = syntheticDb(rows);
  const principal = await f.principal();
  const authority = await store.readCandidateAuthority(db.db, f.binding, principal, 0, 1100);
  assert.equal(authority.active, true); assert.equal(authority.generationsComplete, false);
  const result = await store.applyCandidateTransaction(db.db, { scopeKey: f.state.scope.scopeKey,
    principalKey: principal.principalKey, command: f.command('claimRun') }, 1100);
  closed(result); assert.equal(result.modelAccepted, false); assert.equal(db.writes(), 0);
  for (const table of ['users','authSessions','cadUserAuthority','cadMemberships','cadUploadSessions']) {
    const missing = structuredClone(rows); missing[table] = [];
    assert.equal((await store.readCandidateAuthority(syntheticDb(missing).db, f.binding, principal, 0, 1100)).active, false, table);
  }
});

test('synthetic store recovery writes state/tombstone/receipt together; failed receipt abort is only a fixture transaction', async () => {
  const f = await consumed(); const rows = await databaseRows(f); const p = await f.principal('recovery');
  const input = { scopeKey: f.state.scope.scopeKey, principalKey: p.principalKey, command: f.command('revokeSessionAndLateGrants') };
  const db = syntheticDb(rows);
  const result = await db.transaction(tx => store.applyCandidateTransaction(tx, input, 3000));
  closed(result); assert.equal(result.modelAccepted, true);
  assert.equal(db.tables().cadControlledUploadScopes[0].permanentStop, true);
  assert.equal(db.tables().cadControlledUploadSessionTombstones[0].consumed, true);
  assert.equal(db.tables().cadUploadSessions[0].status, 'revoked');
  assert.equal(db.tables().cadControlledUploadReceipts.length, 6);
  const broken = syntheticDb(rows, true);
  await assert.rejects(broken.transaction(tx => store.applyCandidateTransaction(tx, input, 3000)), /^Error: CONTROLLED_HOST_TRANSACTION_ABORT$/);
  assert.deepEqual(broken.tables(), rows);
});

test('synthetic indexed duplicate/corrupt records and overlapping host identities abort before writes', async () => {
  const f = await consumed(); const original = await databaseRows(f); const principal = await f.principal('recovery');
  for (const table of ['cadControlledUploadScopes','cadControlledUploadGrants','cadControlledUploadAttempts',
    'cadControlledUploadSessionTombstones','cadControlledUploadHostPrincipals']) {
    const rows = structuredClone(original); rows[table].push({ ...rows[table][0], _id: 'synthetic-duplicate' });
    const db = syntheticDb(rows);
    await assert.rejects(store.applyCandidateTransaction(db.db, { scopeKey: f.state.scope.scopeKey,
      principalKey: principal.principalKey, command: f.command('closeBodyAdmissionFence') }, 3000));
    assert.equal(db.writes(), 0);
  }
  const rows = structuredClone(original); const writer = rows.cadControlledUploadHostPrincipals[0];
  rows.cadControlledUploadHostPrincipals.push({ ...writer, _id: 'synthetic-overlap', role: 'independent-reader', principalKey: '9'.repeat(64) });
  await assert.rejects(store.readCandidatePrincipal(syntheticDb(rows).db, writer.principalKey), /ROLE_OVERLAP/);
});

test('registered internal handlers preserve complete validators and independent-verifier denial', async () => {
  assert.deepEqual(Object.keys(host).sort(), [
    'persistRestriction', 'projectAuthenticatedAuthority', 'readReceipt', 'readState',
    'recordIndependentSmoke', 'registerApprovedGrantAndScope', 'transact',
  ]);
  for (const entry of Object.values(host)) {
    assert.equal(typeof entry.handler, 'function'); assert.ok(entry.args); assert.ok(entry.returns);
  }
  const f = await fixture();
  const evidence = { envelope: {}, anchor: {} };
  const noReads = new Proxy({}, { get() { throw Error('NO_DB_READ'); } });
  const register = await host.registerApprovedGrantAndScope.handler({ db: noReads }, {
    binding: f.binding, principalKey: '1'.repeat(64), evidence, requestNonceDigest: '2'.repeat(64),
  });
  const projected = await host.projectAuthenticatedAuthority.handler({ db: noReads }, {
    binding: f.binding, principalKey: '1'.repeat(64), evidence,
  });
  const smoke = await host.recordIndependentSmoke.handler(noReads, { evidenceKey: '3'.repeat(64) });
  for (const result of [register, projected, smoke]) { closed(result); assert.equal(result.modelAccepted, false); }
  for (const verify of Object.values(bridge)) {
    const result = verify({ enabled: true, qualified: true }); closed(result); assert.equal(result.modelAccepted, false);
  }
});

test('seven additive tables and indexes exactly match design inventory; prior tables remain visible', () => {
  const { extractSchema } = require('./helpers/cad-convex-schema-export');
  const schema = extractSchema().schema;
  const manifest = require('../docs/cad-auth-controlled-upload-durable-host-integration-design.json');
  assert.equal(schema.tables.length, 19);
  for (const [name, spec] of Object.entries(manifest.tables)) {
    const row = schema.tables.find(r => r.tableName === name); assert.ok(row, name);
    assert.deepEqual(Object.keys(row.documentType.value).sort(), Object.keys(spec.fields).sort(), name);
    const indexes = Object.fromEntries(row.indexes.map(i => [i.indexDescriptor, i.fields.filter(f => f !== '_creationTime')]));
    assert.deepEqual(indexes, spec.indexes, name);
  }
});

test('source packet rejects each pinned-source drift and cannot promote any of 25 live-unexecuted cases', () => {
  const fs = require('node:fs');
  const checker = require('./cad-auth-controlled-upload-durable-host-source-checker');
  const packet = checker.expectedPacket();
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(packet.acceptanceCoverage.length, 25);
  for (const row of packet.acceptanceCoverage) {
    assert.equal(row.liveExecuted, false); assert.equal(row.livePassed, false);
  }
  for (const file of checker.SOURCES) {
    assert.equal(checker.checkPacket(packet, path => Buffer.concat([fs.readFileSync(path), Buffer.from(path === file ? '\ndrift' : '')])).ok, false, file);
  }
  for (const field of Object.keys(packet).filter(key => packet[key] === false)) {
    assert.equal(checker.checkPacket({ ...packet, [field]: true }).ok, false);
  }
  for (const key of Object.keys(packet.authorizes)) {
    assert.equal(checker.checkPacket({ ...packet, authorizes: { ...packet.authorizes, [key]: true } }).ok, false);
  }
  const forged = structuredClone(packet); forged.acceptanceCoverage[0].livePassed = true;
  assert.equal(checker.checkPacket(forged).ok, false);
  let access = 0; Object.defineProperty(forged, 'secret', { enumerable: true, get() { access++; throw Error('SYNTHETIC_PRIVATE'); } });
  assert.equal(checker.checkPacket(forged).ok, false); assert.equal(access, 0);
});

test('source checker rejects malformed metadata and CLI arguments before source reads', () => {
  const checker = require('./cad-auth-controlled-upload-durable-host-source-checker');
  const packet = checker.expectedPacket();
  let reads = 0;
  const deniedRead = () => { reads++; throw Error('SYNTHETIC_PRIVATE'); };
  const accessor = { ...packet };
  Object.defineProperty(accessor, 'status', { get() { throw Error('SYNTHETIC_PRIVATE'); } });
  for (const value of [null, [], {}, accessor, { ...packet, unknown: true }, { ...packet, sourceBindings: {} }, { ...packet, costs: 1 }]) {
    assert.equal(checker.checkPacket(value, deniedRead).ok, false);
  }
  for (const args of [['--write'], ['--live'], ['/synthetic/private'], ['--packet', 'elsewhere']]) {
    assert.equal(checker.checkCli(args, deniedRead).ok, false);
  }
  assert.equal(reads, 0);
  const result = checker.checkCli([], deniedRead);
  assert.equal(result.ok, false); assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE'), false);
});

test('fixed reader rejects synthetic symlinks, oversized files and filesystem errors without reading them', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, 'cad-auth-controlled-upload-durable-host-source-checker.js'), 'utf8');
  for (const fault of ['root', 'directory', 'file', 'size', 'error']) {
    let reads = 0; let stats = 0;
    const fakeFs = {
      lstatSync() {
        const n = stats++;
        if (fault === 'error') throw Error('SYNTHETIC_PRIVATE');
        return { isSymbolicLink: () => n === ({ root: 0, directory: 1, file: 2 }[fault]),
          isDirectory: () => n < 2, isFile: () => n === 2, size: fault === 'size' ? 1024 * 1024 + 1 : 12 };
      },
      readFileSync() { reads++; throw Error('SYNTHETIC_PRIVATE'); },
    };
    const exports = {}; const module = { exports };
    const load = name => name === 'node:fs' ? fakeFs : require(name);
    vm.runInThisContext('(function(require,module,exports,__dirname){' + source + '\n})')(load, module, exports, __dirname);
    const result = module.exports.checkCli([]);
    assert.equal(result.ok, false, fault); assert.equal(reads, 0, fault);
    assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE'), false);
  }
});
