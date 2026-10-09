// Additive source candidate only. No handler or ingress is enabled by this schema.
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const grantBindingFields = {
  schemaVersion: v.literal(1), resourceBindingDigest: v.string(), approvedRunId: v.string(),
  cohortRef: v.string(), deploymentReference: v.string(), deploymentTarget: v.string(),
  gitCommitSha: v.string(), commandCardSha256: v.string(), installationSha256: v.string(),
  durableEvidenceSha256: v.string(), durableServiceRef: v.string(), credentialDigest: v.string(),
  supplyReceiptSha256: v.string(), userId: v.id('users'), shopId: v.string(),
  loginSessionId: v.id('authSessions'), sessionId: v.string(),
  route: v.literal('POST /api/cad/user-import'), windowStartMs: v.number(), windowEndMs: v.number(),
  grantDeadlineMs: v.number(), validatorEnvelopeSha256: v.string(), approvalRecordSha256: v.string(),
  maxRuns: v.literal(1), maxSessions: v.literal(1), maxAttempts: v.literal(1), maxRetries: v.literal(0),
  conversionAuthorized: v.literal(false), sandboxAuthorized: v.literal(false),
  privateCredentialSupplyRef: v.string(), productionAlias: v.string(), sessionRef: v.string(),
};
export const grantBinding = v.object(grantBindingFields);
export const authorityGenerations = v.object({ login: v.number(), user: v.number(),
  membership: v.number(), uploadSession: v.number(), hostPrincipal: v.number(), grant: v.number() });
export const continuityIdentity = v.object({
  bindingDigest: v.string(), scopeKey: v.string(), runKey: v.string(), sessionKey: v.string(),
  userId: v.string(), loginSessionId: v.string(), userAuthorityId: v.string(), membershipId: v.string(),
  uploadRowId: v.string(), shopId: v.string(), sessionId: v.string(), credentialDigest: v.string(),
  sessionRef: v.string(),
});
export const continuityEvidenceEnvelope = v.object({
  schemaVersion: v.literal(1), identity: continuityIdentity, rowDigest: v.string(),
  authorityGenerations, epoch: v.number(), epochDigest: v.string(), sequence: v.number(),
  scopeRevision: v.number(), observedAtMs: v.number(), expiresAtMs: v.number(), approvalDigest: v.string(),
  custodySubjectDigest: v.string(), writerSubjectDigest: v.string(), recoverySubjectDigest: v.string(),
  custodianSubjectDigest: v.string(), writerPrincipalDigest: v.string(), custodianPrincipalDigest: v.string(),
  requestNonceDigest: v.string(), evidenceDigest: v.string(),
});
export const continuityAnchor = v.object({
  resourceBindingDigest: v.string(), scopeKey: v.string(), epoch: v.number(), epochDigest: v.string(),
  minimumSequence: v.number(), minimumScopeRevision: v.number(), lastTrustedTimeMs: v.number(),
  authorityGenerations,
});
export const independentContinuityEvidence = v.object({
  envelope: continuityEvidenceEnvelope,
  anchor: continuityAnchor,
});
export const operation = v.union(v.literal('claimRun'), v.literal('claimAttempt'),
  v.literal('armRollback'), v.literal('openBodyAdmissionFence'), v.literal('consumeAttemptBeforeBodyRead'),
  v.literal('markUnknown'), v.literal('closeBodyAdmissionFence'), v.literal('revokeSessionAndLateGrants'));
export const role = v.union(v.literal('grant-custodian'), v.literal('writer'), v.literal('recovery'),
  v.literal('independent-reader'), v.literal('smoke-verifier'));
export const stopReason = v.union(v.literal('unknown'), v.literal('clock-regression'), v.literal('restore'),
  v.literal('duplicate'), v.literal('revoked'), v.literal('expired'));
export const sourceClosedResult = v.object({
  code: v.string(), sourceOnly: v.literal(true), modelAccepted: v.boolean(), hostQualified: v.literal(false),
  bodyAdmissionAuthorized: v.literal(false), liveReady: v.literal(false), costs: v.literal(0),
  candidateWritten: v.optional(v.boolean()), metadataMatches: v.optional(v.boolean()),
  statePresent: v.optional(v.boolean()), receiptPresent: v.optional(v.boolean()), revision: v.optional(v.number()),
  resultDigest: v.optional(v.string()), runSpent: v.optional(v.boolean()), attemptSpent: v.optional(v.boolean()),
  rollbackArmed: v.optional(v.boolean()), fenceOpenedOnce: v.optional(v.boolean()), fenceOpen: v.optional(v.boolean()),
  consumed: v.optional(v.boolean()), closed: v.optional(v.boolean()), revoked: v.optional(v.boolean()),
  unknown: v.optional(v.boolean()), permanentStop: v.optional(v.boolean()),
  recoveryState: v.optional(v.union(v.literal('pending'), v.literal('closed-revoked'),
    v.literal('verified'), v.literal('unknown'))),
  stopReason: v.optional(stopReason),
});
export const grantFields = { grantKey: v.string(), scopeKey: v.string(), runKey: v.string(),
  bindingDigest: v.string(), binding: grantBinding,
  installedByPrincipalId: v.id('cadControlledUploadHostPrincipals'), installedAtMs: v.number() };
export const scopeFields = { scopeKey: v.string(), approvedRunId: v.string(), runKey: v.string(),
  grantId: v.id('cadControlledUploadGrants'), sessionKey: v.string(), currentBindingDigest: v.string(),
  revision: v.number(), authorityGeneration: v.number(), lastHostTimeMs: v.number(),
  custodyEpochDigest: v.string(), runSpent: v.boolean(), revoked: v.boolean(), permanentStop: v.boolean(),
  stopReason: v.union(v.null(), v.literal('unknown'), v.literal('clock-regression'), v.literal('restore'),
    v.literal('duplicate'), v.literal('revoked'), v.literal('expired')),
  grantHistoryDigests: v.array(v.string()) };
export const attemptFields = { scopeId: v.id('cadControlledUploadScopes'),
  grantId: v.id('cadControlledUploadGrants'), runKey: v.string(), sessionKey: v.string(),
  requestNonceDigest: v.string(), bindingDigest: v.string(), revision: v.number(),
  attemptSpent: v.boolean(), rollbackArmed: v.boolean(), fenceOpenedOnce: v.boolean(), fenceOpen: v.boolean(),
  consumed: v.boolean(), closed: v.boolean(), revoked: v.boolean(), unknown: v.boolean(), deadlineMs: v.number(),
  authorityGenerations, recoveryState: v.union(v.literal('pending'), v.literal('closed-revoked'),
    v.literal('verified'), v.literal('unknown')), recoveryDueAtMs: v.number(), lastReceiptSequence: v.number() };
export const tombstoneFields = { sessionKey: v.string(), scopeId: v.id('cadControlledUploadScopes'),
  runKey: v.string(), bindingDigest: v.string(), spent: v.literal(true), consumed: v.boolean(),
  revoked: v.boolean(), createdAtMs: v.number() };
export const receiptFields = { operationKey: v.string(), scopeId: v.id('cadControlledUploadScopes'),
  attemptId: v.id('cadControlledUploadAttempts'), bindingDigest: v.string(), requestNonceDigest: v.string(),
  operation, sequence: v.number(), beforeRevision: v.number(), afterRevision: v.number(),
  authorityGeneration: v.number(), principalGeneration: v.number(), evaluatedAtMs: v.number(),
  deadlineMs: v.number(), outcome: v.union(v.literal('committed-restrictive'), v.literal('committed-forward')),
  resultDigest: v.string(), custodyEpochDigest: v.string(), commitOrdering: v.union(v.null(), v.commitTs()) };
export const evidenceFields = { evidenceKey: v.string(), scopeId: v.id('cadControlledUploadScopes'),
  bindingDigest: v.string(), phase: v.union(v.literal('baseline'), v.literal('post-rollback')),
  verifierPrincipalId: v.id('cadControlledUploadHostPrincipals'), verifierGeneration: v.number(),
  readbackReceiptDigest: v.string(), instrumentationEvidenceDigest: v.string(), smokeEvidenceDigest: v.string(),
  deploymentIdentityDigest: v.string(), observedStartMs: v.number(), observedEndMs: v.number(),
  status: v.literal(401), code: v.literal('USER_SESSION_REQUIRED'), controlledProofHeaders: v.literal('absent'),
  bodySubscriptions: v.literal(0), bodyReads: v.literal(0), independentCustodyRef: v.string() };
export const principalFields = { principalKey: v.string(), verifiedIssuer: v.string(), verifiedAudience: v.string(),
  verifiedSubjectDigest: v.string(), role, resourceBindingDigest: v.string(), active: v.boolean(),
  generation: v.number(), expiresAtMs: v.number(), approvedPolicyDigest: v.string() };

export const controlledUploadTables = {
  cadControlledUploadGrants: defineTable(grantFields).index('by_grantKey', ['grantKey']).index('by_scopeKey', ['scopeKey']),
  cadControlledUploadScopes: defineTable(scopeFields).index('by_scopeKey', ['scopeKey']).index('by_runKey', ['runKey']),
  cadControlledUploadAttempts: defineTable(attemptFields).index('by_runKey', ['runKey'])
    .index('by_sessionKey', ['sessionKey']).index('by_recoveryState_and_recoveryDueAtMs', ['recoveryState', 'recoveryDueAtMs']),
  cadControlledUploadSessionTombstones: defineTable(tombstoneFields).index('by_sessionKey', ['sessionKey']),
  cadControlledUploadReceipts: defineTable(receiptFields).index('by_operationKey', ['operationKey'])
    .index('by_scopeId_and_sequence', ['scopeId', 'sequence']),
  cadControlledUploadEvidence: defineTable(evidenceFields).index('by_evidenceKey', ['evidenceKey'])
    .index('by_scopeId_and_phase', ['scopeId', 'phase']),
  cadControlledUploadHostPrincipals: defineTable(principalFields).index('by_principalKey', ['principalKey'])
    .index('by_resourceBindingDigest_and_role', ['resourceBindingDigest', 'role']),
};
