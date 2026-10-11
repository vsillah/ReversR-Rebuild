import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export const plan = v.union(v.literal('free'), v.literal('pro_shop'), v.literal('team'));
const cadArtifactKind = v.union(v.literal('original-igs'), v.literal('preview-geometry'),
  v.literal('derived-stl'));
const cadArtifactState = v.union(v.literal('reserved'), v.literal('stored'),
  v.literal('quarantined'), v.literal('deleting'));
const cadJobState = v.union(v.literal('admitted'), v.literal('converting'), v.literal('ready'),
  v.literal('failed'), v.literal('quarantined'), v.literal('deleted'));
const cadUploadSessionBinding = {
  schemaVersion: v.literal(2), credentialDigest: v.string(), userId: v.id('users'),
  loginSessionId: v.id('authSessions'), sessionId: v.string(),
  authMethod: v.literal('password'), cadUploadAllowed: v.boolean(),
  issuedAt: v.number(), expiresAt: v.number(),
};
const cadUploadSession = v.union(
  v.object({ ...cadUploadSessionBinding, shopId: v.id('shops'), transport: v.literal('cookie'),
    status: v.literal('active'), csrfDigest: v.string() }),
  v.object({ ...cadUploadSessionBinding, shopId: v.union(v.id('shops'), v.string()),
    transport: v.union(v.literal('cookie'), v.literal('bearer')),
    status: v.literal('revoked'), csrfDigest: v.optional(v.string()),
    userGeneration: v.optional(v.number()), membershipGeneration: v.optional(v.number()),
    revokedAt: v.optional(v.number()) }),
);
export default defineSchema({
  ...authTables,
  shops: defineTable({ ownerId: v.id('users'), name: v.string(), planId: plan,
    subscriptionStatus: v.string(), currentPeriodEnd: v.number(), customerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()), checkoutIntent: v.optional(v.string()),
    checkoutPlan: v.optional(plan), checkoutStartedAt: v.optional(v.number()), revision: v.optional(v.number()) })
    .index('by_ownerId', ['ownerId']).index('by_customerId', ['customerId']),
  memberships: defineTable({ userId: v.id('users'), shopId: v.id('shops'), active: v.boolean(),
    role: v.union(v.literal('owner'), v.literal('member')) }).index('by_userId', ['userId']),
  creditPeriods: defineTable({ shopId: v.id('shops'), periodKey: v.string(), used: v.number() })
    .index('by_shopId_and_periodKey', ['shopId', 'periodKey']),
  creditEvents: defineTable({ shopId: v.id('shops'), userId: v.id('users'), periodKey: v.string(),
    feature: v.string(), key: v.string(), requestHash: v.string(), credits: v.number() })
    .index('by_shopId_and_periodKey_and_feature_and_key', ['shopId', 'periodKey', 'feature', 'key']),
  stripeEvents: defineTable({ eventId: v.string(), subscriptionId: v.string() }).index('by_eventId', ['eventId']),
  subscriptions: defineTable({ subscriptionId: v.string(), shopId: v.id('shops') })
    .index('by_subscriptionId', ['subscriptionId']),
  cadUploadSessions: defineTable(cadUploadSession)
    .index('by_credentialDigest', ['credentialDigest']).index('by_sessionId', ['sessionId']),
  cadAuthenticatedIgsJobs: defineTable({ jobId: v.string(), idempotencyDigest: v.string(),
    requestDigest: v.string(), userId: v.id('users'), shopId: v.id('shops'),
    uploadSessionId: v.string(), extension: v.union(v.literal('igs'), v.literal('iges')),
    contentLength: v.number(), state: cadJobState, attemptCount: v.number(),
    reservedCostMicros: v.number(), createdAt: v.number(), updatedAt: v.number(),
    originalArtifactId: v.optional(v.string()), previewArtifactId: v.optional(v.string()),
    stlArtifactId: v.optional(v.string()), geometryDigest: v.optional(v.string()),
    safeCode: v.optional(v.string()), terminalAt: v.optional(v.number()) })
    .index('by_jobId', ['jobId'])
    .index('by_shopId_and_idempotencyDigest', ['shopId', 'idempotencyDigest'])
    .index('by_shopId_and_state', ['shopId', 'state'])
    .index('by_originalArtifactId', ['originalArtifactId'])
    .index('by_userId_and_shopId_and_updatedAt', ['userId', 'shopId', 'updatedAt']),
  cadAuthenticatedIgsArtifacts: defineTable({ schemaVersion: v.literal(1), artifactId: v.string(), userId: v.id('users'),
    shopId: v.id('shops'), uploadSessionId: v.string(), kind: cadArtifactKind, format: v.string(),
    byteCount: v.number(), restrictedDigest: v.string(), sourceArtifactId: v.optional(v.string()),
    sourceDigest: v.optional(v.string()), geometryDigest: v.optional(v.string()),
    units: v.optional(v.literal('millimeter')), warning: v.optional(v.string()),
    providerObjectKey: v.string(), objectKeyDigest: v.string(), state: cadArtifactState,
    createdAt: v.number(), retainedUntil: v.number(), generation: v.number(),
    updatedAt: v.optional(v.number()), quarantineReasonDigest: v.optional(v.string()) })
    .index('by_artifactId', ['artifactId'])
    .index('by_shopId_and_state', ['shopId', 'state'])
    .index('by_uploadSessionId', ['uploadSessionId']),
  cadAuthenticatedIgsGrants: defineTable({ grantDigest: v.string(), artifactId: v.string(),
    userId: v.id('users'), shopId: v.id('shops'), uploadSessionId: v.string(),
    artifactGeneration: v.number(), issuedAt: v.number(), expiresAt: v.number(),
    consumedAt: v.optional(v.number()), revokedAt: v.optional(v.number()) })
    .index('by_grantDigest', ['grantDigest'])
    .index('by_owner_and_artifactId', ['userId', 'shopId', 'artifactId']),
  cadAuthenticatedIgsQuota: defineTable({ scopeKey: v.string(), shopId: v.id('shops'),
    periodKey: v.string(), admittedBytes: v.number(), attemptCount: v.number(),
    reservedCostMicros: v.number(), storedBytes: v.number(), objectCount: v.number(),
    classAOperations: v.number(), classBOperations: v.number(), deleteOperations: v.number(),
    revision: v.number(), stopped: v.boolean(), updatedAt: v.number() })
    .index('by_scopeKey', ['scopeKey']).index('by_shopId_and_periodKey', ['shopId', 'periodKey']),
});
