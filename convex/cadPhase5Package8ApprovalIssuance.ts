// Internal-only, source-disabled Package 8 approval issuance ledger.
// No public query/mutation/action or HTTP route imports these functions.
import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import {
  package8ApprovalLimits,
  package8ApprovalRuntimeDeployment,
  package8ApprovalSourceReview,
  package8ApprovalVerificationRequest,
} from './schema';

const BASELINE = {
  commit: '1512dedb5c240765bf87c749e07ed2f6709ec5b1',
  tree: 'a1378dc31e79690fcc717f2414b39074133773a5',
  productionDeployment: 'dpl_7LvYWCimHGDd2TK7i9qGiYutv1ut',
  preparation: '024e183dd84087fe9c6d685a59dda95d14ea1b1f4b3f63b590b8fa73aaed69eb',
  unissuedDraft: '647d4c500bf79904c1c139cb015f759600437e76d51f97e284120b22dbed514f',
} as const;
const LIMITS = {
  schemaVersion: 1 as const,
  maximumSessions: 1 as const,
  maximumFiles: 1 as const,
  maximumAttempts: 1 as const,
  maximumRetries: 0 as const,
  maximumWindowMs: 15 * 60_000,
  maximumCostMicrosExclusive: 9_000_000,
  reservationMicros: 8_999_999,
  currency: 'USD' as const,
};
const MAXIMUM_EVIDENCE_AGE_MS = 120_000;
const RETRY_SEMANTICS = {
  applicationRetries: 0 as const,
  transportRetries: 0 as const,
  providerRetries: 0 as const,
  logicalOperationCalls: 1 as const,
  externalSideEffectsInsideTransaction: false as const,
  platformOccReexecutionPossible: true as const,
  atMostOneCommittedTransition: true as const,
};
const HEX = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const verificationRequest = v.object(package8ApprovalVerificationRequest);
const sourceReview = v.object(package8ApprovalSourceReview);
const runtimeDeployment = v.object(package8ApprovalRuntimeDeployment);
const limits = v.object(package8ApprovalLimits);
const issueCommand = v.object({
  schemaVersion: v.literal(1), issuerPrincipalDigest: v.string(), request: verificationRequest,
  sourceReview, runtimeDeployment, limits, calculatedMaximumCostMicros: v.number(),
  issuedAtUtc: v.string(),
});
const receipt = v.object({
  ...package8ApprovalVerificationRequest,
  verified: v.literal(true), status: v.literal('ISSUED_ACTIVE_ONE_USE'),
  revoked: v.literal(false), consumed: v.literal(false), receiptDigest: v.string(),
});
const baseResult = {
  sourceOnly: v.literal(true), internalOnly: v.literal(true), routeMounted: v.literal(false),
  runtimeActivationAllowed: v.literal(false), sessionIssuanceEnabled: v.literal(false),
  requestBodyAdmissionAuthorized: v.literal(false), providerDispatchEnabled: v.literal(false),
  applicationRetries: v.literal(0), transportRetries: v.literal(0),
  providerRetries: v.literal(0), logicalOperationCalls: v.literal(1),
  externalSideEffectsInsideTransaction: v.literal(false),
  platformOccReexecutionPossible: v.literal(true),
  atMostOneCommittedTransition: v.literal(true),
};
const resultCode = v.union(
  v.literal('PACKAGE8_APPROVAL_ISSUED'), v.literal('PACKAGE8_APPROVAL_VERIFIED'),
  v.literal('PACKAGE8_APPROVAL_CONSUMED'), v.literal('PACKAGE8_APPROVAL_REVOKED'),
  v.literal('PACKAGE8_APPROVAL_CLOSED'), v.literal('PACKAGE8_APPROVAL_DENIED'),
  v.literal('PACKAGE8_APPROVAL_EXPIRED'), v.literal('PACKAGE8_APPROVAL_REPLAYED'),
  v.literal('PACKAGE8_APPROVAL_CONFLICT'),
);
const transitionCode = v.union(
  v.literal('PACKAGE8_APPROVAL_ISSUED'), v.literal('PACKAGE8_APPROVAL_CONSUMED'),
  v.literal('PACKAGE8_APPROVAL_REVOKED'), v.literal('PACKAGE8_APPROVAL_CLOSED'),
);
const transitionStatus = v.union(
  v.literal('ISSUED_ACTIVE_ONE_USE'), v.literal('ISSUED_CONSUMED_ONE_USE'),
  v.literal('ISSUED_REVOKED'), v.literal('ISSUED_CLOSED'),
);
const deniedResult = v.object({ ...baseResult, accepted: v.literal(false), code: resultCode });
const transitionResult = v.union(deniedResult, v.object({
  ...baseResult, accepted: v.literal(true), code: transitionCode, issuanceReference: v.string(),
  approvalCommitment: v.string(), status: transitionStatus, generation: v.number(),
  receiptDigest: v.optional(v.string()), consumptionReceiptDigest: v.optional(v.string()),
}));
const verifyResult = v.union(deniedResult, v.object({
  ...baseResult, accepted: v.literal(true), code: v.literal('PACKAGE8_APPROVAL_VERIFIED'),
  receipt,
}));
const evidence = v.object({
  schemaVersion: v.literal(1), issuanceReference: v.string(), approvalCommitment: v.string(),
  status: v.union(v.literal('ISSUED_ACTIVE'), v.literal('ISSUED_CONSUMED'),
    v.literal('ISSUED_REVOKED'), v.literal('ISSUED_CLOSED'), v.literal('ISSUED_EXPIRED')),
  generation: v.number(), issuedAtUtc: v.string(),
  authorityExpiresAtUtc: v.string(), windowIdDigest: v.string(), runtimeDeploymentId: v.string(),
  receiptDigest: v.string(), consumptionReceiptDigest: v.union(v.string(), v.null()),
  revoked: v.boolean(), consumed: v.boolean(), closed: v.boolean(), expired: v.boolean(),
});
const readResult = v.union(deniedResult, v.object({
  ...baseResult, accepted: v.literal(true), code: v.literal('PACKAGE8_APPROVAL_VERIFIED'),
  evidence,
}));

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};
const safeTime = (value: number) => Number.isSafeInteger(value) && value >= 0;
const parseUtc = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ? Date.parse(value) : NaN;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
type ResultCode = 'PACKAGE8_APPROVAL_ISSUED' | 'PACKAGE8_APPROVAL_VERIFIED'
  | 'PACKAGE8_APPROVAL_CONSUMED' | 'PACKAGE8_APPROVAL_REVOKED'
  | 'PACKAGE8_APPROVAL_CLOSED' | 'PACKAGE8_APPROVAL_DENIED'
  | 'PACKAGE8_APPROVAL_EXPIRED' | 'PACKAGE8_APPROVAL_REPLAYED'
  | 'PACKAGE8_APPROVAL_CONFLICT';
type AcceptedCode = 'PACKAGE8_APPROVAL_ISSUED' | 'PACKAGE8_APPROVAL_VERIFIED'
  | 'PACKAGE8_APPROVAL_CONSUMED' | 'PACKAGE8_APPROVAL_REVOKED'
  | 'PACKAGE8_APPROVAL_CLOSED';
const denied = (code: ResultCode) => ({ sourceOnly: true as const, internalOnly: true as const,
  routeMounted: false as const, runtimeActivationAllowed: false as const,
  sessionIssuanceEnabled: false as const, requestBodyAdmissionAuthorized: false as const,
  providerDispatchEnabled: false as const, ...RETRY_SEMANTICS,
  accepted: false as const, code });
const accepted = <T extends AcceptedCode>(code: T) => ({ sourceOnly: true as const, internalOnly: true as const,
  routeMounted: false as const, runtimeActivationAllowed: false as const,
  sessionIssuanceEnabled: false as const, requestBodyAdmissionAuthorized: false as const,
  providerDispatchEnabled: false as const, ...RETRY_SEMANTICS,
  accepted: true as const, code });

type Request = {
  schemaVersion: 1; issuanceReference: string; approvalCommitment: string;
  baselineCommit: string; baselineTree: string; executionHeadCommit: string;
  executionHeadTree: string; runtimeDeploymentId: string; runtimeReceiptDigest: string;
  ownerCommitment: string; sessionCommitment: string; windowIdDigest: string;
  windowStartUtc: string; windowEndUtc: string; limitsCommitment: string;
  authorityExpiresAtUtc: string;
};
type SourceReview = {
  schemaVersion: 1; baselineCommit: string; baselineTree: string;
  executionHeadCommit: string; executionHeadTree: string; clean: true;
  descendantOfBaseline: true; ancestryReceiptDigest: string;
  productionEvidenceDeploymentId: string; preparationSha256: string;
  unissuedDraftSha256: string;
};
type RuntimeDeployment = {
  schemaVersion: 1; deploymentId: string; state: 'READY'; environment: 'development';
  commit: string; tree: string; functionEquivalence: 'VERIFIED_EXACT'; receiptDigest: string;
};

function orderedRequest(request: Request) {
  return {
    schemaVersion: request.schemaVersion,
    issuanceReference: request.issuanceReference,
    approvalCommitment: request.approvalCommitment,
    baselineCommit: request.baselineCommit,
    baselineTree: request.baselineTree,
    executionHeadCommit: request.executionHeadCommit,
    executionHeadTree: request.executionHeadTree,
    runtimeDeploymentId: request.runtimeDeploymentId,
    runtimeReceiptDigest: request.runtimeReceiptDigest,
    ownerCommitment: request.ownerCommitment,
    sessionCommitment: request.sessionCommitment,
    windowIdDigest: request.windowIdDigest,
    windowStartUtc: request.windowStartUtc,
    windowEndUtc: request.windowEndUtc,
    limitsCommitment: request.limitsCommitment,
    authorityExpiresAtUtc: request.authorityExpiresAtUtc,
  };
}

async function expectedReceipt(request: Request) {
  const core = { ...orderedRequest(request), verified: true as const,
    status: 'ISSUED_ACTIVE_ONE_USE' as const, revoked: false as const, consumed: false as const };
  return { ...core, receiptDigest: await sha256(JSON.stringify(core)) };
}

async function validRequest(request: Request) {
  const start = parseUtc(request.windowStartUtc);
  const end = parseUtc(request.windowEndUtc);
  const expires = parseUtc(request.authorityExpiresAtUtc);
  return request.schemaVersion === 1 && ID.test(request.issuanceReference)
    && HEX.test(request.approvalCommitment)
    && request.baselineCommit === BASELINE.commit && request.baselineTree === BASELINE.tree
    && COMMIT.test(request.executionHeadCommit) && COMMIT.test(request.executionHeadTree)
    && request.executionHeadCommit !== request.baselineCommit
    && ID.test(request.runtimeDeploymentId) && HEX.test(request.runtimeReceiptDigest)
    && HEX.test(request.ownerCommitment) && HEX.test(request.sessionCommitment)
    && request.ownerCommitment !== request.sessionCommitment
    && HEX.test(request.windowIdDigest) && HEX.test(request.limitsCommitment)
    && request.limitsCommitment === await sha256(JSON.stringify(LIMITS))
    && Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(expires)
    && end > start && end - start <= LIMITS.maximumWindowMs && expires === end;
}

async function validSourceReview(value: SourceReview, request: Request) {
  const expected = await sha256([
    BASELINE.commit, BASELINE.tree, value.executionHeadCommit, value.executionHeadTree,
    'clean-descendant',
  ].join('|'));
  return value.schemaVersion === 1 && value.baselineCommit === BASELINE.commit
    && value.baselineTree === BASELINE.tree
    && value.executionHeadCommit === request.executionHeadCommit
    && value.executionHeadTree === request.executionHeadTree
    && value.clean === true && value.descendantOfBaseline === true
    && value.ancestryReceiptDigest === expected
    && value.productionEvidenceDeploymentId === BASELINE.productionDeployment
    && value.preparationSha256 === BASELINE.preparation
    && value.unissuedDraftSha256 === BASELINE.unissuedDraft;
}

async function validRuntime(value: RuntimeDeployment, request: Request) {
  const expected = await sha256([
    value.deploymentId, value.state, value.environment, value.commit, value.tree,
    value.functionEquivalence,
  ].join('|'));
  return value.schemaVersion === 1 && value.deploymentId === request.runtimeDeploymentId
    && value.state === 'READY' && value.environment === 'development'
    && value.commit === request.executionHeadCommit && value.tree === request.executionHeadTree
    && value.functionEquivalence === 'VERIFIED_EXACT'
    && value.receiptDigest === request.runtimeReceiptDigest && value.receiptDigest === expected;
}

async function findExact(ctx: any, issuerPrincipalDigest: string, request: Request) {
  if (!HEX.test(issuerPrincipalDigest) || !await validRequest(request)) return null;
  const record = await ctx.db.query('cadPackage8ApprovalIssuances')
    .withIndex('by_issuanceReference', (q: any) => q.eq('issuanceReference', request.issuanceReference))
    .unique();
  if (!record || record.issuerPrincipalDigest !== issuerPrincipalDigest
    || record.approvalCommitment !== request.approvalCommitment
    || !same(record.request, orderedRequest(request))) return null;
  return record;
}

export const issue = internalMutation({
  args: { issuerPrincipalDigest: v.string(), command: issueCommand },
  returns: transitionResult,
  handler: async (ctx, { issuerPrincipalDigest, command }) => {
    const request = orderedRequest(command.request);
    const now = Date.now();
    const issuedAt = parseUtc(command.issuedAtUtc);
    const start = parseUtc(request.windowStartUtc);
    const end = parseUtc(request.windowEndUtc);
    if (!safeTime(now) || !HEX.test(issuerPrincipalDigest)
      || command.issuerPrincipalDigest !== issuerPrincipalDigest
      || issuerPrincipalDigest === request.ownerCommitment
      || issuerPrincipalDigest === request.sessionCommitment
      || !await validRequest(request)
      || !await validSourceReview(command.sourceReview, request)
      || !await validRuntime(command.runtimeDeployment, request)
      || !same(command.limits, LIMITS)
      || !Number.isSafeInteger(command.calculatedMaximumCostMicros)
      || command.calculatedMaximumCostMicros < 0
      || command.calculatedMaximumCostMicros >= LIMITS.maximumCostMicrosExclusive
      || !Number.isFinite(issuedAt) || issuedAt < start || issuedAt > now
      || now - issuedAt > MAXIMUM_EVIDENCE_AGE_MS || now < start || now >= end) {
      return denied('PACKAGE8_APPROVAL_DENIED');
    }
    const priorByReference = await ctx.db.query('cadPackage8ApprovalIssuances')
      .withIndex('by_issuanceReference', q => q.eq('issuanceReference', request.issuanceReference))
      .unique();
    const priorByCommitment = await ctx.db.query('cadPackage8ApprovalIssuances')
      .withIndex('by_approvalCommitment', q => q.eq('approvalCommitment', request.approvalCommitment))
      .unique();
    if (priorByReference || priorByCommitment) {
      const exactReplay = priorByReference && priorByCommitment
        && priorByReference._id === priorByCommitment._id
        && priorByReference.issuanceReference === request.issuanceReference
        && priorByReference.approvalCommitment === request.approvalCommitment;
      return denied(exactReplay
        ? 'PACKAGE8_APPROVAL_REPLAYED' : 'PACKAGE8_APPROVAL_CONFLICT');
    }
    const issuanceReceipt = await expectedReceipt(request);
    await ctx.db.insert('cadPackage8ApprovalIssuances', {
      schemaVersion: 1, issuerPrincipalDigest, issuanceReference: request.issuanceReference,
      approvalCommitment: request.approvalCommitment, request,
      sourceReview: command.sourceReview, runtimeDeployment: command.runtimeDeployment,
      limits: command.limits, calculatedMaximumCostMicros: command.calculatedMaximumCostMicros,
      issuedAtMs: issuedAt, authorityExpiresAtMs: end, windowStartMs: start, windowEndMs: end,
      receiptDigest: issuanceReceipt.receiptDigest, status: 'active', generation: 1,
    });
    return { ...accepted('PACKAGE8_APPROVAL_ISSUED'),
      issuanceReference: request.issuanceReference,
      approvalCommitment: request.approvalCommitment,
      status: 'ISSUED_ACTIVE_ONE_USE' as const, generation: 1,
      receiptDigest: issuanceReceipt.receiptDigest };
  },
});

export const verify = internalQuery({
  args: { issuerPrincipalDigest: v.string(), request: verificationRequest },
  returns: verifyResult,
  handler: async (ctx, { issuerPrincipalDigest, request }) => {
    const record = await findExact(ctx, issuerPrincipalDigest, request);
    if (!record) return denied('PACKAGE8_APPROVAL_DENIED');
    const now = Date.now();
    if (!safeTime(now) || now < record.windowStartMs || now >= record.authorityExpiresAtMs) {
      return denied('PACKAGE8_APPROVAL_EXPIRED');
    }
    if (record.status !== 'active') return denied(record.status === 'consumed'
      ? 'PACKAGE8_APPROVAL_REPLAYED' : 'PACKAGE8_APPROVAL_DENIED');
    const issuanceReceipt = await expectedReceipt(request);
    if (issuanceReceipt.receiptDigest !== record.receiptDigest) {
      return denied('PACKAGE8_APPROVAL_DENIED');
    }
    return { ...accepted('PACKAGE8_APPROVAL_VERIFIED'), receipt: issuanceReceipt };
  },
});

export const consume = internalMutation({
  args: { issuerPrincipalDigest: v.string(), request: verificationRequest },
  returns: transitionResult,
  handler: async (ctx, { issuerPrincipalDigest, request }) => {
    const record = await findExact(ctx, issuerPrincipalDigest, request);
    if (!record) return denied('PACKAGE8_APPROVAL_DENIED');
    const now = Date.now();
    if (!safeTime(now) || now < record.windowStartMs || now >= record.authorityExpiresAtMs) {
      return denied('PACKAGE8_APPROVAL_EXPIRED');
    }
    if (record.status !== 'active') return denied(record.status === 'consumed'
      ? 'PACKAGE8_APPROVAL_REPLAYED' : 'PACKAGE8_APPROVAL_DENIED');
    const generation = record.generation + 1;
    const consumptionReceiptDigest = await sha256([
      record.receiptDigest, record.issuanceReference, record.approvalCommitment,
      String(now), String(generation), 'ISSUED_CONSUMED_ONE_USE',
    ].join('|'));
    await ctx.db.patch(record._id, { status: 'consumed', generation,
      consumedAtMs: now, consumptionReceiptDigest });
    return { ...accepted('PACKAGE8_APPROVAL_CONSUMED'),
      issuanceReference: record.issuanceReference,
      approvalCommitment: record.approvalCommitment,
      status: 'ISSUED_CONSUMED_ONE_USE' as const, generation, consumptionReceiptDigest };
  },
});

export const revoke = internalMutation({
  args: { issuerPrincipalDigest: v.string(), issuanceReference: v.string(),
    approvalCommitment: v.string(), reasonDigest: v.string() },
  returns: transitionResult,
  handler: async (ctx, args) => {
    if (!HEX.test(args.issuerPrincipalDigest) || !ID.test(args.issuanceReference)
      || !HEX.test(args.approvalCommitment) || !HEX.test(args.reasonDigest)) {
      return denied('PACKAGE8_APPROVAL_DENIED');
    }
    const record = await ctx.db.query('cadPackage8ApprovalIssuances')
      .withIndex('by_issuanceReference', q => q.eq('issuanceReference', args.issuanceReference))
      .unique();
    if (!record || record.issuerPrincipalDigest !== args.issuerPrincipalDigest
      || record.approvalCommitment !== args.approvalCommitment) {
      return denied('PACKAGE8_APPROVAL_DENIED');
    }
    if (record.status === 'revoked' || record.status === 'closed') {
      return denied('PACKAGE8_APPROVAL_REPLAYED');
    }
    const now = Date.now();
    if (!safeTime(now)) return denied('PACKAGE8_APPROVAL_DENIED');
    const generation = record.generation + 1;
    await ctx.db.patch(record._id, { status: 'revoked', generation,
      revokedAtMs: now, reasonDigest: args.reasonDigest });
    return { ...accepted('PACKAGE8_APPROVAL_REVOKED'),
      issuanceReference: record.issuanceReference,
      approvalCommitment: record.approvalCommitment,
      status: 'ISSUED_REVOKED' as const, generation };
  },
});

export const close = internalMutation({
  args: { issuerPrincipalDigest: v.string(), issuanceReference: v.string(),
    approvalCommitment: v.string(), reasonDigest: v.string() },
  returns: transitionResult,
  handler: async (ctx, args) => {
    if (!HEX.test(args.issuerPrincipalDigest) || !ID.test(args.issuanceReference)
      || !HEX.test(args.approvalCommitment) || !HEX.test(args.reasonDigest)) {
      return denied('PACKAGE8_APPROVAL_DENIED');
    }
    const record = await ctx.db.query('cadPackage8ApprovalIssuances')
      .withIndex('by_issuanceReference', q => q.eq('issuanceReference', args.issuanceReference))
      .unique();
    if (!record || record.issuerPrincipalDigest !== args.issuerPrincipalDigest
      || record.approvalCommitment !== args.approvalCommitment) {
      return denied('PACKAGE8_APPROVAL_DENIED');
    }
    if (record.status === 'closed') return denied('PACKAGE8_APPROVAL_REPLAYED');
    const now = Date.now();
    if (!safeTime(now)) return denied('PACKAGE8_APPROVAL_DENIED');
    const generation = record.generation + 1;
    await ctx.db.patch(record._id, { status: 'closed', generation,
      closedAtMs: now, reasonDigest: args.reasonDigest });
    return { ...accepted('PACKAGE8_APPROVAL_CLOSED'),
      issuanceReference: record.issuanceReference,
      approvalCommitment: record.approvalCommitment,
      status: 'ISSUED_CLOSED' as const, generation };
  },
});

export const readSanitized = internalQuery({
  args: { issuerPrincipalDigest: v.string(), issuanceReference: v.string(),
    approvalCommitment: v.string() },
  returns: readResult,
  handler: async (ctx, args) => {
    if (!HEX.test(args.issuerPrincipalDigest) || !ID.test(args.issuanceReference)
      || !HEX.test(args.approvalCommitment)) return denied('PACKAGE8_APPROVAL_DENIED');
    const record = await ctx.db.query('cadPackage8ApprovalIssuances')
      .withIndex('by_issuanceReference', q => q.eq('issuanceReference', args.issuanceReference))
      .unique();
    if (!record || record.issuerPrincipalDigest !== args.issuerPrincipalDigest
      || record.approvalCommitment !== args.approvalCommitment) {
      return denied('PACKAGE8_APPROVAL_DENIED');
    }
    const now = Date.now();
    if (!safeTime(now)) return denied('PACKAGE8_APPROVAL_DENIED');
    const expired = now >= record.authorityExpiresAtMs;
    const status = expired && record.status === 'active' ? 'ISSUED_EXPIRED' as const
      : ({ active: 'ISSUED_ACTIVE', consumed: 'ISSUED_CONSUMED',
        revoked: 'ISSUED_REVOKED', closed: 'ISSUED_CLOSED' } as const)[record.status];
    return { ...accepted('PACKAGE8_APPROVAL_VERIFIED'), evidence: {
      schemaVersion: 1 as const, issuanceReference: record.issuanceReference,
      approvalCommitment: record.approvalCommitment, status, generation: record.generation,
      issuedAtUtc: new Date(record.issuedAtMs).toISOString(),
      authorityExpiresAtUtc: new Date(record.authorityExpiresAtMs).toISOString(),
      windowIdDigest: record.request.windowIdDigest,
      runtimeDeploymentId: record.request.runtimeDeploymentId,
      receiptDigest: record.receiptDigest,
      consumptionReceiptDigest: record.consumptionReceiptDigest ?? null,
      revoked: record.status === 'revoked', consumed: record.status === 'consumed',
      closed: record.status === 'closed', expired,
    } };
  },
});
