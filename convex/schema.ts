// Unqualified source assembly. SDK bindings compile locally; provider qualification remains gated.
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
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
export default defineSchema({
  ...authTables,
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
});
