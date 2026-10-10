// Offline synthetic metadata only. No network, provider, credential, private CAD, or deployment access.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourcePath = 'convex/cadPhase5DurableAdapters.ts';
function loadAdapter() {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, sourcePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const requireFixed = name => {
    if (name === 'convex/values') return require(name);
    if (name === './_generated/server') return {
      internalMutation: config => config, internalQuery: config => config,
    };
    if (name === './schema') return { custodyArtifact: require('convex/values').v.any() };
    throw Error(`SOURCE_IMPORT_NOT_ALLOWED:${name}`);
  };
  vm.runInThisContext(`(function(exports,require){${compiled}\n})`, { filename: sourcePath })(exports, requireFixed);
  return exports;
}
const adapter = loadAdapter();
const digest = character => character.repeat(64);
const user = 'synthetic-user';
const owner = { userId: user, shopId: 'synthetic-shop', uploadSessionId: 'synthetic-session' };
const otherOwner = { userId: 'synthetic-user-2', shopId: 'synthetic-shop-2',
  uploadSessionId: 'synthetic-session-2' };
const policy = { maxStoredBytes: 1000, maxObjects: 3, maxClassAOperations: 2,
  maxClassBOperations: 2, maxDeleteOperations: 2 };
const artifact = (id = 'artifact-1', overrides = {}) => ({ schemaVersion: 1, artifactId: id, ...owner,
  kind: 'original-igs', format: 'model/iges', byteCount: 100, restrictedDigest: digest('a'),
  providerObjectKey: `phase5/${digest('b')}`, objectKeyDigest: digest('c'), state: 'reserved',
  createdAt: 1000, retainedUntil: 2000, generation: 1, ...overrides });
const derivedArtifact = (id, kind, restrictedDigest) => artifact(id, {
  kind, format: kind === 'preview-geometry' ? 'application/vnd.reversr.preview+json' : 'model/stl',
  restrictedDigest, sourceArtifactId: 'artifact-1', sourceDigest: digest('a'),
  geometryDigest: digest('9'), units: 'millimeter',
  warning: 'Inspection geometry only - not validated for manufacturing.',
  providerObjectKey: `phase5/${kind === 'preview-geometry' ? digest('8') : digest('7')}`,
  objectKeyDigest: kind === 'preview-geometry' ? digest('6') : digest('5'),
});
const attempt = (idempotencyDigest = digest('d'), attemptId = 'attempt-1') => ({
  idempotencyDigest, attemptId, ...owner, authorityGeneration: 1, deploymentRef: 'deployment-1',
  cohortRef: 'cohort-1', evidenceDigest: digest('e'), retentionPolicyDigest: digest('f'),
  reservationMicros: 10, maxRetries: 0, createdAt: 1000, expiresAt: 2000,
});

function syntheticDb(seed = {}, fail = {}) {
  let tables = structuredClone(seed);
  let sequence = 0;
  let queue = Promise.resolve();
  const rows = table => (tables[table] ||= []);
  const db = {
    query(table) {
      const terms = [];
      return { withIndex(_name, callback) {
        const q = { eq(key, value) { terms.push([key, value]); return q; } };
        callback(q);
        return this;
      }, async take(limit) {
        if (fail.queryTable === table) throw Error(`PRIVATE_SENTINEL:${table}`);
        return rows(table).filter(row => terms.every(([key, value]) => row[key] === value)).slice(0, limit);
      } };
    },
    async insert(table, value) {
      if (fail.insertTable === table) throw Error(`PRIVATE_SENTINEL:${table}`);
      const id = `synthetic-${table}-${sequence++}`;
      rows(table).push({ _id: id, _creationTime: 1, ...structuredClone(value) });
      return id;
    },
    async patch(id, value) {
      if (fail.patchId === id || fail.patchTable
        && Object.entries(tables).some(([table, list]) => table === fail.patchTable && list.some(row => row._id === id))) {
        throw Error(`PRIVATE_SENTINEL:${id}`);
      }
      const row = Object.values(tables).flat().find(candidate => candidate._id === id);
      if (!row) throw Error('MISSING_ROW');
      Object.assign(row, structuredClone(value));
    },
    async delete(id) {
      for (const list of Object.values(tables)) {
        const index = list.findIndex(row => row._id === id);
        if (index >= 0) { list.splice(index, 1); return; }
      }
      throw Error('MISSING_ROW');
    },
  };
  const transaction = operation => {
    const run = async () => {
      const before = structuredClone(tables);
      try { return await operation(db); } catch (error) { tables = before; throw error; }
    };
    const current = queue.then(run, run);
    queue = current.then(() => undefined, () => undefined);
    return current;
  };
  return { db, transaction, snapshot: () => structuredClone(tables) };
}

async function reserve(store, value = artifact(), customPolicy = policy) {
  return store.transaction(db => adapter.reserveArtifactCandidate(db, {
    scopeKey: 'quota-scope', owner, artifact: value, policy: customPolicy, now: 1000,
  }));
}
async function storeArtifact(store, value = artifact()) {
  assert.equal((await reserve(store, value)).accepted, true);
  return store.transaction(db => adapter.transitionArtifactCandidate(db, {
    artifactId: value.artifactId, owner, expectedGeneration: 1, transition: 'stored', now: 1010,
  }));
}
async function claim(store, value = attempt()) {
  return store.transaction(db => adapter.claimUploadCandidate(db, { scopeKey: 'phase5-scope',
    attempt: value, policy: { maxAttempts: 4, maxConcurrent: 1, budgetMicros: 100 },
  }));
}

test('binds the exact Package 7 gate and verified 37-function live inventory without activation', () => {
  assert.equal(adapter.PACKAGE7_BINDING.gateSha256,
    '7668624b8149c2e7943152aaa1222618460caac79d1f656a727895c9ac1c28a9');
  assert.equal(adapter.PACKAGE7_BINDING.deployment, 'majestic-alligator-31');
  assert.equal(adapter.PACKAGE7_VERIFIED_FUNCTIONS.length, 37);
  assert.equal(new Set(adapter.PACKAGE7_VERIFIED_FUNCTIONS).size, 37);
  assert.equal(adapter.PACKAGE7_BINDING.runtimeActivationAuthorized, false);
  assert.deepEqual(adapter.PACKAGE7_CEILINGS, { maxStoredBytes: 8 * 1024 * 1024,
    maxObjects: 12, maxClassAOperations: 1000, maxClassBOperations: 1000,
    maxDeleteOperations: 1000, budgetMicros: 9_000_000, maxAttempts: 4, maxConcurrent: 1 });
});

test('artifact and quota reservation is atomic when the ledger write fails', async () => {
  const store = syntheticDb({}, { insertTable: 'cadArtifactQuotaLedgers' });
  await assert.rejects(reserve(store), /PRIVATE_SENTINEL/);
  assert.equal(store.snapshot().cadArtifacts?.length ?? 0, 0);
  assert.equal(store.snapshot().cadArtifactQuotaLedgers?.length ?? 0, 0);
});

test('custody and quota records are isolated by owner and shop', async () => {
  const store = syntheticDb();
  await reserve(store);
  const deniedRead = await adapter.readArtifactCandidate(store.db, { artifactId: 'artifact-1', owner: otherOwner });
  assert.equal(deniedRead.code, 'CUSTODY_DENIED');
  const hijack = await store.transaction(db => adapter.reserveArtifactCandidate(db, {
    scopeKey: 'quota-scope', owner: otherOwner,
    artifact: artifact('artifact-2', otherOwner), policy, now: 1000,
  }));
  assert.equal(hijack.code, 'CUSTODY_DENIED');
});

test('quota exhaustion denies objects and operation reservations without partial writes', async () => {
  const store = syntheticDb();
  assert.equal((await reserve(store, artifact(), { ...policy, maxObjects: 1 })).accepted, true);
  const exhausted = await reserve(store, artifact('artifact-2'), { ...policy, maxObjects: 1 });
  assert.equal(exhausted.code, 'CUSTODY_QUOTA_EXHAUSTED');
  assert.equal(store.snapshot().cadArtifacts.length, 1);
  assert.equal((await store.transaction(db => adapter.consumeQuotaCandidate(db, {
    scopeKey: 'quota-scope', owner, operation: 'class-a', count: 2, policy, now: 1010,
  }))).accepted, true);
  assert.equal((await store.transaction(db => adapter.consumeQuotaCandidate(db, {
    scopeKey: 'quota-scope', owner, operation: 'class-a', count: 1, policy, now: 1020,
  }))).code, 'CUSTODY_QUOTA_EXHAUSTED');
});

test('caller policies cannot widen any fixed custody or orchestration ceiling', async () => {
  const quotaWidenings = [
    { maxStoredBytes: 8 * 1024 * 1024 + 1 }, { maxObjects: 13 },
    { maxClassAOperations: 1001 }, { maxClassBOperations: 1001 },
    { maxDeleteOperations: 1001 }, { maxObjects: 1.5 },
  ];
  for (const widening of quotaWidenings) {
    const store = syntheticDb();
    const widened = { maxStoredBytes: 8 * 1024 * 1024, maxObjects: 12,
      maxClassAOperations: 1000, maxClassBOperations: 1000, maxDeleteOperations: 1000,
      ...widening };
    const outcome = await reserve(store, artifact(), widened);
    assert.equal(outcome.code, 'CUSTODY_POLICY_INVALID');
    assert.equal(store.snapshot().cadArtifacts?.length ?? 0, 0);
    assert.equal((await store.transaction(db => adapter.consumeQuotaCandidate(db, {
      scopeKey: 'quota-scope', owner, operation: 'class-a', count: 1, policy: widened, now: 1010,
    }))).code, 'CUSTODY_POLICY_INVALID');
  }
  for (const widened of [{ maxAttempts: 5, maxConcurrent: 1, budgetMicros: 9_000_000 },
    { maxAttempts: 4, maxConcurrent: 2, budgetMicros: 9_000_000 },
    { maxAttempts: 4, maxConcurrent: 1, budgetMicros: 9_000_001 },
    { maxAttempts: 1.5, maxConcurrent: 1, budgetMicros: 9_000_000 }]) {
    const store = syntheticDb();
    const outcome = await store.transaction(db => adapter.claimUploadCandidate(db, {
      scopeKey: 'phase5-scope', attempt: attempt(), policy: widened,
    }));
    assert.equal(outcome.code, 'ORCHESTRATION_POLICY_INVALID');
    assert.equal(store.snapshot().cadUploadOrchestrationAttempts?.length ?? 0, 0);
  }
});

test('idempotency replay, concurrent claims, and uncertain acknowledgement spend one attempt', async () => {
  const store = syntheticDb();
  const [first, second] = await Promise.all([claim(store), claim(store)]);
  assert.equal([first, second].filter(value => value.accepted).length, 1);
  assert.equal([first, second].filter(value => value.code === 'IDEMPOTENCY_REPLAYED').length, 1);
  assert.equal(store.snapshot().cadUploadOrchestrationAttempts.length, 1);
  // The commit happened but its acknowledgement was lost. Reconciliation/replay must not redispatch.
  const afterUnknownAck = await claim(store);
  assert.equal(afterUnknownAck.code, 'IDEMPOTENCY_REPLAYED');
  assert.equal(afterUnknownAck.replayed, true);
  assert.equal(store.snapshot().cadUploadOrchestrationAttempts.length, 1);
});

test('read-only reconciliation survives a synthetic process restart', async () => {
  const firstProcess = syntheticDb();
  await claim(firstProcess);
  const restarted = syntheticDb(firstProcess.snapshot());
  const reconciled = await adapter.reconcileCandidate(restarted.db, { kind: 'attempt', key: 'attempt-1',
    userId: owner.userId, shopId: owner.shopId, uploadSessionId: owner.uploadSessionId });
  assert.equal(reconciled.code, 'RECONCILIATION_PRESENT');
  assert.equal(reconciled.state, 'reserved');
  assert.equal(reconciled.fence, undefined);
  assert.equal(restarted.snapshot().cadUploadOrchestrationAttempts.length, 1);
});

test('grant revocation is owner-bound and takes effect immediately', async () => {
  const store = syntheticDb();
  const stored = await storeArtifact(store);
  assert.equal(stored.generation, 2);
  assert.equal((await store.transaction(db => adapter.issueGrantCandidate(db, {
    grantDigest: digest('1'), artifactId: 'artifact-1', owner, artifactGeneration: 2,
    issuedAt: 1020, expiresAt: 1100,
  }))).accepted, true);
  assert.equal((await adapter.resolveGrantCandidate(store.db, {
    grantDigest: digest('1'), owner, now: 1030,
  })).accepted, true);
  assert.equal((await store.transaction(db => adapter.transitionArtifactCandidate(db, {
    artifactId: 'artifact-1', owner, expectedGeneration: 2, transition: 'quarantined',
    reasonDigest: digest('2'), now: 1040,
  }))).accepted, true);
  assert.equal((await adapter.resolveGrantCandidate(store.db, {
    grantDigest: digest('1'), owner, now: 1050,
  })).code, 'CUSTODY_DENIED');
});

test('confirmed deletion writes a replay fence, releases quota, and reconciles the tombstone', async () => {
  const store = syntheticDb();
  await storeArtifact(store);
  const deleting = await store.transaction(db => adapter.transitionArtifactCandidate(db, {
    artifactId: 'artifact-1', owner, expectedGeneration: 2, transition: 'deleting', now: 1020,
  }));
  assert.equal(deleting.generation, 3);
  const deleted = await store.transaction(db => adapter.confirmDeletedCandidate(db, {
    scopeKey: 'quota-scope', artifactId: 'artifact-1', owner, expectedGeneration: 3,
    tombstoneDigest: digest('4'), now: 1030,
  }));
  assert.equal(deleted.code, 'ARTIFACT_DELETED');
  assert.equal(store.snapshot().cadArtifacts.length, 0);
  assert.equal(store.snapshot().cadArtifactQuotaLedgers[0].objectCount, 0);
  const replay = await store.transaction(db => adapter.confirmDeletedCandidate(db, {
    scopeKey: 'quota-scope', artifactId: 'artifact-1', owner, expectedGeneration: 3,
    tombstoneDigest: digest('4'), now: 1040,
  }));
  assert.equal(replay.replayed, true);
  for (const mismatch of [{ scopeKey: 'wrong-scope', tombstoneDigest: digest('4') },
    { scopeKey: 'quota-scope', tombstoneDigest: digest('5') }]) {
    const denied = await store.transaction(db => adapter.confirmDeletedCandidate(db, {
      ...mismatch, artifactId: 'artifact-1', owner, expectedGeneration: 3, now: 1040,
    }));
    assert.equal(denied.code, 'CUSTODY_DENIED');
  }
  const legacyRows = store.snapshot();
  delete legacyRows.cadArtifactTombstones[0].scopeKey;
  const legacy = syntheticDb(legacyRows);
  assert.equal((await legacy.transaction(db => adapter.confirmDeletedCandidate(db, {
    scopeKey: 'quota-scope', artifactId: 'artifact-1', owner, expectedGeneration: 3,
    tombstoneDigest: digest('4'), now: 1040,
  }))).code, 'CUSTODY_DENIED');
  const reconciled = await adapter.reconcileCandidate(store.db, { kind: 'tombstone', key: 'artifact-1',
    userId: owner.userId, shopId: owner.shopId, uploadSessionId: owner.uploadSessionId });
  assert.equal(reconciled.state, 'deleted');
  assert.equal(reconciled.tombstoneDigest, digest('4'));
});

test('upload and conversion transitions remain one-shot and owner-bound', async () => {
  const store = syntheticDb();
  await storeArtifact(store);
  assert.equal((await claim(store)).accepted, true);
  assert.equal((await store.transaction(db => adapter.advanceUploadCandidate(db, {
    attemptId: 'attempt-1', owner, fence: 1, command: 'body-accepted', now: 1020,
    byteCount: 100, restrictedDigest: digest('a'),
  }))).accepted, true);
  assert.equal((await store.transaction(db => adapter.advanceUploadCandidate(db, {
    attemptId: 'attempt-1', owner, fence: 1, command: 'admitted', now: 1030,
    artifactId: 'artifact-1', jobId: 'job-1',
  }))).accepted, true);
  const conversion = await store.transaction(db => adapter.claimConversionCandidate(db, {
    scopeKey: 'phase5-scope', jobId: 'job-1', owner, expectedGeneration: 0, now: 1040,
  }));
  assert.equal(conversion.code, 'CONVERSION_NOT_AUTHORIZED');
  assert.equal(store.snapshot().cadUploadJobs[0].state, 'admitted');
  await store.transaction(async db => {
    const [job] = await db.query('cadUploadJobs').withIndex('by_jobId', q => q.eq('jobId', 'job-1')).take(2);
    await db.patch(job._id, { conversionAuthorized: true });
  });
  const authorizedConversion = await store.transaction(db => adapter.claimConversionCandidate(db, {
    scopeKey: 'phase5-scope', jobId: 'job-1', owner, expectedGeneration: 0, now: 1040,
  }));
  assert.equal(authorizedConversion.accepted, true);
  assert.equal(authorizedConversion.generation, 1);
  assert.equal(authorizedConversion.providerDispatchEnabled, false);
  const replay = await store.transaction(db => adapter.claimConversionCandidate(db, {
    scopeKey: 'phase5-scope', jobId: 'job-1', owner, expectedGeneration: 0, now: 1041,
  }));
  assert.equal(replay.code, 'CONVERSION_ALREADY_CLAIMED');
  assert.equal((await store.transaction(db => adapter.advanceConversionCandidate(db, {
    jobId: 'job-1', owner: otherOwner, expectedGeneration: 1, command: 'quarantined',
    reasonDigest: digest('3'), now: 1050,
  }))).code, 'CONVERSION_DENIED');

  for (const value of [derivedArtifact('preview-1', 'preview-geometry', digest('2')),
    derivedArtifact('stl-1', 'derived-stl', digest('3'))]) {
    assert.equal((await reserve(store, value)).accepted, true);
    assert.equal((await store.transaction(db => adapter.transitionArtifactCandidate(db, {
      artifactId: value.artifactId, owner, expectedGeneration: 1, transition: 'stored', now: 1050,
    }))).accepted, true);
  }
  const ready = await store.transaction(db => adapter.advanceConversionCandidate(db, {
    jobId: 'job-1', owner, expectedGeneration: 1, command: 'ready', now: 1060,
    previewArtifactId: 'preview-1', stlArtifactId: 'stl-1', geometryDigest: digest('9'),
    previewDigest: digest('2'), stlDigest: digest('3'), cleanupConfirmed: true,
  }));
  assert.equal(ready.code, 'CONVERSION_READY_RECORDED');
  assert.equal(store.snapshot().cadUploadJobs[0].state, 'ready');
});

test('rollback closes first, revokes grants, quarantines uncertainty, and blocks later claims', async () => {
  const store = syntheticDb();
  await storeArtifact(store);
  await claim(store);
  await store.transaction(db => adapter.issueGrantCandidate(db, { grantDigest: digest('4'),
    artifactId: 'artifact-1', owner, artifactGeneration: 2, issuedAt: 1020, expiresAt: 1100 }));
  const closed = await store.transaction(db => adapter.closeForRollbackCandidate(db, {
    scopeKey: 'phase5-scope', userId: owner.userId, shopId: owner.shopId,
    uploadSessionId: owner.uploadSessionId,
    reasonDigest: digest('5'), now: 1030,
  }));
  assert.equal(closed.code, 'ROLLBACK_CLOSED_FIRST');
  assert.deepEqual([closed.admissionClosed, closed.conversionClosed, closed.grantsRevoked,
    closed.uncertainRecordsQuarantined], [true, true, true, true]);
  assert.equal(store.snapshot().cadUploadOrchestrationAttempts[0].state, 'quarantined');
  assert.equal(store.snapshot().cadArtifacts[0].state, 'quarantined');
  assert.equal(store.snapshot().cadArtifactDownloadGrants[0].revokedAt, 1030);
  const later = await claim(store, attempt(digest('6'), 'attempt-2'));
  assert.equal(later.code, 'ORCHESTRATION_CLOSED');
});

test('failed rollback is atomic and registered handlers sanitize internal errors', async () => {
  const seeded = syntheticDb();
  await claim(seeded);
  const failing = syntheticDb(seeded.snapshot(), { patchTable: 'cadUploadOrchestrationAttempts' });
  await assert.rejects(failing.transaction(db => adapter.closeForRollbackCandidate(db, {
    scopeKey: 'phase5-scope', userId: owner.userId, shopId: owner.shopId,
    uploadSessionId: owner.uploadSessionId,
    reasonDigest: digest('7'), now: 1040,
  })), /PRIVATE_SENTINEL/);
  assert.equal(failing.snapshot().cadPhase5ControlState?.length ?? 0, 0);
  assert.equal(failing.snapshot().cadUploadOrchestrationAttempts[0].state, 'reserved');

  const mutationFailure = syntheticDb({}, { insertTable: 'cadArtifactQuotaLedgers' });
  let exposed = '';
  await assert.rejects(mutationFailure.transaction(db => adapter.reserveArtifact.handler({ db }, {
    scopeKey: 'quota-scope', owner, artifact: artifact(), policy, now: 1000,
  })), error => {
    exposed = error.message;
    return error.message === 'DURABLE_ADAPTER_TRANSACTION_ABORT';
  });
  assert.equal(exposed.includes('PRIVATE_SENTINEL'), false);
  assert.equal(mutationFailure.snapshot().cadArtifacts?.length ?? 0, 0);

  const broken = syntheticDb({}, { queryTable: 'cadArtifacts' });
  const sanitized = await adapter.readArtifact.handler({ db: broken.db }, { artifactId: 'artifact-1', owner });
  assert.equal(sanitized.code, 'DURABLE_ADAPTER_UNAVAILABLE');
  assert.equal(JSON.stringify(sanitized).includes('PRIVATE_SENTINEL'), false);
  assert.equal(sanitized.bodyAdmissionAuthorized, false);
  assert.equal(sanitized.providerDispatchEnabled, false);
  assert.equal(sanitized.conversionDispatchEnabled, false);
  assert.equal(sanitized.downloadRouteEnabled, false);
});

test('state-changing adapters reject non-finite timestamps and invalid generations', async () => {
  const store = syntheticDb();
  await storeArtifact(store);
  assert.equal((await store.transaction(db => adapter.transitionArtifactCandidate(db, {
    artifactId: 'artifact-1', owner, expectedGeneration: -1, transition: 'quarantined',
    reasonDigest: digest('8'), now: 1020,
  }))).code, 'CUSTODY_INVALID');
  assert.equal((await store.transaction(db => adapter.consumeQuotaCandidate(db, {
    scopeKey: 'quota-scope', owner, operation: 'class-a', count: 1, policy, now: Number.NaN,
  }))).code, 'CUSTODY_POLICY_INVALID');
  assert.equal((await store.transaction(db => adapter.closeForRollbackCandidate(db, {
    scopeKey: 'phase5-scope', userId: owner.userId, shopId: owner.shopId,
    uploadSessionId: owner.uploadSessionId, reasonDigest: digest('9'), now: -1,
  }))).code, 'ROLLBACK_INVALID');
  assert.equal(store.snapshot().cadArtifacts[0].state, 'stored');
});

test('source remains internal-only and does not wire routes, providers, sessions, or runtime activation', () => {
  const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
  assert.doesNotMatch(source, /export const \w+ = (?:query|mutation|action)\s*\(/);
  assert.doesNotMatch(source, /httpAction|httpRouter|fetch\s*\(|process\.env|@vercel\/sandbox|cloudflare|r2/i);
  assert.doesNotMatch(source, /conversionAuthorized:\s*true|patch\([^\n]+conversionAuthorized/);
  for (const name of ['reserveArtifact', 'consumeQuota', 'transitionArtifact', 'confirmDeleted',
    'issueDownloadGrant', 'claimUpload', 'advanceUpload', 'claimConversion',
    'advanceConversion', 'closeForRollback']) assert.equal(typeof adapter[name].handler, 'function');
});
