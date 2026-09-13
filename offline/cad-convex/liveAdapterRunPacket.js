// Pure source-template checker. This module cannot approve or dispatch a run.
const EXPECTED = {
  "schemaVersion": 1,
  "mode": "offline-run-packet-template",
  "baseCommit": "8303051b5df1645b165aee7e2b2e2781c1b5c512",
  "executable": false,
  "liveQualified": false,
  "gates": {
    "publication": false,
    "provisioning": false,
    "configuration": false,
    "liveRun": false,
    "storeMutation": false,
    "backupRestore": false,
    "reconciliation": false,
    "uploadActivation": false,
    "conversion": false,
    "sandbox": false,
    "merge": false,
    "deployment": false,
    "cleanup": false
  },
  "identity": {
    "adapterCommit": null,
    "runId": null,
    "resourceRef": null,
    "namespace": null,
    "engineVersion": null,
    "isolationEvidenceRef": null,
    "packetSha256": null,
    "approvalRef": null
  },
  "custody": {
    "primaryRef": null,
    "primaryAcceptanceRef": null,
    "backupRef": null,
    "backupAcceptanceRef": null,
    "escalationOwnerRef": null,
    "backupEvidenceRef": null,
    "recoveryReviewRef": null
  },
  "window": {
    "startUtc": null,
    "expiresUtc": null,
    "maxRunSeconds": 1800,
    "maxTransactionAttempts": 3,
    "transactionDeadlineMs": 5000,
    "conflictBackoffMs": [
      100,
      250
    ],
    "maxClaimSeconds": 60,
    "maxReconciliationPasses": 2,
    "maxPageSize": 32,
    "maxPagesPerPass": 4
  },
  "resources": {
    "syntheticOnly": true,
    "independentClients": 2,
    "globalLedgers": 1,
    "activeWindows": 1,
    "maxSyntheticRecords": 64,
    "paginationFixtureRecords": 40,
    "maxLogicalCommands": 256,
    "maxTransactionAttemptsTotal": 768,
    "maxRecordBytes": 4096,
    "maxStoredBytes": 1048576,
    "maxEvidenceBytes": 1048576,
    "maxClientRestarts": 2,
    "maxStoreRestarts": 1,
    "productionAccess": false,
    "realAuthRequired": false
  },
  "operations": [
    "read-exact-selector",
    "read-authority-dependencies",
    "seed-synthetic-metadata",
    "reserve-transaction",
    "authority-revoke-or-delete-synthetic",
    "fence-without-dispatch",
    "mark-unknown",
    "claim-cas",
    "settle-from-independent-synthetic-receipt",
    "scan-bounded-page",
    "inject-abort-or-ack-loss",
    "restart-isolated-client"
  ],
  "separateApprovalOperations": [
    "resource-provision",
    "resource-configure",
    "backup-or-restore",
    "store-restart",
    "retention-or-deletion",
    "window-rollover"
  ],
  "cost": {
    "currency": "USD",
    "proposedAllInCapMicros": 9000000,
    "enforcedCapMicros": null,
    "capEvidenceRef": null,
    "pricingAsOfUtc": null,
    "pricingEvidenceRef": null,
    "lineItems": {
      "computeMicros": null,
      "storageMicros": null,
      "operationsMicros": null,
      "backupMicros": null,
      "egressMicros": null,
      "taxFeesFxMicros": null,
      "contingencyMicros": null
    },
    "recurringCommitmentAllowed": false,
    "estimateIsEnforcement": false
  },
  "evidence": [
    {
      "requirementId": "serializable-commit",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "revision-cas",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "conflict-retry",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "durable-selector",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "authority-read",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "cost-durability",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "acknowledgement-loss",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "reconciliation-custody",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "pagination-fairness",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "rollback",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "window-rollover",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "disabled-route",
      "status": "pending",
      "artifactRef": null,
      "sha256": null,
      "runId": null,
      "adapterCommit": null,
      "resourceAlias": null,
      "startedUtc": null,
      "endedUtc": null,
      "reviewerRef": null,
      "disposition": null
    }
  ]
};
function same(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a), expected = Object.keys(b);
  return keys.length === expected.length && expected.every(k =>
    Object.prototype.hasOwnProperty.call(a, k) && same(a[k], b[k]));
}
function inspectRunPacket(packet) {
  const templateValid = same(packet, EXPECTED);
  return { templateValid, executable: false, liveQualified: false,
    decision: 'LIVE_RUN_BLOCKED',
    blockers: templateValid ? ['UNFILLED_TEMPLATE', 'SEPARATE_APPROVAL_REQUIRED', 'NO_LIVE_RUNNER'] : ['TEMPLATE_CONTRACT_MISMATCH'] };
}
module.exports = { inspectRunPacket };
