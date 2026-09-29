// Source-only production execution binding finalization checker.
// No live activation, command-card issuance, provider calls, secrets, or body IO.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-production-execution-binding-finalization.json';
const BRANCH = 'codex/cad-auth-production-execution-binding-finalization';
const MAIN_COMMIT = '5314286e2f15dfc603b0f9a59a49d5b303e7599e';
const FINAL_REBIND_PREP_SHA = '379a59c25b882eaccaa53a2230770d0d6777f26c92650bd715abf8a1bfe096ed';
const DURABLE_QUALIFICATION_PROJECTION_SHA = '81925e6a33f147f9b405823fbbeb0598cad24b8c5e65f1237625e8883608ed18';
const EXECUTION_GAP_SHA = '62052cae429117761a772c2c97b020cc1c2624d0a34d94e2086aa7e63142248d';
const EXECUTABLE_REBIND_SHA = '8412b6d4495bf0dc852e3b3875497f839b01529825c7d22171814ee107eb67c1';
const DURABLE_SERVICE_REF = 'rrb-ref:cad-auth-durable-service-20260928T161754Z';
const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const LAST_REBIND_DURABLE_EVIDENCE_DIGEST = 'ee586329a30c198dc23f979c19155e71952c0e0bd82e0e29193c69ed3ea4ea09';
const LAST_REBIND_COMMAND_CARD_SHA = '2ecd6d6b6d002af58e9bb0c6edd6280d89dbd1328f25a1415409dbbc559d20e2';
const LAST_PRODUCTION_DEPLOYMENT_ID = '6740204468';
const LAST_PRODUCTION_DEPLOYMENT_TARGET = 'https://reversr-p7017myab-vsillahs-projects.vercel.app';
const LAST_FAIL_CLOSED_SMOKE = Object.freeze({
  method: 'POST',
  url: 'https://reversr.vercel.app/api/cad/user-import',
  requestBodyBytes: 0,
  status: 401,
  responseCode: 'USER_SESSION_REQUIRED',
  responseMessage: 'A valid upload session is required.',
  observedAtUtc: '2026-09-29T16:43:57Z',
});
const PARENT_PACKETS = Object.freeze({
  'docs/cad-auth-final-live-opening-rebind-prep.json': FINAL_REBIND_PREP_SHA,
  'docs/cad-auth-durable-service-qualification-review-projection.json': DURABLE_QUALIFICATION_PROJECTION_SHA,
  'docs/cad-auth-live-opening-execution-gap-closure.json': EXECUTION_GAP_SHA,
  'docs/cad-auth-live-opening-executable-command-card-rebind.json': EXECUTABLE_REBIND_SHA,
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
const SOURCES = Object.freeze([
  ...Object.keys(PARENT_PACKETS),
  'server/index.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadUserUploadRouter.js',
  'scripts/cad-auth-prod-runtime-mount-fixture.js',
  'scripts/cad-auth-live-opening-execution-gap-closure.test.js',
  'scripts/cad-auth-durable-service-qualification-plan.test.js',
  'scripts/cad-auth-durable-service-reference-prep.test.js',
  'scripts/cad-auth-durable-service-qualification-review-plan.test.js',
  'scripts/cad-auth-durable-service-qualification-review-projection.test.js',
  'scripts/cad-auth-final-live-opening-rebind-prep.test.js',
  'scripts/cad-auth-production-execution-binding-finalization.test.js',
  'scripts/cad-auth-production-execution-binding-finalization-checker.js',
  'docs/cad-auth-production-execution-binding-finalization.md',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function verifyParentPacketBindings(readSource) {
  for (const [file, expectedSha] of Object.entries(PARENT_PACKETS)) {
    if (sha(readSource(file)) !== expectedSha) throw Error('PARENT_PACKET_DRIFT');
  }
}

function nextPostMergeRefreshApprovalPhrase({
  packetSha256 = '<productionExecutionBindingFinalizationPacketSha256>',
  sourceCommit = '<productionExecutionBindingFinalizationSourceCommit>',
} = {}) {
  return `I approve a bounded source-only/no-live CAD Auth post-merge production execution binding deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to production execution binding finalization packet ${packetSha256} at source commit ${sourceCommit}, final live-opening rebind prep packet ${FINAL_REBIND_PREP_SHA}, durable-service qualification review projection packet ${DURABLE_QUALIFICATION_PROJECTION_SHA}, execution-gap closure packet ${EXECUTION_GAP_SHA}, executable command-card rebind packet ${EXECUTABLE_REBIND_SHA}, durable service ${DURABLE_SERVICE_REF}, bounded session binding ${BOUNDED_SESSION_REF}, and cohort ${COHORT_REF}. Scope: verify the current production deployment is bound to the post-merge main commit, verify production remains fail-closed, recompute only the current-production deployment binding, durable evidence digest, executable command-card SHA-256, and exact live-opening approval phrase against that current production deployment, then return the exact later live-opening approval phrase. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing exact bounded session binding, or any need for runtime credentials/provider configuration.`;
}

function expectedPacket(readSource = read) {
  const boundedRead = file => {
    if (!SOURCES.includes(file)) throw Error('SOURCE_NOT_ALLOWED');
    return readSource(file);
  };
  verifyParentPacketBindings(boundedRead);
  return {
    schemaVersion: 1,
    packet: 'cad-auth-production-execution-binding-finalization-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_PRODUCTION_EXECUTION_BINDING_FINALIZED_DEFAULT_CLOSED',
    branch: BRANCH,
    baseMainCommit: MAIN_COMMIT,
    parentPackets: {
      finalLiveOpeningRebindPrepPacketSha256: FINAL_REBIND_PREP_SHA,
      durableQualificationProjectionPacketSha256: DURABLE_QUALIFICATION_PROJECTION_SHA,
      executionGapClosurePacketSha256: EXECUTION_GAP_SHA,
      executableCommandCardRebindPacketSha256: EXECUTABLE_REBIND_SHA,
    },
    lastNoLiveRebind: {
      productionDeploymentId: LAST_PRODUCTION_DEPLOYMENT_ID,
      productionDeploymentTarget: LAST_PRODUCTION_DEPLOYMENT_TARGET,
      durableEvidenceDigest: LAST_REBIND_DURABLE_EVIDENCE_DIGEST,
      executableCommandCardSha256: LAST_REBIND_COMMAND_CARD_SHA,
      failClosedSmoke: LAST_FAIL_CLOSED_SMOKE,
      staleAfterThisSourceMerge: true,
      freshPostMergeRebindRequired: true,
    },
    finalization: {
      defaultProductionBehaviorClosed: true,
      productionExecutionBindingSource: 'server/cadProductionExecutionBindingSource.js',
      sourceDefaultBinding: null,
      createCadProductionExecutionBindingUsesSourceFactoryByDefault: true,
      factoryRequiresEnabledTrue: true,
      exactCommandCardSha256Required: true,
      exactCurrentDeploymentReferenceRequired: true,
      exactBoundedSessionRefRequired: BOUNDED_SESSION_REF,
      exactDurableEvidenceDigestRequired: true,
      durableServiceInterfaceRequired: true,
      oneSessionOneAttemptFenceRequired: true,
      independentExpiryChecksBeforeEveryEffectRequired: true,
      rollbackFirstControlsRequired: true,
      postRollbackFailClosedSmokeRequired: true,
      envRequestFilesystemProviderInputsRejected: true,
      laterLiveGateMaySupplyOnlyReviewedSourceBinding: true,
    },
    nextGate: {
      authorized: false,
      liveOpeningAuthorizedByThisGate: false,
      productionUploadActivationAuthorizedByThisGate: false,
      executableCommandCardIssuedByThisGate: false,
      requestBodyAdmissionReadAuthorizedByThisGate: false,
      requiresGreenPrMerge: true,
      requiresNormalProductionDeployment: true,
      requiresPostMergeFailClosedSmoke: true,
      requiresPostMergeDeploymentRebindRefresh: true,
      exactPhraseTemplate: nextPostMergeRefreshApprovalPhrase(),
      unresolvedFields: [
        'productionExecutionBindingFinalizationPacketSha256',
        'productionExecutionBindingFinalizationSourceCommit',
        'postMergeMainCommit',
        'currentProductionDeploymentId',
        'currentProductionDeploymentTarget',
        'currentFailClosedSmoke',
        'currentDurableEvidenceDigest',
        'currentExecutableCommandCardSha256',
        'freshUtcOpeningWindow',
      ],
    },
    stopConditions: {
      failingChecks: true,
      failingSmoke: true,
      unknownOutcome: true,
      staleDeploymentBinding: true,
      missingDurableAdapterEvidence: true,
      missingExactBoundedSessionBinding: true,
      privateDataLeakageRisk: true,
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
    ...CLOSED_CONTROLS,
    ok,
    code: ok ? 'SOURCE_ONLY_PRODUCTION_EXECUTION_BINDING_FINALIZATION_VALID'
      : 'PRODUCTION_EXECUTION_BINDING_FINALIZATION_BLOCKED',
  };
}

function publicPrApprovalPhrase({
  commit = '<productionExecutionBindingFinalizationCommit>',
  packetSha256 = '<productionExecutionBindingFinalizationPacketSha256>',
} = {}) {
  return `I approve public push of branch ${BRANCH} at commit ${commit} and creation of one draft PR against main for the sanitized source-only CAD Auth production execution binding finalization packet SHA-256 ${packetSha256}. Publish only the disabled-by-default production execution binding source, docs, tests, checker, source hashes, closed-control statuses, stop conditions, and future post-merge deployment rebind refresh approval phrase. This does not authorize merge, deployment, production smoke, cleanup, secrets or secret reads, private evidence reads, provider/env/resource/billing changes, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance for live execution, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on failing checks, unknown outcome, stale branch/commit binding, production deployment trigger, stale deployment binding, missing durable adapter evidence, missing exact bounded session binding, private-data leakage risk, or any need for runtime credentials/provider configuration.`;
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
      nextPostMergeRefreshApprovalPhrase: nextPostMergeRefreshApprovalPhrase({
        packetSha256: sha(bytes),
        sourceCommit: '<productionExecutionBindingFinalizationSourceCommit>',
      }),
      publicPrApprovalPhrase: publicPrApprovalPhrase({ packetSha256: sha(bytes) }),
    } : result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  BRANCH,
  SOURCES,
  CLOSED_CONTROLS,
  nextPostMergeRefreshApprovalPhrase,
  expectedPacket,
  checkPacket,
  publicPrApprovalPhrase,
};
