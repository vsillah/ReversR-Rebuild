// Pure offline review-contract checker. No approval parser or execution path.
const EXPECTED = {
  "schemaVersion": 1,
  "mode": "offline-bounded-live-run-dossier",
  "baseCommit": "d09a9823c6ceb9ae6c427281169703aa28f6f1cc",
  "predecessor": "liveAdapterRunPacket.json",
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
  "missingPrerequisites": [
    {
      "id": "identity.adapterCommit",
      "value": null,
      "status": "missing",
      "acceptance": "Full 40-character reviewed adapter source SHA; review receipt binds exact bytes."
    },
    {
      "id": "identity.runnerCommit",
      "value": null,
      "status": "missing",
      "acceptance": "Full 40-character reviewed future runner SHA; no runner exists in this packet."
    },
    {
      "id": "identity.sourceReviewRef",
      "value": null,
      "status": "missing",
      "acceptance": "Immutable independent source review with reviewer, timestamp, artifact SHA-256 and both source SHAs."
    },
    {
      "id": "identity.runId",
      "value": null,
      "status": "missing",
      "acceptance": "Unique synthetic run identifier; no reuse after cancellation or expiry."
    },
    {
      "id": "identity.resourceAlias",
      "value": null,
      "status": "missing",
      "acceptance": "Non-sensitive alias matching ^rrb-synthetic-[a-z0-9-]{1,40}$; never a provider account ID or endpoint."
    },
    {
      "id": "identity.privateResourceBindingRef",
      "value": null,
      "status": "missing",
      "acceptance": "Restricted immutable record mapping alias to exact isolated non-production resource; reference and digest only in public dossier, exact identity in private approval envelope."
    },
    {
      "id": "identity.namespace",
      "value": null,
      "status": "missing",
      "acceptance": "Exact rrb/qualification/<run-id>/<32-lowercase-hex-nonce>; server-enforced on all reads, writes, claims and indexes."
    },
    {
      "id": "identity.ledgerAndWindowRef",
      "value": null,
      "status": "missing",
      "acceptance": "One global ledger and one active window shared by two clients, with immutable IDs and fence; no rollover or replacement ledger."
    },
    {
      "id": "identity.engineAndIsolationRef",
      "value": null,
      "status": "missing",
      "acceptance": "Pinned engine/version and independent serializable read-set/range-dependency evidence, not ledger-only CAS."
    },
    {
      "id": "identity.schemaAndIndexRef",
      "value": null,
      "status": "missing",
      "acceptance": "Exact schema and index digests, supported revision, namespace enforcement and compatibility review."
    },
    {
      "id": "identity.syntheticInventoryRef",
      "value": null,
      "status": "missing",
      "acceptance": "Inventory/digest proves metadata only, no real users, Auth enrollment, files, credentials or CAD; 64 total records includes all authority, ledger, claim and cursor rows."
    },
    {
      "id": "identity.privilegeEvidenceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Existing least-privilege operation permissions and isolation verification; no provisioning/configuration implied."
    },
    {
      "id": "identity.fixtureDigest",
      "value": null,
      "status": "missing",
      "acceptance": "SHA-256 of reviewed synthetic fixture bytes and allocation of 40 unresolved records within 64 total."
    },
    {
      "id": "identity.scenarioAllocationRef",
      "value": null,
      "status": "missing",
      "acceptance": "Scenario-to-operation and requirement matrix with worst-case retries, setup, recovery and evidence accounting; narrow scenarios if budgets cannot fit."
    },
    {
      "id": "identity.independentVerifierRef",
      "value": null,
      "status": "missing",
      "acceptance": "Accepted independent owner of synthetic terminal receipts and transaction serialization evidence; caller receipts confer no authority."
    },
    {
      "id": "custody.primaryRef",
      "value": null,
      "status": "missing",
      "acceptance": "Named primary owner of selectors, due work, evidence, costs and stop decisions."
    },
    {
      "id": "custody.primaryAcceptanceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Dated signed acceptance bound to run, namespace, expiry, retention liability and unresolved obligations."
    },
    {
      "id": "custody.backupRef",
      "value": null,
      "status": "missing",
      "acceptance": "Named distinct backup custodian."
    },
    {
      "id": "custody.backupAcceptanceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Dated backup acceptance of takeover only through fresh CAS claim generation; no timeout release."
    },
    {
      "id": "custody.escalationOwnerRef",
      "value": null,
      "status": "missing",
      "acceptance": "Named escalation owner and restricted contact/handoff reference."
    },
    {
      "id": "custody.recoveryOperatorRef",
      "value": null,
      "status": "missing",
      "acceptance": "Accepted operator qualified for pinned schema and reviewed compatible reconciler."
    },
    {
      "id": "custody.evidenceReviewerRef",
      "value": null,
      "status": "missing",
      "acceptance": "Named independent reviewer accepting sanitized and restricted evidence destinations."
    },
    {
      "id": "custody.retentionAcceptanceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Accepted durable destination, retention duration, owner and enforceable retained-state cost coverage; expiry never authorizes deletion."
    },
    {
      "id": "window.startUtc",
      "value": null,
      "status": "missing",
      "acceptance": "Exact YYYY-MM-DDTHH:mm:ssZ; trusted UTC only."
    },
    {
      "id": "window.expiresUtc",
      "value": null,
      "status": "missing",
      "acceptance": "Exact UTC expiry strictly after start, at most 1800 seconds later; no auto extension or second run."
    },
    {
      "id": "window.trustedClockEvidenceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Trusted clock source and rollback detection; every attempt rechecks authority, ledger, expiry and remaining deadline; stop before expiry."
    },
    {
      "id": "window.stopProcedureRef",
      "value": null,
      "status": "missing",
      "acceptance": "Reviewed stop on first exhausted cap, unknown acknowledgement, clock rollback, binding drift or safety failure; hand off retained state without more store operations after expiry."
    },
    {
      "id": "cost.enforcedCapMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Integer USD microdollars at most 9000000 and at least the all-in line-item sum; hard enforcement, not an alert or app ledger."
    },
    {
      "id": "cost.enforcementEvidenceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Dated independent enforceable cap proof covering all meters/resources, taxes/fees/FX and retained state; unknown retention cost blocks approval. No billing change or recurring commitment."
    },
    {
      "id": "cost.pricingEvidenceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Dated pricing and exact quantity/meter ceilings with immutable evidence digest."
    },
    {
      "id": "cost.computeMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Nonnegative integer USD microdollars with meter, quantity, pricing and evidence; include in all-in sum, explicit zero needs justification."
    },
    {
      "id": "cost.storageMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Nonnegative integer USD microdollars with meter, quantity, pricing and evidence; include in all-in sum, explicit zero needs justification."
    },
    {
      "id": "cost.operationsMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Nonnegative integer USD microdollars with meter, quantity, pricing and evidence; include in all-in sum, explicit zero needs justification."
    },
    {
      "id": "cost.backupMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Nonnegative integer USD microdollars with meter, quantity, pricing and evidence; include in all-in sum, explicit zero needs justification."
    },
    {
      "id": "cost.egressMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Nonnegative integer USD microdollars with meter, quantity, pricing and evidence; include in all-in sum, explicit zero needs justification."
    },
    {
      "id": "cost.taxFeesFxMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Nonnegative integer USD microdollars with meter, quantity, pricing and evidence; include in all-in sum, explicit zero needs justification."
    },
    {
      "id": "cost.contingencyMicros",
      "value": null,
      "status": "missing",
      "acceptance": "Nonnegative integer USD microdollars with meter, quantity, pricing and evidence; include in all-in sum, explicit zero needs justification."
    },
    {
      "id": "cost.retainedStateCoverageRef",
      "value": null,
      "status": "missing",
      "acceptance": "Hard cap covers approved retention after expiry and unresolved holds without deleting evidence; accepted liability and end condition."
    },
    {
      "id": "evidence.restrictedDestinationRef",
      "value": null,
      "status": "missing",
      "acceptance": "Approved restricted destination and access acceptance for raw engine receipts; public dossier contains opaque reference only."
    },
    {
      "id": "evidence.sanitizedDestinationRef",
      "value": null,
      "status": "missing",
      "acceptance": "Exact approved public-relative destination for synthetic summaries; maximum 1 MiB total evidence, raw and sanitized collection must fit reviewed allocation."
    },
    {
      "id": "evidence.sanitizationReviewRef",
      "value": null,
      "status": "missing",
      "acceptance": "Reviewer and content policy exclude credentials, headers, account IDs, private paths and CAD; hash sanitized bytes separately."
    },
    {
      "id": "evidence.disabledRouteBaselineRef",
      "value": null,
      "status": "missing",
      "acceptance": "Offline mounted test evidence bound to source SHA proves refusal before body subscription/admission and zero store/conversion effects; literal false gate and runtime isolation audit."
    },
    {
      "id": "evidence.disabledRouteLivePlanRef",
      "value": null,
      "status": "missing",
      "acceptance": "Reviewed future pre/post verification method bound to exact resource and source; no live probe authorized by this dossier."
    },
    {
      "id": "evidence.reconciliationAcceptanceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Accepted original-selector lookup, CAS generation, bounded cursor/high-water passes and identical-receipt idempotence; conflicting/absent receipts retain both leases and full hold."
    },
    {
      "id": "evidence.rollbackAcceptanceRef",
      "value": null,
      "status": "missing",
      "acceptance": "Reviewed compatible reconciler and backup baseline reference; retain acknowledged history and reject unsupported schema. Backup/restore and actual crash recovery remain separately blocked."
    },
    {
      "id": "evidence.recoveryBaselineRef",
      "value": null,
      "status": "missing",
      "acceptance": "Existing backup baseline digest and compatibility review, or explicit blocked recovery scenario; never create a backup under this packet."
    },
    {
      "id": "evidence.externalApprovalEnvelopeRef",
      "value": null,
      "status": "missing",
      "acceptance": "Separate immutable envelope binds final dossier SHA-256, both source SHAs, exact private resource, namespace, UTC window, counters, cost proof and accepted custody. Publication approval is insufficient."
    }
  ],
  "proposedLimits": {
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
    "maxPagesPerPass": 4,
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
    "maxStoreRestarts": 0,
    "productionAccess": false,
    "realAuthRequired": false
  },
  "operationMatrix": [
    {
      "operation": "read-exact-selector",
      "maxLogicalCommands": 32,
      "maxTransactionAttempts": 96,
      "authorized": false
    },
    {
      "operation": "read-authority-dependencies",
      "maxLogicalCommands": 24,
      "maxTransactionAttempts": 72,
      "authorized": false
    },
    {
      "operation": "seed-synthetic-metadata",
      "maxLogicalCommands": 40,
      "maxTransactionAttempts": 120,
      "authorized": false
    },
    {
      "operation": "reserve-transaction",
      "maxLogicalCommands": 48,
      "maxTransactionAttempts": 144,
      "authorized": false
    },
    {
      "operation": "authority-revoke-or-delete-synthetic",
      "maxLogicalCommands": 16,
      "maxTransactionAttempts": 48,
      "authorized": false
    },
    {
      "operation": "fence-without-dispatch",
      "maxLogicalCommands": 24,
      "maxTransactionAttempts": 72,
      "authorized": false
    },
    {
      "operation": "mark-unknown",
      "maxLogicalCommands": 16,
      "maxTransactionAttempts": 48,
      "authorized": false
    },
    {
      "operation": "claim-cas",
      "maxLogicalCommands": 20,
      "maxTransactionAttempts": 60,
      "authorized": false
    },
    {
      "operation": "settle-from-independent-synthetic-receipt",
      "maxLogicalCommands": 24,
      "maxTransactionAttempts": 72,
      "authorized": false
    },
    {
      "operation": "scan-bounded-page",
      "maxLogicalCommands": 8,
      "maxTransactionAttempts": 24,
      "authorized": false
    },
    {
      "operation": "inject-abort-or-ack-loss",
      "maxLogicalCommands": 2,
      "maxTransactionAttempts": 6,
      "authorized": false
    },
    {
      "operation": "restart-isolated-client",
      "maxLogicalCommands": 2,
      "maxTransactionAttempts": 0,
      "authorized": false
    }
  ],
  "separatelyBlockedOperations": [
    "resource-provision",
    "resource-configure",
    "backup-or-restore",
    "store-restart",
    "retention-or-deletion",
    "window-rollover"
  ],
  "postRunEvidence": [
    {
      "requirementId": "serializable-commit",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "revision-cas",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "conflict-retry",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "durable-selector",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "authority-read",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "cost-durability",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "acknowledgement-loss",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "reconciliation-custody",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "pagination-fairness",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "rollback",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "window-rollover",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    },
    {
      "requirementId": "disabled-route",
      "status": "pending",
      "scenarioRef": null,
      "artifactRef": null,
      "sha256": null,
      "runnerCommit": null,
      "adapterCommit": null,
      "runId": null,
      "resourceAlias": null,
      "namespace": null,
      "utcInterval": null,
      "engineReceiptRef": null,
      "reviewerRef": null,
      "disposition": null
    }
  ],
  "postRunCloseout": {
    "actualCountersRef": null,
    "actualCostAndReceiptRef": null,
    "disabledRouteAfterRef": null,
    "reconciledSelectorsRef": null,
    "unresolvedCustodyAcceptanceRef": null,
    "sanitizedPublicationReviewRef": null
  }
};
function same(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(b).every(k =>
    Object.prototype.hasOwnProperty.call(a, k) && same(a[k], b[k]));
}
function inspectBoundedLiveRunDossier(dossier) {
  const contractValid = same(dossier, EXPECTED);
  return { contractValid, executable: false, liveQualified: false,
    publicationAuthorized: false, liveRunAuthorized: false, decision: 'LIVE_RUN_BLOCKED',
    blockers: contractValid ? ['MISSING_IMMUTABLE_PREREQUISITES', 'NO_REVIEWED_LIVE_RUNNER',
      'SEPARATE_LIVE_APPROVAL_REQUIRED'] : ['DOSSIER_CONTRACT_MISMATCH'],
    missingPrerequisiteIds: EXPECTED.missingPrerequisites.map(item => item.id) };
}
module.exports = { inspectBoundedLiveRunDossier };
