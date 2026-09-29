// Source-only durable-service qualification review plan. No private evidence reads.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const previous = require('./cad-auth-durable-envelope-gap-plan-checker');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-durable-service-qualification-review-plan.json';
const PARENT_SHA = '65c99719c70a688fd5a893c115c813b409e0277473c6d3b4a1b37f1f43d2b256';
const REPAIRED_REVIEW_SHA = '3e18bdf6c31901ea172997c0ea155ba101676af9a1c60a4db827c12d6c79f181';
const REPAIRED_REVIEW_RECEIPT_SHA = '02657eeff430a73599fc4c2d74fe0f97f10bcb1d6b7c4e039535fe00f8cf44ff';
const SERVICE_REF = 'rrb-ref:cad-auth-durable-service-20260928T161754Z';
const SOURCE_EVIDENCE_SET_REF = 'rrb-ref:cad-auth-durable-service-source-evidence-set-20260928T161754Z';
const SOURCE_COMMIT = '43366b9c07b03f7b09cb45c5623b4aca46dc192f';
const REQUIRED_CAPABILITIES = Object.freeze([
  'verifyApproval',
  'verifyDurableEvidence',
  'recheckDeployment',
  'verifyClosedBaseline',
  'claimRun',
  'armRollback',
  'verifySession',
  'claimAttempt',
  'openFence',
  'consumeAttempt',
  'closeFence',
  'revokeSessionAndLateGrants',
  'postRollbackSmoke',
]);
const SOURCES = Object.freeze([
  previous.PACKET,
  ...previous.SOURCES,
  'docs/cad-auth-durable-service-qualification-review-plan.md',
  'scripts/cad-auth-durable-service-qualification-review-plan-checker.js',
  'scripts/cad-auth-durable-service-qualification-review-plan.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function controls() {
  return {
    privateEvidenceReadAuthorized: false,
    durableServiceQualified: false,
    liveDurableServiceQualified: false,
    productionExecutionBinding: null,
    evidenceSemanticsReviewed: false,
    qualificationReviewComplete: false,
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
    publicPushAuthorized: false,
    prCreationAuthorized: false,
    mergeAuthorized: false,
    deploymentAuthorized: false,
    productionSmokeAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    realUserCommercializationAuthorized: false,
    commercialReadinessClaimed: false,
    effectsExecuted: 0,
  };
}

function expectedPacket(readSource = read) {
  const parentBytes = readSource(previous.PACKET);
  const parent = JSON.parse(parentBytes);
  if (sha(parentBytes) !== PARENT_SHA || !previous.checkPacket(parent, { readSource }).ok) {
    throw Error('PARENT_BLOCKED');
  }
  if (parent.durableServiceReference !== SERVICE_REF || parent.sourceEvidenceSetReference !== SOURCE_EVIDENCE_SET_REF) {
    throw Error('OPAQUE_REF_DRIFT');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-durable-service-qualification-review-plan-v1',
    sourceOnly: true,
    status: 'SOURCE_PLAN_VALIDATED_QUALIFICATION_REVIEW_PENDING',
    inspectedSourceCommit: SOURCE_COMMIT,
    gapPlanPacketSha256: PARENT_SHA,
    repairedInventoryReviewSha256: REPAIRED_REVIEW_SHA,
    repairedInventoryReviewReceiptSha256: REPAIRED_REVIEW_RECEIPT_SHA,
    sourceEvidenceSetReference: SOURCE_EVIDENCE_SET_REF,
    durableServiceReference: SERVICE_REF,
    acceptedInventoryBinding: {
      status: 'PRIVATE_REPAIRED_INVENTORY_REVIEW_ACCEPTED_SOURCE_ONLY_LIVE_UNQUALIFIED',
      acceptedArtifactCount: 9,
      requiredArtifactCount: 9,
      blockers: 0,
      repairedSessionBindingReplacementAccepted: true,
      liveDurableServiceQualified: false,
      productionExecutionBinding: null,
    },
    qualificationReviewPlan: {
      reviewScope: 'private-source-only-durable-service-semantic-review',
      requiredCapabilities: [...REQUIRED_CAPABILITIES],
      requiredArtifactKinds: [
        'serviceDescriptor',
        'implementationSourceArchive',
        'atomicityContractAndEvidence',
        'expiryAndRevocationContractAndEvidence',
        'rollbackAndObserverEvidence',
        'receiptSchemaAndCapabilityReceipts',
        'sessionBindingEvidence',
        'deploymentEvidence',
        'custodyAndIndependentReviewRecords',
      ],
      semanticChecks: [
        'digest-and-byte-count-coherence',
        'provenance-custody-owner-authorization-coherence',
        'repaired-session-binding-replacement-binding',
        'durable-service-capability-coverage',
        'one-session-one-attempt-durable-fence',
        'independent-expiry-before-every-effect',
        'rollback-first-and-post-rollback-fail-closed-controls',
        'reviewer-independence-and-retention-disposition',
        'secret-bearing-evidence-rejection',
      ],
      allowedPrivateReviewStatuses: [
        'PRIVATE_QUALIFICATION_REVIEW_ACCEPTED_SOURCE_ONLY_LIVE_UNQUALIFIED',
        'BLOCKED_PRIVATE_QUALIFICATION_REVIEW',
      ],
      sanitizedResultFields: [
        'opaqueRefs',
        'sha256Digests',
        'byteCounts',
        'counts',
        'statuses',
        'closedControls',
        'blockers',
        'nextGate',
      ],
      prohibitedResultFields: [
        'privatePaths',
        'privateValues',
        'topLevelKeyListings',
        'secretValues',
        'providerRuntimeValues',
        'requestBodies',
        'privateCadPayloads',
      ],
      stopConditions: [
        'missing-evidence',
        'digest-drift',
        'unverifiable-provenance',
        'unbound-repaired-session-binding',
        'non-independent-reviewer',
        'secret-bearing-evidence',
        'unknown-outcome',
        'failing-checks',
        'need-for-runtime-credentials-or-provider-configuration',
      ],
    },
    controls: controls(),
    nextGate: 'EXACT_PRIVATE_QUALIFICATION_REVIEW_APPROVAL_REQUIRED',
    sourceBindings: Object.fromEntries([...new Set(SOURCES)].map(file => [file, sha(readSource(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = !!input
      && typeof input === 'object'
      && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, expectedPacket(readSource))
      && input.controls.liveDurableServiceQualified === false
      && input.controls.productionExecutionBinding === null
      && input.acceptedInventoryBinding.productionExecutionBinding === null;
  } catch { /* sanitized */ }
  return {
    ok,
    code: ok ? 'SOURCE_PLAN_VALIDATED_QUALIFICATION_REVIEW_PENDING' : 'QUALIFICATION_REVIEW_PLAN_BLOCKED',
    privateEvidenceRead: false,
    durableServiceQualified: false,
    liveDurableServiceQualified: false,
    productionExecutionBinding: null,
    effectsExecuted: 0,
  };
}

function approvalPhrase(packetBytes) {
  const packet = JSON.parse(packetBytes);
  if (!checkPacket(packet).ok) throw Error('QUALIFICATION_REVIEW_PLAN_BLOCKED');
  return `I approve one bounded private/source-only CAD Auth durable-service qualification review for ReversR-Rebuild, bound to qualification review plan packet ${sha(packetBytes)}, repaired inventory review SHA-256 ${packet.repairedInventoryReviewSha256}, repaired inventory review receipt SHA-256 ${packet.repairedInventoryReviewReceiptSha256}, gap-plan packet ${packet.gapPlanPacketSha256}, source evidence set ${packet.sourceEvidenceSetReference}, and durable service ${packet.durableServiceReference}. Scope: read only the exact repaired inventory artifacts already accepted as source-only qualification-review inputs; verify semantic durable-service requirements, capability coverage, digest and byte-count coherence, provenance, custody, owner authorization, repaired sessionBindingEvidence replacement, reviewer independence, closed-control status, and sanitized next-gate disposition. Record only a private sanitized review result with opaque refs, SHA-256 digests, byte counts, counts, statuses, blockers, and next-gate requirements. This review must keep liveDurableServiceQualified false and productionExecutionBinding null, and it does not authorize production execution, upload admission, or commercial readiness. No provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, live retry, second live run, public push, PR creation, merge, deployment, production smoke, real-user commercialization, or commercial-readiness claim. Stop on missing evidence, digest drift, unverifiable provenance, unbound repaired sessionBindingEvidence, non-independent reviewer, secret-bearing evidence, unknown outcome, failing checks, or need for runtime credentials/provider configuration.`;
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
      nextPrivateQualificationReviewApprovalPhrase: approvalPhrase(bytes),
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
  REQUIRED_CAPABILITIES,
  expectedPacket,
  checkPacket,
  approvalPhrase,
};
