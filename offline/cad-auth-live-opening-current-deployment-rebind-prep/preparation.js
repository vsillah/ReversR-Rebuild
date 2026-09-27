// Pure source-only proposal. No executable commands, credentials or runtime IO.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');
const prior = require('../cad-auth-live-opening-command-card-digest-prep/preparation');
const { liveOpeningRuntimeMountPreparation } = require('../cad-auth-live-opening-runtime-mount-prep/preparation');
const SOURCE_COMMIT = 'e5e23453852720532b09fcfc1b5c603a1265c816';
const MOUNT_SHA256 = '24d3a96fc431f2a23e14724f4b8c061e8fefaa3cbbb97c4832b6a8d570f10346';
const PRIOR_SHA256 = '53aab3bab61f99b8d995236096440ae838f706c25e5e9cf4bb30639faf5bad81';
const DEPLOYMENT = 'https://vercel.com/vsillahs-projects/reversr/CyBjkXRmZsWuw3q4LS3gcnCweMRL';
const START = '2026-09-27T16:00:00Z';
const EXPIRES = '2026-09-27T16:30:00Z';
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function draft() {
  const card = prior.commandCardDigestDraft();
  card.sourceCommit = SOURCE_COMMIT;
  card.runtimeMountPrepPacketSha256 = MOUNT_SHA256;
  card.priorCommandCardDigestPrepPacketSha256 = PRIOR_SHA256;
  card.productionDeploymentReference = DEPLOYMENT;
  card.openingWindow = { ...card.openingWindow, startUtc: START, expiresUtc: EXPIRES };
  card.liveExecutionControls.rollbackFirstControlsRequired = true;
  card.liveExecutionControls.immutableCurrentDeploymentRecheckBeforeEveryEffect = true;
  return card;
}

function exactApprovalPhrase() {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source commit ${SOURCE_COMMIT}, runtime mount preparation packet SHA-256 ${MOUNT_SHA256}, prior command-card digest preparation packet SHA-256 ${PRIOR_SHA256}, production deployment reference ${DEPLOYMENT}, and non-executable command-card digest draft SHA-256 ${sha(draft())}. Scope: https://reversr.vercel.app POST /api/cad/user-import, cohort rrb-ref:cad-upload-internal-mark-test-cohort-v1, starting ${START} and expiring ${EXPIRES} (start inclusive, expiry exclusive); one session and one upload attempt for public, synthetic, or explicitly authorized internal tester CAD only. Before any opening, independently recheck the immutable current production deployment, closed baseline, exact draft digest, fresh approval, durable adapter evidence, independent expiry, atomic durable run and attempt claims, session admission, and rollback smoke plan. This draft digest does not identify executable bytes: any later executable card requires its own exact byte digest and separate approval before issuance or use. Preserve the durable one-session/one-attempt fence across restarts, consume the attempt before body read, check expiry and deployment independently before every effect, and stop without retry on failing checks, failing smoke, unknown outcome, stale deployment, missing durable adapter evidence, or any need for runtime credentials or provider configuration. Prepare rollback before opening; close admission immediately on expiry or any stop condition, revoke the bounded session and late grants, then require post-rollback fail-closed smoke with zero body reads, conversion and Sandbox dispatch before cleanup. No provider/env/resource/billing changes, secrets or secret reads, conversion, Sandbox dispatch, private CAD payload use, external messages, retry, second live run, real-user commercialization, or commercial-readiness claim. Runtime activation, upload-session issuance and request-body admission/read remain separate implementation and approval gates; this phrase alone cannot enable them.`;
}

function preparation() {
  const parent = liveOpeningRuntimeMountPreparation();
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-current-deployment-rebind-prep-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_CURRENT_DEPLOYMENT_REBIND_NO_RUNTIME_EFFECTS',
    sourceCommit: SOURCE_COMMIT,
    parentPackets: { runtimeMountPrepSha256: MOUNT_SHA256, priorDigestPrepSha256: PRIOR_SHA256 },
    deploymentBinding: {
      reference: DEPLOYMENT,
      provenance: 'User-supplied target; matching successful GitHub Vercel commit status observed during preparation',
      productionAliasFreshnessProven: false,
      currentGatePerformsLiveEvidenceCollection: false,
      laterImmutableCurrentDeploymentRecheckRequired: true,
      mergeOrRedeployRequiresRebindIfTargetChanges: true,
    },
    proposedOpeningWindow: draft().openingWindow,
    commandCardDigest: {
      algorithm: 'SHA-256',
      canonicalEncoding: 'JSON.stringify over draft in insertion order, UTF-8, no trailing newline',
      sha256: sha(draft()),
      draft: draft(),
      executableBytesDigest: null,
      executableCardIssued: false,
    },
    bindingRequirements: parent.bindingRequirements,
    stopConditions: { ...parent.stopConditions, expiredOrNotYetOpenWindow: true, executableDigestNotSeparatelyApproved: true },
    rollbackPlan: {
      prepareBeforeOpening: true,
      closeOnExpiryOrAnyStopCondition: true,
      revokeSessionAndLateGrantsBeforeSmoke: true,
      smokeCases: ['missing-session', 'invalid-session', 'revoked-session', 'expired-session', 'consumed-attempt'],
      requireAdmissionDenied: true,
      requiredObserverDeltas: { bodyReads: 0, conversions: 0, sandboxDispatches: 0 },
      failedOrUnknownSmokeBlocksCleanupAndRetry: true,
    },
    evidenceSummary: { sourceOnly: true, runtimeEvidenceCollected: false, durableAdapterLiveEvidenceVerified: false, effectsExecuted: 0 },
    nextLiveOpeningGate: { authorized: false, exactPhrase: exactApprovalPhrase(), separateExecutableBytesDigestApprovalRequired: true },
    controls: { ...prior.ZERO_ACTIONS, sourceOnlyRebindPreparationAuthorized: true, cleanupAuthorized: false },
  };
}
function checkPreparation(input) {
  let ok = false;
  try { ok = plainContractData(input) && isDeepStrictEqual(input, preparation()); } catch { /* sanitized */ }
  return { ...preparation().controls, ok, code: ok ? 'SOURCE_ONLY_REBIND_VALID' : 'SOURCE_ONLY_REBIND_BLOCKED' };
}
module.exports = { SOURCE_COMMIT, MOUNT_SHA256, PRIOR_SHA256, DEPLOYMENT, START, EXPIRES, draft, sha, exactApprovalPhrase, preparation, checkPreparation };
