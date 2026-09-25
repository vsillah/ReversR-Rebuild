// Public planning contract only; no receipt input or execution capability.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const { artifactPreparation } = require('../cad-auth-missing-receipt-artifact-prep/preparation');
const MERGE_COMMIT = '1fa92cf168743987bec44b6eca0b88ace72973b4';

function bundlePreparation() {
  const parent = artifactPreparation();
  const categories = Object.keys(parent.requiredCategories);
  return {
    schemaVersion: 1,
    plan: 'cad-auth-eight-artifact-supply-gate-v1',
    sourceOnly: true,
    parentContract: parent.plan,
    sourceMergeCommit: MERGE_COMMIT,
    requiredCategories: parent.requiredCategories,
    sourceAndProvenanceBoundary: parent.sourceAndProvenanceBoundary,
    stopConditions: {
      ...parent.stopConditions,
      partialOrAdditionalCategorySchedule: true,
      missingOrUnapprovedSupplySchedule: true,
      scheduleDigestOrPacketDigestMismatch: true,
      expiredApprovalWindow: true,
      privateReadOrDiscoveryNeeded: true,
      priorApprovalReused: true,
    },
    futureApprovalGates: {
      bundledArtifactSupply: {
        authorized: false,
        categorySet: Object.fromEntries(categories.map(category => [category, true])),
        exactReceiptCount: 8,
        exactPhraseTemplate: `Approve one CAD Auth bundled eight-artifact supply for categories ${categories.join(', ')}, bound to <candidateCommit> and supply packet <packetSha256>, under complete supply schedule <supplyScheduleRef> with digest <supplyScheduleSha256>, coordinated by custodian <custodian> and independent reviewer <reviewer>, retained in <restrictedStoreRef> for <retentionDuration> with deletion owner <deletionOwner>, within <approvalWindowUtc>. Supply all eight dedicated JSON receipts from existing approved evidence only, following every category assignment and provenance boundary in that schedule. Stop the whole bundle on any missing or invalid category; no partial acceptance or substitution. No private receipt read or discovery, private review, source-set generation, public projection release, private values or paths or key listings, secrets, provider/runtime value disclosure, provider/env/resource/billing changes, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD, live evidence collection, runtime activation, executable command-card issuance, external messages, retry, second run, or commercial-readiness claim.`,
        phraseFields: {
          candidateCommit: null, packetSha256: null,
          supplyScheduleRef: null, supplyScheduleSha256: null,
          custodian: null, reviewer: null, restrictedStoreRef: null,
          retentionDuration: null, deletionOwner: null, approvalWindowUtc: null,
        },
        requiredSchedule: {
          status: 'UNRESOLVED_NOT_APPROVED',
          categoryAssignments: Object.fromEntries(categories.map(category => [category, {
            category, receiptFile: parent.requiredCategories[category].requiredReceiptFile,
            sourceSystem: null, custodian: null, reviewer: null,
            allowedEvidenceSource: null, evidenceApprovalRef: null,
            restrictedStoreRef: null, retentionDuration: null, deletionOwner: null,
          }])),
          allCategoryFieldsRequiredBeforeUse: true,
          exactlyEightUniqueCategories: true,
          independentReviewerDistinctFromCustodianForEveryCategory: true,
          bundleReviewerDistinctFromBundleCustodian: true,
          digestBindsCompletePrivatelyApprovedSchedule: true,
          scheduleMustMatchCandidateAndPacket: true,
          scheduleValuesRemainPrivate: true,
          opaqueReferencesAreNotPermissionToDiscover: true,
        },
        allPhraseFieldsRequiredBeforeUse: true,
        unresolvedPlaceholdersAreNotApproval: true,
        templateIsNotExecutableOrAuthorization: true,
        previousApprovalReusable: false,
        partialAcceptanceAllowed: false,
        privateReviewRequiresSeparateApproval: true,
        missingEvidenceRequiresSeparateProposal: true,
        supplyDoesNotAuthorizePrivateReads: true,
      },
      privateRead: parent.futureApprovalGates.privateRead,
      sanitizedProjectionReview: parent.futureApprovalGates.sanitizedProjectionReview,
      liveEvidenceCollection: parent.futureApprovalGates.liveEvidenceCollection,
    },
    controls: {
      ...parent.controls,
      bundledSupplyAuthorized: false,
      privateReviewAuthorized: false,
      privateDiscoveryAuthorized: false,
      productionUploadActivationAuthorized: false,
      externalMessagesAuthorized: false,
      providerEnvResourceBillingChangesAuthorized: false,
      publicProjectionReleaseAuthorized: false,
    },
  };
}
function checkBundlePreparation(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, bundlePreparation()); } catch { /* sanitized */ }
  return { ...bundlePreparation().controls, ok,
    code: ok ? 'SOURCE_ONLY_EIGHT_ARTIFACT_SUPPLY_GATE_VALID' : 'INVALID_SOURCE_ONLY_EIGHT_ARTIFACT_SUPPLY_GATE' };
}
module.exports = { MERGE_COMMIT, bundlePreparation, checkBundlePreparation };
