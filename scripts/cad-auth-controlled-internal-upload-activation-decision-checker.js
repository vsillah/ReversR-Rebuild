#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  EXPECTED_VALIDATOR_ENVELOPE,
  reviewedSharedValidator,
} = require('./cad-auth-controlled-internal-upload-activation-implementation-checker');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-controlled-internal-upload-activation-decision.json';
const SOURCES = Object.freeze([
  'docs/cad-auth-controlled-internal-upload-activation-decision.md',
  'docs/cad-auth-phase6-live-opening-closeout.json',
  'docs/cad-production-upload-activation-scope.json',
  'docs/cad-production-upload-activation-scope.md',
  'server/cadUserUploadAdmission.js',
  'server/cadUserUploadRouter.js',
  'server/cadUploadAdmissionRuntimeBridge.js',
  'server/cadInternalProductionAdmissionSwitch.js',
  'server/cadLiveOpeningRuntimeActivation.js',
  'server/uploadSession.js',
  'server/cadWorkerContract.js',
  'utils/igesAdmission.js',
  'scripts/cad-auth-controlled-internal-upload-activation-implementation-checker.js',
  'scripts/cad-auth-controlled-internal-upload-activation-decision-checker.js',
  'scripts/cad-auth-controlled-internal-upload-activation-decision.test.js',
]);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const text = file => read(file).toString('utf8');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function expectedPacket(readSource = read) {
  const sharedValidatorReview = reviewedSharedValidator(readSource);
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-controlled-internal-upload-activation-decision-v1',
    sourceOnly: true,
    roadmap: 'Phase 7 controlled internal upload activation decision',
    status: 'CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_DECISION_READY_SOURCE_ONLY',
    purpose:
      'define the next controlled internal upload activation decision boundary after Phase 6 closed bounded admission-path validation, without activating production uploads or productizing CAD import',
    phase6Closeout: Object.freeze({
      packetPath: 'docs/cad-auth-phase6-live-opening-closeout.json',
      packetSha256: 'c6ce99d3ff91e9f2ec7caee42165bca7035fbdef9d8f626b961058c6d3cf018c',
      mergedPr: 474,
      mergeCommit: 'bffebdadfa669a9826315754e9031ab67e2a85e9',
      productionDeployment: '6809415513',
      productionTarget: 'https://reversr-5ffm8vgca-vsillahs-projects.vercel.app',
      productionAlias: 'https://reversr.vercel.app',
      postMergeFailClosedSmoke: Object.freeze({
        status: 401,
        code: 'USER_SESSION_REQUIRED',
        observedAtUtc: '2026-10-02T13:25:05.097Z',
      }),
      boundedLiveOpeningTerminal: Object.freeze({
        status: 503,
        code: 'USER_UPLOADS_DISABLED',
        uploadAttemptCount: 1,
        retryCount: 0,
        secondLiveRun: false,
      }),
      conclusion:
        'Phase 6 validated the credentialed admission path reaching the disabled upload terminal and post-rollback fail-closed smoke; it did not authorize production upload activation.',
    }),
    currentProductionDefaults: Object.freeze({
      route: 'POST /api/cad/user-import',
      bodyAdmissionAuthorized: false,
      expectedUnauthenticatedTerminal: 'USER_SESSION_REQUIRED',
      expectedCredentialedDisabledTerminal: 'USER_UPLOADS_DISABLED',
      runtimeActivationDefault: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      durableProjectHistoryAuthorized: false,
      privateCadAuthorized: false,
      realUsersAuthorized: false,
      commercialReadinessClaimed: false,
    }),
    reviewedSharedValidator: sharedValidatorReview,
    controlledInternalActivationDecision: Object.freeze({
      phase: '7.1-controlled-internal-upload-activation-decision',
      decisionType: 'prepare-source-only-controls-before-any-live-upload-activation',
      productionUploadActivationAuthorizedNow: false,
      routeBodyReadAuthorizedNow: false,
      productizationAuthorizedNow: false,
      firstEligibleLiveGate:
        'bounded internal production admission/body-validation activation with exact later approval after this source-only packet is merged, deployed, and fail-closed-smoked',
      eligibleBodyValidationScope: Object.freeze({
        route: 'POST /api/cad/user-import',
        cohortRef: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
        uploadAttempts: 1,
        concurrentSessions: 1,
        retries: 0,
        secondLiveRun: false,
        allowedCadProvenance: 'public-synthetic-or-explicitly-authorized-internal-tester-only',
        requestContentRecordingAuthorized: false,
        bodyBytesRetentionAuthorized: false,
        durableProjectHistoryAuthorized: false,
        conversionDispatchAuthorized: false,
        sandboxDispatchAuthorized: false,
        privateCadAuthorized: false,
        realUsersAuthorized: false,
      }),
      validatorEnvelope: EXPECTED_VALIDATOR_ENVELOPE,
      sourceOwnedControlsRequiredBeforeLiveGate: Object.freeze([
        'exact current production deployment reference',
        'exact command-card bytes and SHA-256',
        'exact installation SHA-256',
        'bounded session ref and cohort ref',
        'private credential digest binding without public credential disclosure',
        'one-session and one-attempt durable fence',
        'independent expiry checks before every effect',
        'rollback-first controls before body-read opening',
        'post-rollback empty unauthenticated fail-closed smoke',
        'sanitized admission receipt with no CAD bytes, private file names, or credential values',
      ]),
    }),
    phase7NonGoals: Object.freeze({
      productionUploadActivation: false,
      requestBodyAdmissionOrRead: false,
      uploadSessionIssuance: false,
      privateCredentialRead: false,
      privateEvidenceRead: false,
      conversion: false,
      sandboxDispatch: false,
      durableProjectHistory: false,
      privateCad: false,
      externalMessages: false,
      providerEnvResourceBillingChanges: false,
      realUserCommercialization: false,
      commercialReadinessClaim: false,
    }),
    productizationDecision: Object.freeze({
      phase7IsLastBeforeProductization: false,
      rationale:
        'controlled internal upload activation only proves bounded body admission under disabled downstream effects; productization still requires separate conversion, Sandbox, retention, privacy, cost, UX, and real-user readiness gates',
      explicitFutureGates: Object.freeze([
        'controlled internal upload activation implementation and live admission closeout',
        'conversion and Sandbox dispatch qualification',
        'retention, deletion, and private-CAD policy approval',
        'cost, fee, and abuse-control readiness',
        'user-facing UX, support, monitoring, and rollback readiness',
        'commercial-readiness decision',
      ]),
    }),
    nextRecommendedGate:
      'bounded source-only controlled internal upload activation implementation gate that installs exact manifest-driven body-admission controls while preserving default fail-closed production behavior',
    authorizes: Object.freeze({
      sourceOnlyDocsTestsCheckersManifests: true,
      localValidation: true,
      draftPrAfterExplicitApproval: true,
      greenCheckMergeAfterExplicitApproval: true,
      normalVercelDeploymentFromMainAfterExplicitApproval: true,
      productionFailClosedSmokeAfterExplicitApproval: true,
      cleanupAfterExplicitApproval: true,
      productionUploadActivation: false,
      requestBodyAdmissionOrRead: false,
      privateCredentialRead: false,
      uploadSessionIssuance: false,
      conversionDispatch: false,
      sandboxDispatch: false,
      privateCadUse: false,
      providerEnvResourceBillingChanges: false,
      externalMessages: false,
      realUserCommercialization: false,
      commercialReadinessClaim: false,
    }),
    stopConditions: Object.freeze([
      'failing checks',
      'unknown outcome',
      'stale deployment binding',
      'private credential leakage risk',
      'request-body admission/read requirement before a later explicit activation gate',
      'conversion or Sandbox dependency',
      'provider/env/resource/billing configuration need',
      'commercial-readiness claim pressure',
    ]),
    sourceBindings: sourceBindings(readSource),
  });
}

function routeStillClosed(readSource = read) {
  const router = readSource('server/cadUserUploadRouter.js').toString('utf8');
  const bridge = readSource('server/cadUploadAdmissionRuntimeBridge.js').toString('utf8');
  const activation = readSource('server/cadLiveOpeningRuntimeActivation.js').toString('utf8');
  return /const BODY_ADMISSION_AUTHORIZED = false;/.test(router)
    && /return send\(res, 'USER_UPLOADS_DISABLED'\);/.test(router)
    && /bodyAdmissionAuthorized: false/.test(bridge)
    && /RUNTIME_ACTIVATION_DISABLED/.test(activation);
}

function checkPacket(packet, readSource = read) {
  let matches = false;
  try {
    matches = isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch {
    matches = false;
  }
  const closed = routeStillClosed(readSource)
    && packet?.currentProductionDefaults?.bodyAdmissionAuthorized === false
    && packet?.controlledInternalActivationDecision?.productionUploadActivationAuthorizedNow === false
    && packet?.controlledInternalActivationDecision?.routeBodyReadAuthorizedNow === false
    && packet?.phase7NonGoals?.conversion === false
    && packet?.phase7NonGoals?.sandboxDispatch === false
    && packet?.phase7NonGoals?.privateCad === false
    && packet?.phase7NonGoals?.realUserCommercialization === false
    && packet?.authorizes?.productionUploadActivation === false
    && packet?.authorizes?.requestBodyAdmissionOrRead === false;
  const bounded = packet?.controlledInternalActivationDecision?.eligibleBodyValidationScope?.uploadAttempts === 1
    && packet?.controlledInternalActivationDecision?.eligibleBodyValidationScope?.concurrentSessions === 1
    && packet?.reviewedSharedValidator?.path === 'utils/igesAdmission.js'
    && packet?.reviewedSharedValidator?.sourceBound === true
    && packet?.reviewedSharedValidator?.workerContractImportsSharedValidator === true
    && packet?.reviewedSharedValidator?.workerContractUsesSharedFileNameInspection === true
    && packet?.reviewedSharedValidator?.workerContractUsesSharedSourceInspection === true
    && packet?.reviewedSharedValidator?.sourceLimitDerivedFromSharedValidator === true
    && packet?.reviewedSharedValidator?.exactPayloadKeysPreserved === true
    && packet?.reviewedSharedValidator?.acceptedMimeTypesPreserved === true
    && packet?.reviewedSharedValidator?.igesExtensionsOnly === true
    && packet?.reviewedSharedValidator?.externalReferencesRejected === true
    && packet?.reviewedSharedValidator?.envelopeMatchesExpected === true
    && packet?.reviewedSharedValidator?.preserved === true
    && packet?.controlledInternalActivationDecision?.validatorEnvelope?.acceptedFileExtensions?.join(',') === 'igs,iges'
    && packet?.controlledInternalActivationDecision?.validatorEnvelope?.sourceLimitBytes === 262144
    && packet?.productizationDecision?.phase7IsLastBeforeProductization === false;
  const ok = matches && closed && bounded;
  return Object.freeze({
    ok,
    code: ok
      ? 'CAD_AUTH_CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_DECISION_VALID_SOURCE_ONLY'
      : 'CAD_AUTH_CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_DECISION_BLOCKED',
    sourceOnly: packet?.sourceOnly === true,
    routeStillClosed: routeStillClosed(readSource),
    productionUploadActivationAuthorized: packet?.authorizes?.productionUploadActivation === true,
    requestBodyAdmissionOrReadAuthorized: packet?.authorizes?.requestBodyAdmissionOrRead === true,
    phase7IsProductization: packet?.productizationDecision?.phase7IsLastBeforeProductization === true,
  });
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) {
      throw Error('INVALID_MODE');
    }
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), `${JSON.stringify(expectedPacket(), null, 2)}\n`);
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({
      ...result,
      ...(result.ok ? { packetSha256: sha(bytes) } : {}),
    }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  EXPECTED_VALIDATOR_ENVELOPE,
  PACKET,
  SOURCES,
  checkPacket,
  expectedPacket,
  reviewedSharedValidator,
  routeStillClosed,
  sourceBindings,
};
