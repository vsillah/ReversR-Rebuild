// Unqualified source assembly. Auth library selection and codegen remain live gates.
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
});
