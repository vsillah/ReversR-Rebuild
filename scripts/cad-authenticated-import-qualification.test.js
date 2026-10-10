const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { AUTHENTICATED_IMPORT_QUERY_VALUE, SOURCE_SHA256, STL_SHA256, buildArtifacts,
  createAuthenticatedImportQualificationAdapter, createAuthenticatedImportStateStore,
  createMemoryStateStore, inspectAuthenticatedImportQualification,
  parseSyntheticArtifactResponse } = require('../utils/cadAuthenticatedImportQualification');
const { inspectCadInternalTesterPreview } = require('../utils/cadInternalTesterPreview');

const hash = value => createHash('sha256').update(value).digest('hex');
const exactRoute = `?cadPreview=${AUTHENTICATED_IMPORT_QUERY_VALUE}`
  + `&cadQualification=${AUTHENTICATED_IMPORT_QUERY_VALUE}&cadAuth=synthetic&cadPhase=input`;

function durableStorage(seed = null) {
  const values = new Map(seed ? [['qualification', seed]] : []);
  return { getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value), values };
}

test('qualification route is localhost-only, exact and rejects identity or grant query data', () => {
  assert.deepEqual(inspectAuthenticatedImportQualification({ hostname: '127.0.0.1', search: exactRoute }),
    { enabled: true, code: 'AUTHENTICATED_IMPORT_QUALIFICATION_READY' });
  assert.equal(inspectAuthenticatedImportQualification({ hostname: 'reversr.vercel.app', search: exactRoute }).enabled, false);
  assert.equal(inspectAuthenticatedImportQualification({ hostname: 'localhost',
    search: `${exactRoute}&owner=someone` }).code, 'SENSITIVE_QUERY_REJECTED');
  assert.equal(inspectAuthenticatedImportQualification({ hostname: 'localhost',
    search: '?cadQualification=authenticated-import-v1' }).enabled, false);
  assert.equal(inspectCadInternalTesterPreview({ hostname: 'localhost', search: exactRoute }).code,
    'CAD_TEST_PREVIEW_AUTHENTICATED_IMPORT');
});

test('adapter is physically closed and selected source progresses automatically to ready', async () => {
  const states = []; const adapter = createAuthenticatedImportQualificationAdapter({
    stateStore: createMemoryStateStore(), now: () => 1000,
  });
  for (const key of ['configured', 'routeMounted', 'bodyAdmissionAuthorized', 'sessionIssuanceRouted',
    'providerDispatchEnabled', 'conversionDispatchEnabled', 'storageDispatchEnabled',
    'downloadGrantRouted', 'privateCadEnabled']) assert.equal(adapter[key], false);
  assert.equal(adapter.maxRetries, 0);
  adapter.selectSource('file', state => states.push(state.status));
  const result = await adapter.run({ onState: state => states.push(state.status) });
  assert.equal(result.ok, true); assert.deepEqual(states, ['selected', 'uploading', 'processing', 'ready']);
  assert.equal(adapter.status().status, 'ready'); assert.equal(adapter.fixture().format, 'IGES');
});

test('sample and generated file choices are exclusive and a consumed run cannot dispatch twice', async () => {
  let waits = 0; const adapter = createAuthenticatedImportQualificationAdapter({
    stateStore: createMemoryStateStore(), wait: async () => { waits += 1; }, now: () => 1000,
  });
  adapter.selectSource('file'); adapter.selectSource('sample');
  assert.equal(adapter.status().sourceChoice, 'sample');
  assert.equal((await adapter.run()).ok, true); assert.equal(waits, 2);
  assert.equal((await adapter.run()).code, 'QUALIFICATION_UNAVAILABLE'); assert.equal(waits, 2);
});

test('ready state survives reload without replaying progress', async () => {
  const storage = durableStorage(); const key = 'qualification';
  const first = createAuthenticatedImportQualificationAdapter({
    stateStore: createAuthenticatedImportStateStore(storage, key), now: () => 1000,
  });
  first.selectSource('sample'); await first.run();
  const second = createAuthenticatedImportQualificationAdapter({
    stateStore: createAuthenticatedImportStateStore(storage, key), now: () => 1001,
  });
  assert.equal(second.status().status, 'ready'); assert.equal(second.status().sourceChoice, 'sample');
  assert.equal(second.fixture().sourceFileName, 'included-generated-sample.iges');
});

test('in-flight reload and corrupt persistence become unknown with no retry', () => {
  for (const value of [JSON.stringify({ schemaVersion: 1, status: 'processing',
    code: 'SYNTHETIC_DERIVATION_CHECK', sourceChoice: 'file', attemptConsumed: true,
    cleanupVerified: false, artifactsAvailable: false }), '{bad']) {
    const storage = durableStorage(value); const adapter = createAuthenticatedImportQualificationAdapter({
      stateStore: createAuthenticatedImportStateStore(storage, 'qualification'),
    });
    assert.equal(adapter.status().status, 'unknown'); assert.equal(adapter.fixture(), null);
    assert.equal(adapter.artifacts(), null);
  }
});

test('safe failure recovers, while unknown outcome blocks resubmission until revocation', async () => {
  const adapter = createAuthenticatedImportQualificationAdapter({ stateStore: createMemoryStateStore() });
  adapter.previewRecoverableFailure(); assert.equal(adapter.status().status, 'recoverable-error');
  adapter.recoverSafeFailure(); assert.equal(adapter.status().status, 'idle');
  adapter.previewRecoverableFailure(); adapter.previewUnknownOutcome();
  assert.equal(adapter.status().status, 'unknown');
  assert.equal((await adapter.run()).code, 'UNKNOWN_OUTCOME_NO_RETRY');
  adapter.revokeUnknown(); assert.equal(adapter.status().status, 'deleted');
  adapter.startNew(); assert.equal(adapter.status().status, 'idle');
});

test('deletion removes all client metadata and artifact access', async () => {
  const adapter = createAuthenticatedImportQualificationAdapter({ stateStore: createMemoryStateStore(), now: () => 1 });
  adapter.selectSource('file'); await adapter.run(); assert.ok(adapter.fixture());
  adapter.deleteArtifacts();
  assert.deepEqual(adapter.status(), { schemaVersion: 1, status: 'deleted', code: 'SYNTHETIC_ARTIFACTS_DELETED',
    sourceChoice: null, attemptConsumed: true, cleanupVerified: true, artifactsAvailable: false });
  assert.equal(adapter.fixture(), null); assert.equal(adapter.artifacts(), null);
  assert.deepEqual(adapter.readArtifact('original-igs', { signedIn: true, ownerMatch: true,
    grantFresh: true, deleted: false }), { ok: false, code: 'ARTIFACT_UNAVAILABLE',
  message: 'This artifact is unavailable.' });
});

test('cross-account, signed-out, stale, deleted and malformed projections reveal no metadata', () => {
  const artifact = buildArtifacts('file').original;
  const response = { schemaVersion: 1, status: 'success', artifact: { kind: artifact.kind,
    fileName: artifact.fileName, format: artifact.format, byteCount: artifact.byteCount,
    sha256: artifact.sha256, bytes: artifact.bytes } };
  for (const context of [{ signedIn: false, ownerMatch: true, grantFresh: true },
    { signedIn: true, ownerMatch: false, grantFresh: true },
    { signedIn: true, ownerMatch: true, grantFresh: false },
    { signedIn: true, ownerMatch: true, grantFresh: true, deleted: true }]) {
    assert.deepEqual(parseSyntheticArtifactResponse(response, context),
      { ok: false, code: 'ARTIFACT_UNAVAILABLE', message: 'This artifact is unavailable.' });
  }
  assert.equal(parseSyntheticArtifactResponse({ ...response, privateDigest: 'x' },
    { signedIn: true, ownerMatch: true, grantFresh: true }).ok, false);
  assert.equal(parseSyntheticArtifactResponse({ ...response, artifact: { ...response.artifact,
    bytes: new Uint8Array([1]) } }, { signedIn: true, ownerMatch: true, grantFresh: true }).ok, false);
});

test('original IGS and derived STL bytes and hashes are deterministic', () => {
  const first = buildArtifacts('file'); const second = buildArtifacts('sample');
  assert.equal(hash(first.original.bytes), SOURCE_SHA256); assert.equal(hash(first.stl.bytes), STL_SHA256);
  assert.deepEqual(first.original.bytes, second.original.bytes); assert.deepEqual(first.stl.bytes, second.stl.bytes);
  assert.equal(first.original.format, 'model/iges'); assert.equal(first.stl.format, 'model/stl');
  assert.match(first.stl.content, /^solid reversr_public_cube_inspection_mesh_mm/);
});

test('source graph has no transport, provider, credential or enabled runtime path', () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'utils/cadAuthenticatedImportQualification.js'), 'utf8');
  for (const forbidden of [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /node:crypto/,
    /process\.env/, /cadR2PrivateArtifactCustody/, /cadPhase5DerivedArtifactOrchestrator/]) {
    assert.doesNotMatch(source, forbidden);
  }
  assert.match(fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8'),
    /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(fs.readFileSync(path.join(root, 'utils/cadUserImportBridge.js'), 'utf8'),
    /const CAD_USER_IMPORT_ENABLED = false;/);
});
