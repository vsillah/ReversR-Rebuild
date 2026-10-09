'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  model,
  load,
  fixture,
  syntheticDb,
  databaseRows,
} = require('./helpers/cad-controlled-upload-host-fixture');
const {
  FUNCTIONS,
  createCadControlledUploadDurableHostAdapter,
} = require('../server/cadControlledUploadDurableHostAdapter');

const host = load('convex/cadControlledUploadHost.ts');
const root = path.resolve(__dirname, '..');
const forward = ['claimRun', 'claimAttempt', 'armRollback', 'openBodyAdmissionFence', 'consumeAttemptBeforeBodyRead'];

function assertClosed(result) {
  assert.equal(result.sourceOnly, true);
  assert.equal(result.hostQualified, false);
  assert.equal(result.bodyAdmissionAuthorized, false);
  assert.equal(result.liveReady, false);
  assert.equal(result.costs, 0);
}

test('internal host registration remains absent from the public API and uses complete validators', () => {
  const source = fs.readFileSync(path.join(root, 'convex/cadControlledUploadHost.ts'), 'utf8');
  assert.doesNotMatch(source, /\b(?:query|mutation|action)\s*\(/);
  assert.match(source, /internalMutation\s*\(/);
  assert.match(source, /internalQuery\s*\(/);
  assert.match(source, /export const projectAuthenticatedAuthority = internalMutation\s*\(/);
  assert.doesNotMatch(source, /export const projectAuthenticatedAuthority = internalQuery\s*\(/);
  assert.equal(FUNCTIONS.projectAuthenticatedAuthority, 'mutation');
  for (const entry of Object.values(host)) {
    assert.ok(entry.args, 'args validator');
    assert.ok(entry.returns, 'returns validator');
    assert.equal(typeof entry.handler, 'function');
  }
  const generated = fs.readFileSync(path.join(root, 'convex/_generated/api.d.ts'), 'utf8');
  for (const module of ['cadControlledUploadHost', 'cadControlledUploadStore', 'cadControlledUploadContinuityStore']) {
    assert.match(generated, new RegExp(`import type \\* as ${module} from "../${module}\\.js";`));
  }
});

test('one session and one attempt follow claim, rollback-arm, open, consume ordering with zero retries', async () => {
  const f = await fixture();
  for (const operation of ['openBodyAdmissionFence', 'consumeAttemptBeforeBodyRead']) {
    const denied = await f.advance(operation);
    assertClosed(denied); assert.equal(denied.modelAccepted, false);
  }
  for (const operation of forward) {
    const result = await f.advance(operation);
    assertClosed(result); assert.equal(result.modelAccepted, true, operation);
  }
  assert.equal(f.state.attempt.attemptSpent, true);
  assert.equal(f.state.attempt.rollbackArmed, true);
  assert.equal(f.state.attempt.fenceOpenedOnce, true);
  assert.equal(f.state.attempt.consumed, true);
  assert.equal(f.state.tombstone.consumed, true);
  assert.equal(f.receipts.length, 5);
  assert.deepEqual(f.receipts.map(receipt => receipt.operation), forward);
  for (const operation of forward) {
    const denied = await f.advance(operation, 1101);
    assertClosed(denied); assert.equal(denied.modelAccepted, false, operation);
  }
});

test('registered host cannot perform a forward transaction while generation proof is unavailable', async () => {
  const f = await fixture();
  const rows = await databaseRows(f);
  const database = syntheticDb(rows);
  const principal = await f.principal();
  const result = await host.transact.handler({ db: database.db }, {
    scopeKey: f.state.scope.scopeKey,
    principalKey: principal.principalKey,
    ...f.command('claimRun'),
  });
  assertClosed(result);
  assert.equal(result.modelAccepted, false);
  assert.equal(database.writes(), 0);
});

test('restrictive recovery persists closure across a cloned restart without reopening the spent slot', async () => {
  const f = await fixture();
  for (const operation of forward) assert.equal((await f.advance(operation)).modelAccepted, true, operation);
  const database = syntheticDb(await databaseRows(f));
  const restricted = await database.transaction(db => host.persistRestriction.handler({ db }, {
    scopeKey: f.state.scope.scopeKey,
    reason: 'unknown',
    clockObservation: 3000,
  }));
  assertClosed(restricted);
  assert.equal(restricted.candidateWritten, true);
  const restarted = syntheticDb(structuredClone(database.tables()));
  const state = await host.readState.handler({ db: restarted.db }, { scopeKey: f.state.scope.scopeKey });
  assertClosed(state);
  assert.equal(state.statePresent, true);
  assert.equal(state.runSpent, true);
  assert.equal(state.consumed, true);
  assert.equal(state.closed, true);
  assert.equal(state.revoked, true);
  assert.equal(state.permanentStop, true);
  assert.equal(state.fenceOpen, false);
  assert.equal(state.recoveryState, 'unknown');
  assert.equal(JSON.stringify(state).includes(f.binding.credentialDigest), false);
  const replay = await model.transition(structuredClone(f.state), f.command('claimRun'), await f.principal(), f.auth, 1100);
  assert.equal(replay.modelAccepted, false);
});

test('server adapter invokes exact internal references once and strips private or authority-like extras', async () => {
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(name => [name, `internal:${name}`]));
  const calls = [];
  const resultTemplate = {
    code: 'CONTROLLED_HOST_STATE_PRESENT', sourceOnly: true, modelAccepted: true,
    hostQualified: false, bodyAdmissionAuthorized: false, liveReady: false, costs: 0,
    statePresent: true, revision: 5, consumed: true, privateCredential: 'SYNTHETIC_PRIVATE_SENTINEL',
    conversionAuthorized: true,
  };
  const adapter = createCadControlledUploadDurableHostAdapter({
    references,
    runQuery: async (reference, input) => { calls.push(['query', reference, input]); return resultTemplate; },
    runMutation: async (reference, input) => { calls.push(['mutation', reference, input]); return resultTemplate; },
  });
  const result = await adapter.readState({ scopeKey: 'a'.repeat(64) });
  assertClosed(result);
  assert.equal(result.modelAccepted, true);
  assert.equal(result.remoteAttempts, 1);
  assert.equal(result.automaticRetries, 0);
  assert.equal(result.statePresent, true);
  assert.equal(result.revision, 5);
  assert.equal(Object.hasOwn(result, 'privateCredential'), false);
  assert.equal(Object.hasOwn(result, 'conversionAuthorized'), false);
  assert.deepEqual(calls, [['query', references.readState, { scopeKey: 'a'.repeat(64) }]]);
  assert.deepEqual(adapter.status(), {
    sourceOnly: true, configured: true, internalOnly: true, independentVerificationAvailable: false,
    hostQualified: false, bodyAdmissionAuthorized: false, liveReady: false,
    remoteAttempts: 1, automaticRetries: 0, stopped: false,
  });
});

test('server adapter routes authority projection as a mutation, stops on its unknown outcome, and never retries', async () => {
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(name => [name, `internal:${name}`]));
  let calls = 0;
  const adapter = createCadControlledUploadDurableHostAdapter({
    references,
    runQuery: async () => { calls++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); },
    runMutation: async () => { calls++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); },
  });
  let getterReads = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'secret', { enumerable: true, get() { getterReads++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); } });
  const rejected = await adapter.transact(hostile);
  assertClosed(rejected);
  assert.equal(rejected.code, 'CONTROLLED_HOST_INPUT_INVALID');
  assert.equal(getterReads, 0);
  assert.equal(calls, 0);
  const unknown = await adapter.projectAuthenticatedAuthority({
    binding: {},
    principalKey: 'synthetic-principal',
    evidence: {},
  });
  assertClosed(unknown);
  assert.equal(unknown.code, 'CONTROLLED_HOST_OUTCOME_UNKNOWN');
  assert.equal(unknown.stopped, true);
  const stopped = await adapter.readState({ scopeKey: 'a'.repeat(64) });
  assert.equal(stopped.code, 'CONTROLLED_HOST_ADAPTER_STOPPED');
  assert.equal(calls, 1);
  assert.equal(adapter.status().automaticRetries, 0);
  assert.doesNotMatch(JSON.stringify([rejected, unknown, stopped]), /SYNTHETIC_PRIVATE_SENTINEL/);
});

test('source gate and public routes remain unchanged and disabled', () => {
  const router = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  const gate = fs.readFileSync(path.join(root, 'server/cadControlledUploadObservableGateWiringRepair.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'server/index.js'), 'utf8');
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false/);
  assert.match(gate, /CONTROLLED_UPLOAD_REVIEWED_DURABLE_HOST_REQUIRED/);
  assert.match(gate, /controlledUploadRuntimeBlocked: true/);
  assert.doesNotMatch(index, /cadControlledUploadDurableHostAdapter/);
});
