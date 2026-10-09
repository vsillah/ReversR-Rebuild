const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createMemoryQualificationStateStore,
  createSyntheticIgsQualificationPipeline,
  createSyntheticIgsSource,
  createVolatileCadCustody,
  inspectSyntheticIgsQualification,
  validateSyntheticIgsUpload,
} = require('../utils/igsPrivatePipelineQualification');

test('qualification is explicit and localhost-only', () => {
  assert.equal(inspectSyntheticIgsQualification({ hostname: 'localhost', search: '?cadQualification=synthetic-igs-v1' }).enabled, true);
  assert.equal(inspectSyntheticIgsQualification({ hostname: 'reversr.vercel.app', search: '?cadQualification=synthetic-igs-v1' }).enabled, false);
  assert.equal(inspectSyntheticIgsQualification({ hostname: 'localhost', search: '' }).enabled, false);
});

test('generated source is valid IGES while STEP and malformed input stop before conversion', async () => {
  assert.equal(validateSyntheticIgsUpload(createSyntheticIgsSource()).ok, true);
  let conversions = 0;
  const converter = { convert: async () => { conversions += 1; throw new Error('must not run'); } };
  const step = createSyntheticIgsSource();
  const stepPipeline = createSyntheticIgsQualificationPipeline({
    converter,
    sourceFactory: () => ({ ...step, fileName: 'blocked.step' }),
    randomId: () => 'step',
  });
  const stepResult = await stepPipeline.run();
  assert.equal(stepResult.code, 'IGS_ONLY');
  assert.equal(conversions, 0);

  const malformedPipeline = createSyntheticIgsQualificationPipeline({
    converter,
    sourceFactory: () => ({ fileName: 'malformed.igs', mimeType: 'model/iges', bytes: new TextEncoder().encode('not iges') }),
    randomId: () => 'malformed',
  });
  const malformedResult = await malformedPipeline.run();
  assert.equal(malformedResult.code, 'SOURCE_MALFORMED');
  assert.equal(conversions, 0);
});

test('authenticated synthetic path produces bounded preview/STL and verifies deletion', async () => {
  const custody = createVolatileCadCustody();
  const store = createMemoryQualificationStateStore();
  const pipeline = createSyntheticIgsQualificationPipeline({ custody, stateStore: store, randomId: () => 'success' });
  const result = await pipeline.run();
  assert.equal(result.ok, true);
  assert.equal(result.code, 'SYNTHETIC_IGS_QUALIFIED');
  assert.equal(result.fixture.previewGeometry.kind, 'mesh');
  assert.equal(result.fixture.triangles, 12);
  assert.match(result.fixture.derivedInspectionStl.content, /inspection_mesh_mm/);
  assert.equal((result.fixture.derivedInspectionStl.content.match(/facet normal/g) || []).length, 12);
  assert.equal(custody.isEmpty(), true);
  assert.doesNotMatch(JSON.stringify(store.read()), /content|filename|generated-synthetic|credential|authorization|bytes/i);
  assert.deepEqual(result.receipt, {
    schemaVersion: 1,
    runRef: 'synthetic-run-success',
    accountSession: 'verified-synthetic',
    uploadSession: 'one-attempt-consumed',
    validation: 'iges-only-passed',
    conversion: 'inspection-preview-stl-only',
    cleanup: 'verified',
    retries: 0,
  });
  assert.doesNotMatch(JSON.stringify(result.receipt), /content|filename|generated-synthetic|credential|authorization/i);
  const second = await pipeline.run();
  assert.equal(second.code, 'ATTEMPT_ALREADY_CONSUMED');
});

test('restart after in-flight state is terminal, cleanup-aware, and does not retry', async () => {
  const store = createMemoryQualificationStateStore({
    schemaVersion: 1,
    status: 'processing',
    code: 'ATTEMPT_CONSUMED',
    runRef: 'synthetic-run-restart',
    attemptConsumed: true,
    cleanupVerified: false,
    unknownOutcome: false,
  });
  let conversions = 0;
  const pipeline = createSyntheticIgsQualificationPipeline({
    stateStore: store,
    converter: { convert: async () => { conversions += 1; } },
  });
  assert.equal(pipeline.status().code, 'RESTARTED_AFTER_INFLIGHT_NO_RETRY');
  assert.equal(pipeline.status().cleanupVerified, true);
  assert.equal((await pipeline.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
  assert.equal(conversions, 0);
});

test('cleanup ambiguity closes the session and suppresses output', async () => {
  const custody = createVolatileCadCustody();
  const brokenCustody = {
    put: custody.put,
    read: custody.read,
    remove: async () => { throw new Error('unknown'); },
    isEmpty: custody.isEmpty,
  };
  const pipeline = createSyntheticIgsQualificationPipeline({ custody: brokenCustody, randomId: () => 'cleanup' });
  const result = await pipeline.run();
  assert.equal(result.code, 'CLEANUP_UNKNOWN_NO_RETRY');
  assert.equal(pipeline.status().unknownOutcome, true);
});

test('an unavailable terminal fence admits no source and consumes the in-memory attempt', async () => {
  let custodyWrites = 0;
  const pipeline = createSyntheticIgsQualificationPipeline({
    stateStore: { read: () => null, write: () => { throw new Error('unavailable'); } },
    custody: {
      put: async () => { custodyWrites += 1; },
      read: async () => null,
      remove: async () => true,
      isEmpty: () => true,
    },
    randomId: () => 'storage',
  });
  const result = await pipeline.run();
  assert.equal(result.code, 'STATE_PERSISTENCE_UNAVAILABLE');
  assert.equal(custodyWrites, 0);
  assert.equal(pipeline.status().attemptConsumed, true);
  assert.equal((await pipeline.run()).code, 'ATTEMPT_ALREADY_CONSUMED');
});
