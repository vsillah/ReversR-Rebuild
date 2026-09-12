// Internal CAD authority only. The default library session boundary always denies.
import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { binding, upload } from './schema';
import { createBackendContract } from '../offline/cad-convex/backend';
import { readExactLibrarySession } from './librarySession';
const backend = createBackendContract({ readExactLibrarySession });
const principal = v.object(binding);
const common = { principal, deadlineAt: v.number() };
const grant = v.union(v.null(), v.object({ ...binding, cadUploadAllowed: v.boolean(), expiresAt: v.number() }));
export const insertIfAbsent = internalMutation({
  args: { ...common, credentialDigest: v.string(), record: v.object(upload) }, returns: v.boolean(),
  handler: (ctx, { principal, ...p }) => backend.run(ctx, 'insertIfAbsent', p, principal),
});
export const read = internalQuery({
  args: { ...common, credentialDigest: v.string() }, returns: v.union(v.null(), v.object(upload)),
  handler: (ctx, { principal, ...p }) => backend.run(ctx, 'read', p, principal),
});
export const revoke = internalMutation({
  args: { ...common, credentialDigest: v.string(), revokedAt: v.number() }, returns: v.boolean(),
  handler: (ctx, { principal, ...p }) => backend.run(ctx, 'revoke', p, principal),
});
export const resolveAuthorization = internalQuery({
  args: { ...common, shopId: v.string() }, returns: grant,
  handler: (ctx, { principal, ...p }) => backend.run(ctx, 'resolveAuthorization', p, principal),
});
export const refreshAuthorization = internalQuery({
  args: { ...common, binding: v.object({ ...binding, sessionId: v.string() }) }, returns: grant,
  handler: (ctx, { principal, ...p }) => backend.run(ctx, 'refreshAuthorization', p, principal),
});
// Policy changes are internal and intentionally absent from the gateway allowlist.
export const changeAuthority = internalMutation({
  args: { userId: v.id('users'), shopId: v.optional(v.string()), enabled: v.optional(v.boolean()),
    active: v.optional(v.boolean()), cadUploadAllowed: v.optional(v.boolean()), deadlineAt: v.number() },
  returns: v.boolean(), handler: (ctx, p) => backend.changeAuthority(ctx, p),
});
