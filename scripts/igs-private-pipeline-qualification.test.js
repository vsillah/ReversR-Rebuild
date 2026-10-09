const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createDurableQualificationStateStore,
  createMemoryQualificationStateStore,
  createSyntheticIgsQualificationPipeline,
  createSyntheticIgsSource,
  createVolatileCadCustody,
  inspectSyntheticIgsQualification,
  validateSyntheticIgsUpload,
} = require('../utils/igsPrivatePipelineQualification');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const { createUploadSessionVerifier } = require('../server/uploadSession');

function durableStorage(initial = new Map()) {
  const values = new Map(initial);
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    values,
  };
}

test('qualification is explicit and localhost-only', () => {
  assert.equal(inspectSyntheticIgsQualification({ hostname: 'localhost', search: '?cadQualification=synthetic-igs-v1' }).enabled, true);
  assert.equal(inspectSyntheticIgsQualification({ hostname: 'reversr.vercel.app', search: '?cadQualification=synthetic-igs-v1' }).enabled, false);
  assert.equal(inspectSyntheticIgsQualification({ hostname: 'localhost', search: '' }).enabled, false);
});

test('generated source passes shared IGES admission while rejected input never converts', async () => {
  assert.equal(validateSyntheticIgsUpload(createSyntheticIgsSource()).ok, true);
  let conversions = 0;
  const converter = { convert: async () => { conversions += 1; throw new Error('must not run'); } };
  const valid = createSyntheticIgsSource();
  for (const [source, code] of [
    [{ ...valid, fileName: 'blocked.step' }, 'UNSUPPORTED'],
    [{ fileName: 'malformed.igs', mimeType: 'model/iges', bytes: new TextEncoder().encode('not iges') }, 'MALFORMED'],
  ]) {
    const result = await createSyntheticIgsQualificationPipeline({ converter, sourceFactory: () => source }).run();
    assert.equal(result.code, code);
  }
  assert.equal(conversions, 0);
});

test('browser-only synthetic path produces bounded deterministic output and verifies deletion', async () => {
  const custody = createVolatileCadCustody();
  const store = createMemoryQualificationStateStore();
  const pipeline = createSyntheticIgsQualificationPipeline({ custody, stateStore: store, randomId: () => 'success' });
  const result = await pipeline.run();
  assert.equal(result.ok, true);
  assert.equal(result.code, 'SYNTHETIC_IGS_QUALIFIED');
  assert.equal(result.fixture.previewGeometry.kind, 'mesh');
  assert.equal(result.fixture.triangles, 12);
  assert.equal(result.fixture.qualificationProvenance.kind, 'synthetic-igs-local');
  assert.equal(result.fixture.qualificationProvenance.productionAuthenticationQualified, false);
  assert.equal(result.fixture.qualificationProvenance.realGeometryConverterQualified, false);
  assert.match(result.fixture.derivedInspectionStl.content, /inspection_mesh_mm/);
  assert.equal((result.fixture.derivedInspectionStl.content.match(/facet normal/g) || []).length, 12);
  assert.equal(custody.isEmpty(), true);
  assert.doesNotMatch(JSON.stringify(store.read()), /content|filename|generated-synthetic|credential|authorization|bytes/i);
  assert.deepEqual(result.receipt, {
    schemaVersion: 1,
    runRef: 'synthetic-run-success',
    accountSessionAdapter: 'browser-only-synthetic',
    uploadSessionAdapter: 'browser-only-synthetic-one-attempt',
    productionAuthentication: 'unqualified',
    validation: 'shared-iges-admission-passed',
    conversionAdapter: 'deterministic-fixed-cube-synthetic',
    realGeometryConverter: 'unqualified',
    cleanup: 'verified',
    retries: 0,
  });
  assert.doesNotMatch(JSON.stringify(result.receipt), /content|filename|generated-synthetic|credential|authorization/i);
  assert.equal((await pipeline.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
});

test('real upload-session service and verifier bind a synthetic server principal', async () => {
  let now = 1000;
  const context = Object.freeze({ loginHandle: 'qualification-test-context' });
  const grant = Object.freeze({ userId: 'qualification-user', shopId: 'qualification-shop', loginSessionId: 'qualification-login',
    authMethod: 'password', cadUploadAllowed: true, expiresAt: 61000 });
  const service = createUploadSessionService({
    store: createInMemoryUploadSessionStoreForTests({ testOnly: true }),
    now: () => now,
    resolveAuthorization: async supplied => supplied === context ? grant : null,
    refreshAuthorization: async binding => binding.loginSessionId === grant.loginSessionId ? grant : null,
  });
  const issued = await service.issueSession(context, { transport: 'bearer', lifetimeMs: 60000 });
  assert.equal(issued.ok, true);
  const verify = createUploadSessionVerifier({ lookupSession: service.lookupSession, allowedOrigins: [], now: () => now });
  const verified = await verify({ headers: { authorization: `Bearer ${issued.credential}` },
    rawHeaders: ['Authorization', `Bearer ${issued.credential}`] });
  assert.equal(verified.ok, true);
  assert.deepEqual({ userId: verified.principal.userId, shopId: verified.principal.shopId,
    authMethod: verified.principal.authMethod, transport: verified.principal.transport },
  { userId: grant.userId, shopId: grant.shopId, authMethod: 'password', transport: 'bearer' });
  assert.doesNotMatch(JSON.stringify(verified), /us1\.|credential|authorization/i);
  now = issued.expiresAt;
  assert.deepEqual(await verify({ headers: { authorization: `Bearer ${issued.credential}` } }), { ok: false, code: 'SESSION_EXPIRED' });
});

test('durable corrupt JSON and invalid schema are consumed as unknown outcomes', async () => {
  for (const raw of ['{', JSON.stringify({ schemaVersion: 99, status: 'idle' })]) {
    const storage = durableStorage(new Map([['state', raw]]));
    let conversions = 0;
    const pipeline = createSyntheticIgsQualificationPipeline({
      stateStore: createDurableQualificationStateStore(storage, 'state'),
      converter: { convert: async () => { conversions += 1; } },
    });
    assert.equal(pipeline.status().code, 'CORRUPT_DURABLE_STATE_NO_RETRY');
    assert.equal(pipeline.status().attemptConsumed, true);
    assert.equal(pipeline.status().cleanupVerified, false);
    assert.equal(pipeline.status().unknownOutcome, true);
    assert.equal((await pipeline.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
    assert.equal(conversions, 0);
  }
});

test('restart after durable in-flight state is consumed, unknown, and never claims cleanup', async () => {
  const storage = durableStorage();
  const stateStore = createDurableQualificationStateStore(storage, 'state');
  stateStore.write({ schemaVersion: 1, status: 'processing', code: 'ATTEMPT_CONSUMED', runRef: 'synthetic-run-restart',
    attemptConsumed: true, cleanupVerified: false, unknownOutcome: false });
  let conversions = 0;
  const pipeline = createSyntheticIgsQualificationPipeline({ stateStore,
    converter: { convert: async () => { conversions += 1; } } });
  assert.equal(pipeline.status().code, 'RESTARTED_AFTER_INFLIGHT_NO_RETRY');
  assert.equal(pipeline.status().cleanupVerified, false);
  assert.equal(pipeline.status().unknownOutcome, true);
  assert.equal((await pipeline.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
  assert.equal(conversions, 0);
  const restartedAgain = createSyntheticIgsQualificationPipeline({ stateStore,
    converter: { convert: async () => { conversions += 1; } } });
  assert.equal(restartedAgain.status().code, 'RESTARTED_AFTER_INFLIGHT_NO_RETRY');
  assert.equal((await restartedAgain.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
  assert.equal(conversions, 0);
});

test('cleanup ambiguity closes the session and suppresses output', async () => {
  const custody = createVolatileCadCustody();
  const brokenCustody = { put: custody.put, read: custody.read,
    remove: async () => { throw new Error('unknown'); }, isEmpty: custody.isEmpty };
  const pipeline = createSyntheticIgsQualificationPipeline({ custody: brokenCustody, randomId: () => 'cleanup' });
  const result = await pipeline.run();
  assert.equal(result.code, 'CLEANUP_UNKNOWN_NO_RETRY');
  assert.equal(pipeline.status().unknownOutcome, true);
  assert.equal((await pipeline.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
});

test('an unavailable durable fence admits no source and consumes the in-memory attempt', async () => {
  let custodyWrites = 0;
  const pipeline = createSyntheticIgsQualificationPipeline({
    stateStore: { read: () => null, write: () => { throw new Error('unavailable'); } },
    custody: { put: async () => { custodyWrites += 1; }, read: async () => null,
      remove: async () => true, isEmpty: () => true }, randomId: () => 'storage',
  });
  const result = await pipeline.run();
  assert.equal(result.code, 'STATE_PERSISTENCE_UNAVAILABLE');
  assert.equal(custodyWrites, 0);
  assert.equal(pipeline.status().attemptConsumed, true);
  assert.equal((await pipeline.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
});
