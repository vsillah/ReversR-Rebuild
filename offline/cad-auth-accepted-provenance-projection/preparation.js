// Fixed public metadata only; no private IO or runtime capability.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const SOURCE_MERGE_COMMIT = '5690e016163d916096a40a9a09204c57c5a541c5';
function projectionPreparation() { return {
  "schemaVersion": 1,
  "plan": "cad-auth-accepted-provenance-projection-v1",
  "sourceOnly": true,
  "sourceMergeCommit": "5690e016163d916096a40a9a09204c57c5a541c5",
  "acceptedReview": {
    "ref": "rrb-ref:cad-auth-private-evidence-provenance-review-20260925T175957Z",
    "sha256": "b82710710dad2560c098e9e207af3b5beff5c9bb0223020ebf371b169abe2088",
    "receiptSha256": "e3687b11ea4d55f64d21b183c3abf46f88d8c56291b5ce93e4905ffec6d29fbd",
    "scheduleRef": "rrb-ref:cad-auth-provenance-repaired-schedule-20260925T175957Z",
    "scheduleSha256": "fc8611568aaf7eaf48a132b274d748d931ebba81acf05ee2b7088376701f7bcb"
  },
  "disposition": {
    "status": "ACCEPTED_PRIVATE_PROVENANCE_REVIEW_PROJECTED",
    "authority": "SUPPLIED_APPROVED_GATE_ONLY_NOT_INDEPENDENT_PRIVATE_VERIFICATION",
    "acceptedFields": 22,
    "totalFields": 22,
    "verifiedRepairedMappings": 2,
    "totalRepairedMappings": 2,
    "historicalStoppedReviewUnchanged": true
  },
  "retentionDeletion": {
    "status": "PRIVATE_DISPOSITION_DETAILS_NOT_SUPPLIED",
    "privatePolicyUnchanged": true,
    "retentionPerformed": false,
    "deletionPerformed": false,
    "mustBindBeforeReceiptSupply": true
  },
  "futureApprovalGate": {
    "status": "RECEIPT_SUPPLY_BLOCKED_PENDING_COMPLETE_PACKET_AND_SEPARATE_APPROVAL",
    "authorized": false,
    "exactApprovalPhrase": "I approve preparation of one bounded CAD Auth receipt-supply approval packet for ReversR-Rebuild, bound to accepted provenance review rrb-ref:cad-auth-private-evidence-provenance-review-20260925T175957Z, review SHA-256 b82710710dad2560c098e9e207af3b5beff5c9bb0223020ebf371b169abe2088, review receipt SHA-256 e3687b11ea4d55f64d21b183c3abf46f88d8c56291b5ce93e4905ffec6d29fbd, repaired schedule rrb-ref:cad-auth-provenance-repaired-schedule-20260925T175957Z, and repaired schedule SHA-256 fc8611568aaf7eaf48a132b274d748d931ebba81acf05ee2b7088376701f7bcb. Use only supplied sanitized opaque references, digests, counts and statuses to bind the reviewed projection commit and packet digest, complete supply schedule, custodian, independent reviewer, restricted store, retention duration, deletion owner and approval window. Stop if any binding or retention/deletion disposition is unspecified. No private reads or discovery, secrets, receipt creation or supply, source-set generation, provider/env/resource/billing changes, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD payload use, live evidence collection, runtime activation, executable command-card issuance, external messages, retry or additional review, real-user commercialization, or commercial-readiness claim. Return the fully bound receipt-supply phrase for separate approval.",
    "receiptSupplyRequiresSeparateApproval": true,
    "sourceSetGenerationRequiresSeparateApproval": true
  },
  "stopConditions": {
    "failingCheck": true,
    "failingSmoke": true,
    "unknownOutcome": true,
    "runtimeCredentialsOrProviderConfigurationNeeded": true,
    "missingSupplyBindingOrRetentionDeletionDisposition": true
  },
  "controls": {
    "privateReceiptReadAuthorized": false,
    "privateReceiptDiscoveryAuthorized": false,
    "secretReadAuthorized": false,
    "receiptCreationAuthorized": false,
    "receiptSupplyAuthorized": false,
    "sourceSetGenerationAuthorized": false,
    "publicProjectionReleaseAuthorized": false,
    "uploadSessionIssuanceAuthorized": false,
    "productionUploadActivationAuthorized": false,
    "requestBodyAdmissionReadAuthorized": false,
    "conversionAuthorized": false,
    "sandboxDispatchAuthorized": false,
    "privateCadUseAuthorized": false,
    "liveEvidenceCollectionAuthorized": false,
    "runtimeActivationAuthorized": false,
    "executableCommandCardIssuanceAuthorized": false,
    "externalMessagesAuthorized": false,
    "retryAuthorized": false,
    "secondPrivateReviewAuthorized": false,
    "evidenceAccepted": false,
    "commercialReadinessClaimed": false,
    "providerEnvResourceBillingChangesAuthorized": false,
    "realUserCommercializationAuthorized": false,
    "privateReviewBytesRead": false,
    "privateScheduleBytesRead": false,
    "privateReviewReceiptBytesRead": false
  }
}; }
function checkProjectionPreparation(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, projectionPreparation()); } catch {}
  return { ...projectionPreparation().controls, ok, code: ok ? 'SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION_VALID' : 'INVALID_SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION' };
}
module.exports = { SOURCE_MERGE_COMMIT, projectionPreparation, checkProjectionPreparation };
