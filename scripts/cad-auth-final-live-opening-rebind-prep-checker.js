// Source-only final live-opening rebind preparation. No live activation,
// upload-session issuance, command-card issuance, provider calls, or body IO.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const projection = require('./cad-auth-durable-service-qualification-review-projection-checker');
const executionGap = require('./cad-auth-live-opening-execution-gap-closure-checker');
const executableRebind = require('./cad-auth-live-opening-executable-command-card-rebind-checker');
const executableRuntimeWiring = require('./cad-auth-live-opening-executable-runtime-wiring-checker');
const runtimeActivation = require('./cad-auth-live-opening-runtime-activation-checker');
const currentDeploymentRebind = require('./cad-auth-live-opening-current-deployment-rebind-checker');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-final-live-opening-rebind-prep.json';
const BRANCH = 'codex/cad-auth-final-live-opening-rebind-prep';
const MAIN_COMMIT = 'bbe4bad83e97f2bd647155e5f0beeac2ff5c5671';
const PROJECTION_SHA = '81925e6a33f147f9b405823fbbeb0598cad24b8c5e65f1237625e8883608ed18';
const EXECUTION_GAP_SHA = '62052cae429117761a772c2c97b020cc1c2624d0a34d94e2086aa7e63142248d';
const EXECUTABLE_REBIND_SHA = '8412b6d4495bf0dc852e3b3875497f839b01529825c7d22171814ee107eb67c1';
const PRODUCTION_DEPLOYMENT_ID = '6739862027';
const PRODUCTION_DEPLOYMENT_TARGET = 'https://reversr-23pphxx1d-vsillahs-projects.vercel.app';
const PRODUCTION_ORIGIN = 'https://reversr.vercel.app';
const PRODUCTION_ROUTE = 'POST /api/cad/user-import';
const COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const DURABLE_SERVICE_REF = 'rrb-ref:cad-auth-durable-service-20260928T161754Z';
const OPENING_START_UTC = '2026-09-29T18:00:00Z';
const OPENING_EXPIRES_UTC = '2026-09-29T18:30:00Z';
const FAIL_CLOSED_SMOKE = Object.freeze({
  method: 'POST',
  url: 'https://reversr.vercel.app/api/cad/user-import',
  requestBodyBytes: 0,
  status: 401,
  responseCode: 'USER_SESSION_REQUIRED',
  responseMessage: 'A valid upload session is required.',
  observedAtUtc: '2026-09-29T16:24:13Z',
});
const CLOSED_CONTROLS = Object.freeze({
  privateEvidenceReadAuthorized: false,
  durableServiceLiveQualificationAuthorized: false,
  providerEnvResourceBillingChangeAuthorized: false,
  secretReadAuthorized: false,
  uploadSessionIssuanceAuthorized: false,
  productionUploadActivationAuthorized: false,
  requestBodyAdmissionReadAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  privateCadUseAuthorized: false,
  liveEvidenceCollectionAuthorized: false,
  runtimeActivationAuthorized: false,
  executableCommandCardIssuanceAuthorized: false,
  externalMessagesAuthorized: false,
  liveRetryAuthorized: false,
  secondLiveRunAuthorized: false,
  realUserCommercializationAuthorized: false,
  commercialReadinessClaimed: false,
  effectsExecuted: 0,
});
const SOURCES = Object.freeze([...new Set([
  projection.PACKET,
  ...projection.SOURCES,
  executionGap.PACKET,
  ...executionGap.SOURCES,
  executableRebind.PACKET,
  ...executableRebind.SOURCES,
  executableRuntimeWiring.PACKET,
  ...executableRuntimeWiring.SOURCES,
  runtimeActivation.PACKET,
  ...runtimeActivation.SOURCES,
  currentDeploymentRebind.PACKET,
  ...currentDeploymentRebind.SOURCES,
  'docs/cad-auth-final-live-opening-rebind-prep.md',
  'scripts/cad-auth-final-live-opening-rebind-prep-checker.js',
  'scripts/cad-auth-final-live-opening-rebind-prep.test.js',
])]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const shaJson = value => sha(JSON.stringify(value));

function openingWindow() {
  return {
    startUtc: OPENING_START_UTC,
    expiresUtc: OPENING_EXPIRES_UTC,
    durationMinutes: 30,
    startInclusiveExpiryExclusive: true,
    currentGateDoesNotOpenWindow: true,
    laterApprovalMustRepeatWindow: true,
  };
}

function durableEvidenceDigest() {
  return shaJson({
    schemaVersion: 1,
    artifact: 'cad-auth-final-live-opening-durable-evidence-digest-v1',
    sourceCommit: MAIN_COMMIT,
    durableQualificationProjectionPacketSha256: PROJECTION_SHA,
    executionGapClosurePacketSha256: EXECUTION_GAP_SHA,
    executableCommandCardRebindPacketSha256: EXECUTABLE_REBIND_SHA,
    productionDeploymentId: PRODUCTION_DEPLOYMENT_ID,
    productionDeploymentTarget: PRODUCTION_DEPLOYMENT_TARGET,
    failClosedSmoke: FAIL_CLOSED_SMOKE,
    durableServiceReference: DURABLE_SERVICE_REF,
    boundedSessionRef: BOUNDED_SESSION_REF,
    cohortRef: COHORT_REF,
  });
}

function commandCardDraft() {
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-final-live-opening-command-card-v1',
    sourceOnly: false,
    executable: true,
    issued: true,
    authorizedForLiveUse: true,
    productionUploadAdmissionOpeningAuthorized: true,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionReadAuthorized: true,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    externalMessagesAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    sourceCommit: MAIN_COMMIT,
    durableQualificationProjectionPacketSha256: PROJECTION_SHA,
    executionGapClosurePacketSha256: EXECUTION_GAP_SHA,
    executableCommandCardRebindPacketSha256: EXECUTABLE_REBIND_SHA,
    productionDeploymentId: PRODUCTION_DEPLOYMENT_ID,
    productionDeploymentTarget: PRODUCTION_DEPLOYMENT_TARGET,
    productionOrigin: PRODUCTION_ORIGIN,
    productionRoute: PRODUCTION_ROUTE,
    cohortRef: COHORT_REF,
    sessionId: BOUNDED_SESSION_REF,
    durableServiceReference: DURABLE_SERVICE_REF,
    durableEvidenceSha256: durableEvidenceDigest(),
    failClosedSmoke: FAIL_CLOSED_SMOKE,
    openingWindow: {
      startUtc: OPENING_START_UTC,
      expiresUtc: OPENING_EXPIRES_UTC,
      startInclusiveExpiryExclusive: true,
    },
    ceilings: {
      concurrentSessions: 1,
      uploadAttempts: 1,
      retries: 0,
      secondLiveRuns: 0,
    },
    liveExecutionControls: {
      independentExpiryCheckBeforeEveryEffect: true,
      atomicDurableRunClaimRequired: true,
      atomicDurableAttemptClaimRequired: true,
      rollbackImmediatelyAfterWindow: true,
      postRollbackFailClosedSmokeRequired: true,
      unknownOutcomeStopsWithoutRetry: true,
    },
  };
}

function commandCardBytes() {
  return JSON.stringify(commandCardDraft());
}

function commandCardSha256() {
  return sha(commandCardBytes());
}

function liveOpeningApprovalPhrase({
  packetSha256 = '<finalLiveOpeningRebindPrepPacketSha256>',
  sourceCommit = '<finalLiveOpeningRebindPrepSourceCommit>',
} = {}) {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source-only/no-live final live-opening rebind preparation packet ${packetSha256} at source commit ${sourceCommit}, durable-service qualification review projection packet ${PROJECTION_SHA}, execution-gap closure packet ${EXECUTION_GAP_SHA}, executable command-card rebind packet ${EXECUTABLE_REBIND_SHA}, durable service ${DURABLE_SERVICE_REF}, bounded session binding ${BOUNDED_SESSION_REF}, cohort ${COHORT_REF}, durable evidence digest ${durableEvidenceDigest()}, production deployment id ${PRODUCTION_DEPLOYMENT_ID}, production deployment target ${PRODUCTION_DEPLOYMENT_TARGET}, and fail-closed smoke ${FAIL_CLOSED_SMOKE.status} ${FAIL_CLOSED_SMOKE.responseCode}. Scope: against ${PRODUCTION_ORIGIN} ${PRODUCTION_ROUTE}, for cohort ${COHORT_REF}, starting ${OPENING_START_UTC} and expiring ${OPENING_EXPIRES_UTC}; issue and use only one bounded executable command-card with SHA-256 ${commandCardSha256()} for admission-only body validation for public, synthetic, or explicitly authorized internal tester CAD; one concurrent session; one upload attempt; independent expiry checks before every effect; atomic durable run and attempt claims; stop on unknown outcome; rollback immediately after the window; and run post-rollback fail-closed smoke before cleanup. No conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, provider/env/resource/billing changes, second live run, retry, or commercial-readiness claim.`;
}

function expectedPacket(readSource = read) {
  const boundedRead = file => {
    if (!SOURCES.includes(file)) throw Error('SOURCE_NOT_ALLOWED');
    return readSource(file);
  };
  const projectionBytes = boundedRead(projection.PACKET);
  if (sha(projectionBytes) !== PROJECTION_SHA
    || !projection.checkPacket(JSON.parse(projectionBytes), { readSource: boundedRead }).ok) {
    throw Error('PROJECTION_BLOCKED');
  }
  const gapBytes = boundedRead(executionGap.PACKET);
  if (sha(gapBytes) !== EXECUTION_GAP_SHA
    || !executionGap.checkPacket(JSON.parse(gapBytes), { readSource: boundedRead }).ok) {
    throw Error('EXECUTION_GAP_BLOCKED');
  }
  const rebindBytes = boundedRead(executableRebind.PACKET);
  if (sha(rebindBytes) !== EXECUTABLE_REBIND_SHA) {
    throw Error('EXECUTABLE_REBIND_BLOCKED');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-final-live-opening-rebind-prep-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_FINAL_LIVE_OPENING_REBIND_PREPARED_NO_LIVE_EFFECTS',
    sourceCommit: MAIN_COMMIT,
    productionDeployment: {
      id: PRODUCTION_DEPLOYMENT_ID,
      target: PRODUCTION_DEPLOYMENT_TARGET,
      environment: 'Production',
      state: 'success',
      boundCommit: MAIN_COMMIT,
      productionDeploymentBindingFreshAtPreparation: true,
      postMergeRevalidationRequiredBeforeLiveOpening: true,
    },
    failClosedSmoke: FAIL_CLOSED_SMOKE,
    parentPackets: {
      durableQualificationProjectionPacketSha256: PROJECTION_SHA,
      executionGapClosurePacketSha256: EXECUTION_GAP_SHA,
      executableCommandCardRebindPacketSha256: EXECUTABLE_REBIND_SHA,
    },
    finalOpeningBindings: {
      durableServiceReference: DURABLE_SERVICE_REF,
      boundedSessionRef: BOUNDED_SESSION_REF,
      cohortRef: COHORT_REF,
      durableEvidenceSha256: durableEvidenceDigest(),
      commandCardSha256: commandCardSha256(),
      commandCardDigestResolved: true,
      commandCardIssuedByThisGate: false,
      runtimeActivationAuthorizedByThisGate: false,
      uploadSessionIssuedByThisGate: false,
      requestBodyAdmissionReadAuthorizedByThisGate: false,
      productionUploadActivationAuthorizedByThisGate: false,
      openingWindow: openingWindow(),
    },
    nextLiveOpeningGate: {
      authorized: false,
      exactPhraseTemplate: liveOpeningApprovalPhrase(),
      unresolvedFields: [
        'finalLiveOpeningRebindPrepPacketSha256',
        'finalLiveOpeningRebindPrepSourceCommit',
      ],
      liveOpeningRequiresSeparateApproval: true,
      productionDeploymentMustStillMatch: true,
      failClosedSmokeMustStillPass: true,
      executableCommandCardIssuanceRequiresSeparateApproval: true,
      uploadSessionIssuanceRequiresSeparateApproval: true,
      requestBodyAdmissionReadRequiresSeparateApproval: true,
      runtimeActivationRequiresSeparateApproval: true,
    },
    stopConditions: {
      failingCheck: true,
      unknownOutcome: true,
      staleDeploymentBinding: true,
      privateDataLeakageRisk: true,
      unresolvedCommandCardBinding: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
    },
    controls: CLOSED_CONTROLS,
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(boundedRead(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = !!input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource));
  } catch { /* sanitized */ }
  return {
    ok,
    code: ok ? 'SOURCE_ONLY_FINAL_LIVE_OPENING_REBIND_PREP_VALID'
      : 'FINAL_LIVE_OPENING_REBIND_PREP_BLOCKED',
    privateEvidenceRead: false,
    durableServiceLiveQualified: false,
    productionExecutionBinding: null,
    effectsExecuted: 0,
  };
}

function approvalPhrase(packetBytes) {
  const packet = JSON.parse(packetBytes);
  if (!checkPacket(packet).ok) throw Error('FINAL_LIVE_OPENING_REBIND_PREP_BLOCKED');
  return `I approve public push of branch ${BRANCH} and creation of one draft PR for the source-only/no-live CAD Auth final live-opening rebind preparation for ReversR-Rebuild, bound to final rebind prep packet SHA-256 ${sha(packetBytes)}, main commit ${MAIN_COMMIT}, durable-service qualification review projection packet SHA-256 ${PROJECTION_SHA}, production deployment id ${PRODUCTION_DEPLOYMENT_ID}, production deployment target ${PRODUCTION_DEPLOYMENT_TARGET}, fail-closed smoke ${FAIL_CLOSED_SMOKE.status} ${FAIL_CLOSED_SMOKE.responseCode}, durable evidence digest ${durableEvidenceDigest()}, and executable command-card SHA-256 ${commandCardSha256()}. Scope: publish only the validated sanitized source-only docs, packet, checker, and tests. No private evidence reads, durable-service live qualification, provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, live retry, second live run, merge, deployment, production smoke, real-user commercialization, or commercial-readiness claim. Stop on failing checks, unknown outcome, stale deployment binding, private-data leakage risk, unresolved command-card binding, or need for runtime credentials/provider configuration.`;
}

function checkApprovalPhrase(packetBytes, phrase) {
  try { return typeof phrase === 'string' && phrase === approvalPhrase(packetBytes); }
  catch { return false; }
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify(result.ok ? {
      ...result,
      packetSha256: sha(bytes),
      durableEvidenceDigest: durableEvidenceDigest(),
      executableCommandCardSha256: commandCardSha256(),
      nextPublicPushDraftPrApprovalPhrase: approvalPhrase(bytes),
    } : result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  MAIN_COMMIT,
  PROJECTION_SHA,
  PRODUCTION_DEPLOYMENT_ID,
  PRODUCTION_DEPLOYMENT_TARGET,
  FAIL_CLOSED_SMOKE,
  openingWindow,
  durableEvidenceDigest,
  commandCardDraft,
  commandCardBytes,
  commandCardSha256,
  liveOpeningApprovalPhrase,
  expectedPacket,
  checkPacket,
  approvalPhrase,
  checkApprovalPhrase,
};
