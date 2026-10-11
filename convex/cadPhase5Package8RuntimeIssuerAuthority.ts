// Internal-only durable Package 8 runtime issuer-authority ledger.
// It stores sanitized commitments and performs one atomic consume before any
// provider-capable qualification path may run.
import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { package8RuntimeAuthorityRequest } from './schema';
import { parseCanonicalIssuedAtUtc } from '../utils/cadIssuedAtUtc';

const BASELINE = {
  commit: '228320e174d23cbe9b43d9c192c2216733f4c477',
  tree: 'cb22fc27d6bc741f2abc61ed0e456d66e2bfc336',
} as const;
const MAXIMUM_WINDOW_MS = 15 * 60_000;
const MAXIMUM_EVIDENCE_AGE_MS = 120_000;
const HEX = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const request = v.object(package8RuntimeAuthorityRequest);
const base = {
  sourceOnly: v.literal(true), internalOnly: v.literal(true), routeMounted: v.literal(false),
  runtimeActivationAllowed: v.literal(false), requestBodyAdmissionAuthorized: v.literal(false),
  providerDispatchEnabled: v.literal(false), applicationRetries: v.literal(0),
  transportRetries: v.literal(0), providerRetries: v.literal(0),
  logicalOperationCalls: v.literal(1), externalSideEffectsInsideTransaction: v.literal(false),
  platformOccReexecutionPossible: v.literal(true), atMostOneCommittedTransition: v.literal(true),
};
const code = v.union(
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_EXPIRED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED'),
  v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONFLICT'),
);
const denied = v.object({ ...base, accepted: v.literal(false), code });
const transition = v.union(denied, v.object({
  ...base, accepted: v.literal(true), code, authorityCommitment: v.string(),
  requestCommitment: v.string(), generation: v.number(), replayed: v.literal(false),
}));
const readResult = v.union(denied, v.object({
  ...base, accepted: v.literal(true),
  code: v.literal('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIED'),
  evidence: v.object({
    schemaVersion: v.literal(1), authorityCommitment: v.string(),
    requestCommitment: v.string(), issuanceReference: v.string(),
    approvalCommitment: v.string(), status: v.union(v.literal('ACTIVE'),
      v.literal('CONSUMED'), v.literal('REVOKED'), v.literal('CLOSED'),
      v.literal('EXPIRED')),
    generation: v.number(), authorityExpiresAtUtc: v.string(),
    consumed: v.boolean(), revoked: v.boolean(), closed: v.boolean(), expired: v.boolean(),
  }),
}));

const retry = {
  applicationRetries: 0 as const, transportRetries: 0 as const, providerRetries: 0 as const,
  logicalOperationCalls: 1 as const, externalSideEffectsInsideTransaction: false as const,
  platformOccReexecutionPossible: true as const, atMostOneCommittedTransition: true as const,
};
type ResultCode = 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_EXPIRED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONFLICT';
type TransitionCode = 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED'
  | 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED';
const reject = (resultCode: ResultCode) => ({ sourceOnly: true as const, internalOnly: true as const,
  routeMounted: false as const, runtimeActivationAllowed: false as const,
  requestBodyAdmissionAuthorized: false as const, providerDispatchEnabled: false as const,
  ...retry, accepted: false as const, code: resultCode });
const accept = (resultCode: TransitionCode, record: any) => ({ sourceOnly: true as const,
  internalOnly: true as const, routeMounted: false as const,
  runtimeActivationAllowed: false as const, requestBodyAdmissionAuthorized: false as const,
  providerDispatchEnabled: false as const, ...retry, accepted: true as const,
  code: resultCode, authorityCommitment: record.authorityCommitment,
  requestCommitment: record.requestCommitment, generation: record.generation,
  replayed: false as const });
const parseUtc = parseCanonicalIssuedAtUtc;
const safeTime = (value: number) => Number.isSafeInteger(value) && value >= 0;
const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const output = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(output), byte => byte.toString(16).padStart(2, '0')).join('');
};
type Request = {
  schemaVersion: 1; issuerPrincipalCommitment: string; issuanceReference: string;
  approvalCommitment: string; baselineCommit: string; baselineTree: string;
  executionHeadCommit: string; executionHeadTree: string; runtimeDeploymentId: string;
  runtimeReceiptDigest: string; ownerCommitment: string; sessionCommitment: string;
  windowIdDigest: string; windowStartUtc: string; windowEndUtc: string;
  limitsCommitment: string; authorityExpiresAtUtc: string; sourceClosureSha256: string;
  sourceOwnershipSeparated: true; independentRuntimeIssuerCustodyBound: true;
};
const orderedRequest = (value: Request) => ({
  schemaVersion: value.schemaVersion,
  issuerPrincipalCommitment: value.issuerPrincipalCommitment,
  issuanceReference: value.issuanceReference,
  approvalCommitment: value.approvalCommitment,
  baselineCommit: value.baselineCommit,
  baselineTree: value.baselineTree,
  executionHeadCommit: value.executionHeadCommit,
  executionHeadTree: value.executionHeadTree,
  runtimeDeploymentId: value.runtimeDeploymentId,
  runtimeReceiptDigest: value.runtimeReceiptDigest,
  ownerCommitment: value.ownerCommitment,
  sessionCommitment: value.sessionCommitment,
  windowIdDigest: value.windowIdDigest,
  windowStartUtc: value.windowStartUtc,
  windowEndUtc: value.windowEndUtc,
  limitsCommitment: value.limitsCommitment,
  authorityExpiresAtUtc: value.authorityExpiresAtUtc,
  sourceClosureSha256: value.sourceClosureSha256,
  sourceOwnershipSeparated: value.sourceOwnershipSeparated,
  independentRuntimeIssuerCustodyBound: value.independentRuntimeIssuerCustodyBound,
});

async function validRequest(value: Request, requestCommitment: string) {
  const start = parseUtc(value.windowStartUtc);
  const end = parseUtc(value.windowEndUtc);
  const expires = parseUtc(value.authorityExpiresAtUtc);
  const principals = [value.issuerPrincipalCommitment, value.ownerCommitment,
    value.sessionCommitment];
  return value.schemaVersion === 1 && HEX.test(value.issuerPrincipalCommitment)
    && ID.test(value.issuanceReference) && HEX.test(value.approvalCommitment)
    && value.baselineCommit === BASELINE.commit && value.baselineTree === BASELINE.tree
    && COMMIT.test(value.executionHeadCommit) && COMMIT.test(value.executionHeadTree)
    && value.executionHeadCommit !== value.baselineCommit
    && ID.test(value.runtimeDeploymentId) && HEX.test(value.runtimeReceiptDigest)
    && HEX.test(value.ownerCommitment) && HEX.test(value.sessionCommitment)
    && new Set(principals).size === principals.length
    && HEX.test(value.windowIdDigest) && HEX.test(value.limitsCommitment)
    && HEX.test(value.sourceClosureSha256) && value.sourceOwnershipSeparated === true
    && value.independentRuntimeIssuerCustodyBound === true
    && Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(expires)
    && end > start && end - start <= MAXIMUM_WINDOW_MS && expires === end
    && HEX.test(requestCommitment)
    && requestCommitment === await sha256(JSON.stringify(orderedRequest(value)));
}

async function findExact(ctx: any, args: { verifierPrincipalCommitment: string;
  issuerPrincipalCommitment: string; authorityCommitment: string;
  requestCommitment: string }) {
  if (![args.verifierPrincipalCommitment, args.issuerPrincipalCommitment,
    args.authorityCommitment, args.requestCommitment].every(value => HEX.test(value))) return null;
  const record = await ctx.db.query('cadPackage8RuntimeIssuerAuthorities')
    .withIndex('by_authorityCommitment', (q: any) =>
      q.eq('authorityCommitment', args.authorityCommitment)).unique();
  return record && record.verifierPrincipalCommitment === args.verifierPrincipalCommitment
    && record.issuerPrincipalCommitment === args.issuerPrincipalCommitment
    && record.requestCommitment === args.requestCommitment ? record : null;
}

export const register = internalMutation({
  args: { verifierPrincipalCommitment: v.string(), authorityCommitment: v.string(),
    requestCommitment: v.string(), request, issuedAtUtc: v.string() },
  returns: transition,
  handler: async (ctx, args) => {
    const now = Date.now();
    const issuedAt = parseUtc(args.issuedAtUtc);
    const start = parseUtc(args.request.windowStartUtc);
    const end = parseUtc(args.request.windowEndUtc);
    if (!safeTime(now) || !HEX.test(args.verifierPrincipalCommitment)
      || args.verifierPrincipalCommitment === args.request.issuerPrincipalCommitment
      || args.verifierPrincipalCommitment === args.request.ownerCommitment
      || args.verifierPrincipalCommitment === args.request.sessionCommitment
      || !HEX.test(args.authorityCommitment)
      || !await validRequest(args.request, args.requestCommitment)
      || !Number.isFinite(issuedAt) || issuedAt < start || issuedAt > now
      || now - issuedAt > MAXIMUM_EVIDENCE_AGE_MS || now < start || now >= end) {
      return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED');
    }
    const [byAuthority, byRequest, byReference] = await Promise.all([
      ctx.db.query('cadPackage8RuntimeIssuerAuthorities')
        .withIndex('by_authorityCommitment', (q: any) =>
          q.eq('authorityCommitment', args.authorityCommitment)).unique(),
      ctx.db.query('cadPackage8RuntimeIssuerAuthorities')
        .withIndex('by_requestCommitment', (q: any) =>
          q.eq('requestCommitment', args.requestCommitment)).unique(),
      ctx.db.query('cadPackage8RuntimeIssuerAuthorities')
        .withIndex('by_issuanceReference', (q: any) =>
          q.eq('issuanceReference', args.request.issuanceReference)).unique(),
    ]);
    if (byAuthority || byRequest || byReference) {
      const exact = byAuthority && byRequest && byReference
        && byAuthority._id === byRequest._id && byAuthority._id === byReference._id;
      return reject(exact ? 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED'
        : 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONFLICT');
    }
    const record = { schemaVersion: 1 as const,
      verifierPrincipalCommitment: args.verifierPrincipalCommitment,
      issuerPrincipalCommitment: args.request.issuerPrincipalCommitment,
      issuanceReference: args.request.issuanceReference,
      approvalCommitment: args.request.approvalCommitment,
      authorityCommitment: args.authorityCommitment,
      requestCommitment: args.requestCommitment,
      request: orderedRequest(args.request), issuedAtMs: issuedAt,
      authorityExpiresAtMs: end, status: 'active' as const, generation: 1 };
    await ctx.db.insert('cadPackage8RuntimeIssuerAuthorities', record);
    return accept('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED', record);
  },
});

export const consume = internalMutation({
  args: { verifierPrincipalCommitment: v.string(), issuerPrincipalCommitment: v.string(),
    authorityCommitment: v.string(), requestCommitment: v.string() },
  returns: transition,
  handler: async (ctx, args) => {
    const record = await findExact(ctx, args);
    if (!record) return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED');
    const now = Date.now();
    if (!safeTime(now) || now < parseUtc(record.request.windowStartUtc)
      || now >= record.authorityExpiresAtMs) {
      return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_EXPIRED');
    }
    if (record.status !== 'active') {
      return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED');
    }
    const generation = record.generation + 1;
    await ctx.db.patch(record._id, { status: 'consumed', generation, consumedAtMs: now });
    return accept('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED', { ...record, generation });
  },
});

const terminalArgs = { verifierPrincipalCommitment: v.string(),
  issuerPrincipalCommitment: v.string(), authorityCommitment: v.string(),
  requestCommitment: v.string(), reasonDigest: v.string() };
const terminal = (status: 'revoked' | 'closed') => internalMutation({
  args: terminalArgs,
  returns: transition,
  handler: async (ctx, args) => {
    const record = await findExact(ctx, args);
    if (!record || !HEX.test(args.reasonDigest)) {
      return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED');
    }
    if (record.status === status || record.status === 'closed') {
      return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED');
    }
    const now = Date.now();
    if (!safeTime(now)) return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED');
    const generation = record.generation + 1;
    await ctx.db.patch(record._id, { status, generation, reasonDigest: args.reasonDigest,
      ...(status === 'revoked' ? { revokedAtMs: now } : { closedAtMs: now }) });
    return accept(status === 'revoked' ? 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED'
      : 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED', { ...record, generation });
  },
});
export const revoke = terminal('revoked');
export const close = terminal('closed');

export const readSanitized = internalQuery({
  args: { verifierPrincipalCommitment: v.string(), issuerPrincipalCommitment: v.string(),
    authorityCommitment: v.string(), requestCommitment: v.string() },
  returns: readResult,
  handler: async (ctx, args) => {
    const record = await findExact(ctx, args);
    if (!record) return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED');
    const now = Date.now();
    if (!safeTime(now)) return reject('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED');
    const expired = now >= record.authorityExpiresAtMs;
    const status = expired && record.status === 'active' ? 'EXPIRED' as const
      : record.status.toUpperCase() as 'ACTIVE' | 'CONSUMED' | 'REVOKED' | 'CLOSED';
    return { sourceOnly: true as const, internalOnly: true as const,
      routeMounted: false as const, runtimeActivationAllowed: false as const,
      requestBodyAdmissionAuthorized: false as const, providerDispatchEnabled: false as const,
      ...retry, accepted: true as const,
      code: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIED' as const,
      evidence: { schemaVersion: 1 as const, authorityCommitment: record.authorityCommitment,
        requestCommitment: record.requestCommitment,
        issuanceReference: record.issuanceReference,
        approvalCommitment: record.approvalCommitment, status,
        generation: record.generation,
        authorityExpiresAtUtc: new Date(record.authorityExpiresAtMs).toISOString(),
        consumed: record.consumedAtMs !== undefined, revoked: record.revokedAtMs !== undefined,
        closed: record.status === 'closed', expired } };
  },
});
