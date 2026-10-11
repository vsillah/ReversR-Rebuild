// Unqualified source assembly. SDK bindings compile locally; provider qualification remains gated.
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { controlledUploadTables } from './cadControlledUploadSchema';
export const binding = {
  userId: v.id('users'), shopId: v.string(), loginSessionId: v.id('authSessions'),
  authMethod: v.union(v.literal('password'), v.literal('passkey'), v.literal('oidc')),
};
export const upload = {
  schemaVersion: v.literal(2), ...binding, sessionId: v.string(),
  cadUploadAllowed: v.boolean(), transport: v.union(v.literal('bearer'), v.literal('cookie')),
  issuedAt: v.number(), expiresAt: v.number(),
  status: v.union(v.literal('active'), v.literal('revoked')), csrfDigest: v.optional(v.string()),
};
export const qualificationScope = {
  resourceBindingDigest: v.string(), namespaceDigest: v.string(), runDigest: v.string(),
  ledgerDigest: v.string(), windowDigest: v.string(), fenceDigest: v.string(),
};
export const qualificationBinding = {
  userId: v.string(), shopId: v.string(), sessionId: v.string(), loginSessionId: v.string(),
};
export const qualificationPolicy = {
  schemaVersion: v.literal(1), windowId: v.string(), windowStart: v.number(), windowEnd: v.number(),
  userConcurrency: v.number(), shopConcurrency: v.number(), userAttempts: v.number(),
  shopAttempts: v.number(), leaseMs: v.number(), maxReservationMicros: v.number(),
  budgetMicros: v.number(), currency: v.literal('USD'),
};
export const qualificationRecord = {
  binding: v.object(qualificationBinding), key: v.string(), reservationMicros: v.number(),
  actualMicros: v.number(), authorityRevision: v.number(), fence: v.number(),
  createdAt: v.number(), expiresAt: v.number(),
  status: v.union(v.literal('reserved'), v.literal('fenced'), v.literal('unknown'), v.literal('settled')),
  outcome: v.union(v.null(), v.literal('not-started'), v.literal('completed'), v.literal('failed')),
};
export const package8ApprovalVerificationRequest = {
  schemaVersion: v.literal(1), issuanceReference: v.string(), approvalCommitment: v.string(),
  baselineCommit: v.string(), baselineTree: v.string(), executionHeadCommit: v.string(),
  executionHeadTree: v.string(), runtimeDeploymentId: v.string(), runtimeReceiptDigest: v.string(),
  ownerCommitment: v.string(), sessionCommitment: v.string(), windowIdDigest: v.string(),
  windowStartUtc: v.string(), windowEndUtc: v.string(), limitsCommitment: v.string(),
  authorityExpiresAtUtc: v.string(),
};
export const package8ApprovalSourceReview = {
  schemaVersion: v.literal(1), baselineCommit: v.string(), baselineTree: v.string(),
  executionHeadCommit: v.string(), executionHeadTree: v.string(), clean: v.literal(true),
  descendantOfBaseline: v.literal(true), ancestryReceiptDigest: v.string(),
  productionEvidenceDeploymentId: v.string(), preparationSha256: v.string(),
  unissuedDraftSha256: v.string(),
};
export const package8ApprovalRuntimeDeployment = {
  schemaVersion: v.literal(1), deploymentId: v.string(), state: v.literal('READY'),
  environment: v.literal('development'), commit: v.string(), tree: v.string(),
  functionEquivalence: v.literal('VERIFIED_EXACT'), receiptDigest: v.string(),
};
export const package8ApprovalLimits = {
  schemaVersion: v.literal(1), maximumSessions: v.literal(1), maximumFiles: v.literal(1),
  maximumAttempts: v.literal(1), maximumRetries: v.literal(0), maximumWindowMs: v.number(),
  maximumCostMicrosExclusive: v.number(), reservationMicros: v.number(), currency: v.literal('USD'),
};
export const custodyBinding = {
  artifactId: v.string(), userId: v.id('users'), shopId: v.string(), uploadSessionId: v.string(),
};
export const custodyKind = v.union(v.literal('original-igs'), v.literal('preview-geometry'),
  v.literal('derived-stl'));
const custodyArtifactBase = {
  schemaVersion: v.literal(1), ...custodyBinding,
  byteCount: v.number(), restrictedDigest: v.string(), providerObjectKey: v.string(),
  objectKeyDigest: v.string(),
  state: v.union(v.literal('reserved'), v.literal('stored'), v.literal('quarantined'),
    v.literal('deleting')),
  createdAt: v.number(), retainedUntil: v.number(), generation: v.number(),
  updatedAt: v.optional(v.number()), quarantineReasonDigest: v.optional(v.string()),
};
export const custodyArtifact = v.union(
  v.object({ ...custodyArtifactBase, kind: v.literal('original-igs'), format: v.literal('model/iges') }),
  v.object({ ...custodyArtifactBase, kind: v.literal('preview-geometry'),
    format: v.literal('application/vnd.reversr.preview+json'),
    sourceArtifactId: v.string(), sourceDigest: v.string(), geometryDigest: v.string(),
    units: v.literal('millimeter'),
    warning: v.literal('Inspection geometry only - not validated for manufacturing.'),
  }),
  v.object({ ...custodyArtifactBase, kind: v.literal('derived-stl'), format: v.literal('model/stl'),
    sourceArtifactId: v.string(), sourceDigest: v.string(), geometryDigest: v.string(),
    units: v.literal('millimeter'),
    warning: v.literal('Inspection geometry only - not validated for manufacturing.'),
  }),
);
export default defineSchema({
  ...authTables,
  ...controlledUploadTables,
  cadUserAuthority: defineTable({ userId: v.id('users'), enabled: v.boolean(), generation: v.number() })
    .index('by_userId', ['userId']),
  cadMemberships: defineTable({ userId: v.id('users'), shopId: v.string(), active: v.boolean(),
    cadUploadAllowed: v.boolean(), generation: v.number() })
    .index('by_userId_and_shopId', ['userId', 'shopId']),
  cadUploadSessions: defineTable({ ...upload, credentialDigest: v.string(), userGeneration: v.number(),
    membershipGeneration: v.number(), revokedAt: v.optional(v.number()) })
    .index('by_credentialDigest', ['credentialDigest'])
    .index('by_sessionId', ['sessionId'])
    .index('by_expiresAt', ['expiresAt']),
  cadArtifacts: defineTable(custodyArtifact)
    .index('by_artifactId', ['artifactId'])
    .index('by_owner_shop_artifactId', ['userId', 'shopId', 'artifactId'])
    .index('by_uploadSessionId', ['uploadSessionId'])
    .index('by_state_and_retainedUntil', ['state', 'retainedUntil']),
  cadArtifactTombstones: defineTable({ ...custodyBinding, kind: custodyKind,
    objectKeyDigest: v.string(), restrictedDigest: v.string(), deletedAt: v.number(),
    replayFence: v.literal(true), generation: v.number(), tombstoneDigest: v.string(),
    scopeKey: v.optional(v.string()) })
    .index('by_artifactId', ['artifactId'])
    .index('by_owner_shop_artifactId', ['userId', 'shopId', 'artifactId']),
  cadArtifactDownloadGrants: defineTable({ grantDigest: v.string(), artifactId: v.string(),
    userId: v.id('users'), shopId: v.string(), uploadSessionId: v.string(),
    artifactGeneration: v.number(), issuedAt: v.number(), expiresAt: v.number(),
    revokedAt: v.optional(v.number()) })
    .index('by_grantDigest', ['grantDigest'])
    .index('by_artifactId', ['artifactId'])
    .index('by_owner_shop_artifactId', ['userId', 'shopId', 'artifactId'])
    .index('by_expiresAt', ['expiresAt']),
  cadArtifactQuotaLedgers: defineTable({ scopeKey: v.string(),
    userId: v.optional(v.id('users')), shopId: v.optional(v.string()), storedBytes: v.number(),
    objectCount: v.number(), classAOperations: v.number(), classBOperations: v.number(),
    deleteOperations: v.number(), revision: v.number(), stopped: v.boolean(), updatedAt: v.number() })
    .index('by_scopeKey', ['scopeKey'])
    .index('by_owner_shop_scopeKey', ['userId', 'shopId', 'scopeKey']),
  cadUploadOrchestrationAttempts: defineTable({ idempotencyDigest: v.string(), attemptId: v.string(),
    userId: v.id('users'), shopId: v.string(), uploadSessionId: v.string(),
    authorityGeneration: v.number(), deploymentRef: v.string(), cohortRef: v.string(),
    evidenceDigest: v.string(), retentionPolicyDigest: v.string(), reservationMicros: v.number(),
    maxRetries: v.literal(0), fence: v.number(), createdAt: v.number(), expiresAt: v.number(),
    state: v.union(v.literal('reserved'), v.literal('body-accepted'), v.literal('quarantined'),
      v.literal('admitted')),
    bodyByteCount: v.optional(v.number()), restrictedDigest: v.optional(v.string()),
    artifactId: v.optional(v.string()), jobId: v.optional(v.string()),
    quarantineReasonDigest: v.optional(v.string()), updatedAt: v.optional(v.number()),
  }).index('by_idempotencyDigest', ['idempotencyDigest'])
    .index('by_attemptId', ['attemptId'])
    .index('by_owner_state', ['userId', 'shopId', 'state'])
    .index('by_state_and_expiresAt', ['state', 'expiresAt']),
  cadUploadJobs: defineTable({ jobId: v.string(), attemptId: v.string(), artifactId: v.string(),
    userId: v.id('users'), shopId: v.string(), uploadSessionId: v.string(),
    originalRestrictedDigest: v.string(),
    state: v.union(v.literal('admitted'), v.literal('converting'), v.literal('ready'),
      v.literal('failed'), v.literal('quarantined')),
    conversionAuthorized: v.boolean(), conversionDispatchCount: v.literal(0),
    conversionClaimCount: v.number(), conversionGeneration: v.number(),
    previewArtifactId: v.optional(v.string()), stlArtifactId: v.optional(v.string()),
    geometryDigest: v.optional(v.string()), previewDigest: v.optional(v.string()),
    stlDigest: v.optional(v.string()), cleanupConfirmed: v.optional(v.boolean()),
    quarantineReasonDigest: v.optional(v.string()), terminalAt: v.optional(v.number()),
    createdAt: v.number(), updatedAt: v.number(),
  }).index('by_jobId', ['jobId'])
    .index('by_attemptId', ['attemptId'])
    .index('by_artifactId', ['artifactId'])
    .index('by_owner_state', ['userId', 'shopId', 'state']),
  cadPhase5ControlState: defineTable({ scopeKey: v.string(), userId: v.id('users'),
    shopId: v.string(), uploadSessionId: v.string(), admissionClosed: v.boolean(), conversionClosed: v.boolean(),
    grantsRevoked: v.boolean(), uncertainRecordsQuarantined: v.boolean(),
    generation: v.number(), closedAt: v.number(), reasonDigest: v.string() })
    .index('by_scopeKey', ['scopeKey'])
    .index('by_owner_shop_scopeKey', ['userId', 'shopId', 'scopeKey']),
  cadQualificationLedgers: defineTable({
    ...qualificationScope,
    controlState: v.object({ schemaVersion: v.literal(1), revision: v.number(), lastNow: v.number(),
      policy: v.object(qualificationPolicy), records: v.array(v.object(qualificationRecord)) }),
    selectors: v.array(v.object({ binding: v.object(qualificationBinding), key: v.string(),
      fence: v.number(), selectorDigest: v.string(), commandDigest: v.string() })),
    receipts: v.array(v.object({ outcome: v.union(v.literal('COMMITTED'), v.literal('ABORTED')),
      beforeRevision: v.number(), afterRevision: v.number(), selectorDigest: v.string(),
      commandDigest: v.string(), proposalDigest: v.string(), code: v.string(), recordedAt: v.number() })),
    claims: v.array(v.object({ selectorDigest: v.string(), generation: v.number(),
      ownerDigest: v.string(), expiresAt: v.number() })),
    cursors: v.array(v.object({ custodianDigest: v.string(), after: v.number(), through: v.number() })),
    stopped: v.boolean(), stopReasonDigest: v.optional(v.string()),
  }).index('by_resource_namespace_run_ledger_window_fence', [
    'resourceBindingDigest', 'namespaceDigest', 'runDigest', 'ledgerDigest', 'windowDigest', 'fenceDigest',
  ]),
  cadQualificationAuthority: defineTable({
    ledgerId: v.id('cadQualificationLedgers'), binding: v.object(qualificationBinding),
    userId: v.string(), shopId: v.string(), sessionId: v.string(), loginSessionId: v.string(),
    kind: v.union(v.literal('login'), v.literal('upload-session'),
      v.literal('membership'), v.literal('permission')),
    active: v.boolean(), generation: v.number(), expiresAt: v.number(),
  }).index('by_ledger_binding_kind', [
    'ledgerId', 'userId', 'shopId', 'sessionId', 'loginSessionId', 'kind',
  ]),
  cadPackage8ApprovalIssuances: defineTable({
    schemaVersion: v.literal(1), issuerPrincipalDigest: v.string(), issuanceReference: v.string(),
    approvalCommitment: v.string(), request: v.object(package8ApprovalVerificationRequest),
    sourceReview: v.object(package8ApprovalSourceReview),
    runtimeDeployment: v.object(package8ApprovalRuntimeDeployment),
    limits: v.object(package8ApprovalLimits), calculatedMaximumCostMicros: v.number(),
    issuedAtMs: v.number(), authorityExpiresAtMs: v.number(), windowStartMs: v.number(),
    windowEndMs: v.number(), receiptDigest: v.string(),
    consumptionReceiptDigest: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('consumed'), v.literal('revoked'),
      v.literal('closed')),
    generation: v.number(), consumedAtMs: v.optional(v.number()), revokedAtMs: v.optional(v.number()),
    closedAtMs: v.optional(v.number()), reasonDigest: v.optional(v.string()),
  }).index('by_issuanceReference', ['issuanceReference'])
    .index('by_approvalCommitment', ['approvalCommitment'])
    .index('by_status_and_authorityExpiresAtMs', ['status', 'authorityExpiresAtMs']),
});
