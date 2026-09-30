// Source-only schema rebind review. Reads fixed tracked sources only.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { reviewBindingInput } = require('../offline/cad-auth-durable-adapter-rejection-prep/candidate');

const ROOT = path.resolve(__dirname, '..');
const STEM = 'cad-auth-session-evidence-schema-rebind';
const PACKET = `docs/${STEM}.json`;

const PINS = Object.freeze({
  'docs/cad-auth-session-evidence-source-record.json':
    '0d8b2c06fb2ad7f32f126909c3cbe20b9baa95f0aaa6f1d89ed892bc5820a14d',
  'docs/cad-auth-durable-adapter-rejection-prep.json':
    '6d1d6c37e3db52b50a5546e7bcedac97497d248dbb4898706ce9dca64e753449',
  'docs/cad-auth-bounded-session-evidence-ref-prep.json':
    'c6525cccc7ee569550edabefe20e7d60bb111d342a69fe91be4d3c9c9657111e',
});

const OWN = Object.freeze([
  'offline/cad-auth-durable-adapter-rejection-prep/candidate.js',
  'offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json',
  `docs/${STEM}.md`,
  `scripts/${STEM}-checker.js`,
  `scripts/${STEM}.test.js`,
]);

const CURRENT = Object.freeze({
  mergeCommit: 'f0d459a522c7c70b394411ae580b1bddf6a9d41d',
  pullRequest: 449,
  githubDeploymentId: 6748245138,
  productionDeploymentReference: '6748245138',
  productionTarget: 'https://reversr-b3m7y972q-vsillahs-projects.vercel.app',
  canonicalRoute: 'https://reversr.vercel.app/api/cad/user-import',
  failClosedSmoke: {
    status: 401,
    code: 'USER_SESSION_REQUIRED',
    observedAtUtc: '2026-09-30T00:07:10Z',
  },
});

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function bindingFromSourceRecord(sourceRecordPacket) {
  const record = sourceRecordPacket.sourceRecord;
  return {
    schemaVersion: 1,
    boundedSessionRef: record.boundedSessionRef,
    sessionId: record.exactExistingSessionId,
    durableEvidenceSha256: record.durableEvidenceSha256,
    productionDeploymentReference: CURRENT.productionDeploymentReference,
    provenance: {
      sessionId: record.exactExistingSessionId,
      durableEvidenceSha256: record.durableEvidenceSha256,
      productionDeploymentReference: CURRENT.productionDeploymentReference,
      sourceCommit: CURRENT.mergeCommit,
      sourceInputStopTask: '01a0ee9f-28aa-7d71-b170-4ae4236148d0',
      sessionInputStopTask: '01a0eea2-7b7d-7d30-adbf-c07784cf237a',
      stopDisposition: 'STOPPED_SOURCE_INPUTS_UNRESOLVED',
      runtimeInstallStopSha256: 'd706fd784052b72ab48d7fc0dfebaf3369251b8490c6925e5d26c4487b367540',
      approvedNonSecretSourceRecordSha256: sourceRecordPacket.sourceRecordSha256,
    },
  };
}

function exactRuntimeInstallCompletionPhrase({
  packetSha256 = '<schemaRebindPacketSha256>',
  sourceCommit = '<schemaRebindSourceCommit>',
} = {}) {
  return `I approve a bounded source-only CAD Auth production live-opening runtime installation completion gate for ReversR-Rebuild, bound to bounded-session/evidence schema rebind packet SHA-256 ${packetSha256} at source commit ${sourceCommit}, PR #449 merge commit ${CURRENT.mergeCommit}, session/evidence source-record packet SHA-256 ${PINS['docs/cad-auth-session-evidence-source-record.json']}, source record SHA-256 81178504968fffa01d265b9b9541dda78935133f71f174bf0d667a79a5ca8ce5, production deployment ${CURRENT.githubDeploymentId}, production target ${CURRENT.productionTarget}, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at ${CURRENT.failClosedSmoke.observedAtUtc}. Scope: create a dedicated task/worktree/branch to implement and review only disabled-by-default source, docs, tests, checkers, and manifests that make the reviewed exact production execution binding installation and durable adapter supply path available to createCadProductionExecutionBinding from the schema-rebound source record, while preserving default fail-closed behavior unless a later explicit live-opening gate binds exact approved values. Prove PRODUCTION_BINDING_INSTALLATION can become non-null only from reviewed server-owned source, with exact command-card bytes/SHA-256 binding, installation SHA-256 binding, current deployment reference, bounded session ref, durable evidence digest, durable service adapter implementation, one-session/one-attempt fence, independent expiry checks before every effect, rollback-first controls, post-rollback fail-closed smoke, and route body-gate integration. No provider/env/resource/billing changes, secrets or secret reads, private evidence reads, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance for live execution, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on failing checks, failing smoke, unknown outcome, stale deployment binding, missing durable adapter evidence, missing exact bounded session binding, private-data leakage risk, runtime installation not proven source-owned, or any need for runtime credentials/provider configuration.`;
}

function expectedPacket(readSource = read) {
  const sourceBindings = {};
  for (const [file, digest] of Object.entries(PINS)) {
    sourceBindings[file] = sha(readSource(file));
    if (sourceBindings[file] !== digest) throw Error('SOURCE_DRIFT');
  }

  const sourceRecordPacket = JSON.parse(readSource('docs/cad-auth-session-evidence-source-record.json'));
  const schema = JSON.parse(readSource('offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json'));
  const bindingInput = bindingFromSourceRecord(sourceRecordPacket);
  const bindingReview = reviewBindingInput(JSON.stringify(bindingInput));

  for (const file of OWN) sourceBindings[file] = sha(readSource(file));
  const schemaSha256 = sourceBindings['offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json'];

  if (bindingReview.code !== 'BINDING_SHAPE_VALID_REQUIRES_SEPARATE_AUTHENTICITY_AND_CURRENT_TARGET_REVIEW') {
    throw Error('BINDING_REVIEW_NOT_ACCEPTED');
  }
  if (schema.properties.sessionId.const !== bindingInput.sessionId) throw Error('SESSION_CONST_MISMATCH');
  if (schema.properties.durableEvidenceSha256.const !== bindingInput.durableEvidenceSha256) throw Error('EVIDENCE_CONST_MISMATCH');
  if (schema.properties.productionDeploymentReference.const !== CURRENT.productionDeploymentReference) {
    throw Error('DEPLOYMENT_CONST_MISMATCH');
  }
  if (schema.properties.provenance.properties.sourceCommit.const !== CURRENT.mergeCommit) {
    throw Error('SOURCE_COMMIT_CONST_MISMATCH');
  }
  if (schema.properties.provenance.properties.approvedNonSecretSourceRecordSha256.const
    !== sourceRecordPacket.sourceRecordSha256) {
    throw Error('SOURCE_RECORD_CONST_MISMATCH');
  }

  return {
    schemaVersion: 1,
    artifact: `${STEM}-v1`,
    sourceOnly: true,
    status: 'SOURCE_RECORD_BOUND_SCHEMA_REBIND_REVIEWED_RUNTIME_CLOSED',
    roadmap: '5/6 complete; Step 6 schema rebind only',
    currentProduction: CURRENT,
    sourceRecordBinding: {
      packetSha256: PINS['docs/cad-auth-session-evidence-source-record.json'],
      sourceRecordSha256: sourceRecordPacket.sourceRecordSha256,
      recordRef: sourceRecordPacket.sourceRecord.recordRef,
      acceptedForSourceOnlySchemaRebind: true,
      acceptedForLiveDurableServiceQualification: false,
    },
    schemaRebind: {
      appliedByThisGate: true,
      schemaPath: 'offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json',
      schemaSha256,
      boundedSessionRef: bindingInput.boundedSessionRef,
      sessionId: bindingInput.sessionId,
      durableEvidenceSha256: bindingInput.durableEvidenceSha256,
      productionDeploymentReference: bindingInput.productionDeploymentReference,
      sourceCommit: bindingInput.provenance.sourceCommit,
      approvedNonSecretSourceRecordSha256: bindingInput.provenance.approvedNonSecretSourceRecordSha256,
      bindingReviewCode: bindingReview.code,
    },
    stillBlockedForLiveOpening: [
      'liveDurableServiceQualification',
      'productionExecutionBinding',
      'runtimeInstallation',
      'runtimeActivation',
      'explicitLiveOpeningGate',
    ],
    controls: Object.fromEntries([
      'providerEnvResourceBillingChangeAuthorized',
      'secretReadAuthorized',
      'privateEvidenceReadAuthorized',
      'uploadSessionIssuanceAuthorized',
      'productionUploadActivationAuthorized',
      'requestBodyAdmissionReadAuthorized',
      'conversionAuthorized',
      'sandboxDispatchAuthorized',
      'privateCadUseAuthorized',
      'liveEvidenceCollectionAuthorized',
      'runtimeInstallationAuthorized',
      'runtimeActivationAuthorized',
      'executableCommandCardIssuanceAuthorized',
      'externalMessagesAuthorized',
      'liveRetryAuthorized',
      'secondLiveRunAuthorized',
      'realUserCommercializationAuthorized',
      'commercialReadinessClaimed',
      'liveDurableServiceQualified',
    ].map(key => [key, false])),
    productionExecutionBinding: null,
    liveEffectsExecuted: 0,
    nextGateTemplate: exactRuntimeInstallCompletionPhrase(),
    sourceBindings,
  };
}

function checkPacket(packet, readSource = read) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* fixed sanitized result */ }
  return {
    ok,
    code: ok ? 'SESSION_EVIDENCE_SCHEMA_REBIND_VALID_RUNTIME_CLOSED'
      : 'SESSION_EVIDENCE_SCHEMA_REBIND_BLOCKED',
    sourceOnly: true,
    runtimeAuthorized: false,
    liveEffectsExecuted: 0,
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_MODE');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  PINS,
  OWN,
  CURRENT,
  bindingFromSourceRecord,
  expectedPacket,
  checkPacket,
  exactRuntimeInstallCompletionPhrase,
};
