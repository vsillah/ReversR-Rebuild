import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import {
  grantBinding,
  independentContinuityEvidence,
  operation,
  sourceClosedResult,
  stopReason,
} from './cadControlledUploadSchema';
import {
  applyCandidateTransaction,
  readCandidateReceipt,
  readCandidateState,
} from './cadControlledUploadStore';
import {
  persistRestrictionCandidate,
  projectAuthenticatedAuthorityCandidate,
  registerGrantCandidate,
} from './cadControlledUploadContinuityStore';
import {
  verifyIndependentReceipt,
  verifyIndependentSmoke,
} from '../offline/cad-convex/controlledUploadHostBridge';

type SourceClosedResult = {
  code: string;
  sourceOnly: true;
  modelAccepted: boolean;
  hostQualified: false;
  bodyAdmissionAuthorized: false;
  liveReady: false;
  costs: 0;
  candidateWritten?: boolean;
  metadataMatches?: boolean;
  statePresent?: boolean;
  receiptPresent?: boolean;
  revision?: number;
  resultDigest?: string;
  runSpent?: boolean;
  attemptSpent?: boolean;
  rollbackArmed?: boolean;
  fenceOpenedOnce?: boolean;
  fenceOpen?: boolean;
  consumed?: boolean;
  closed?: boolean;
  revoked?: boolean;
  unknown?: boolean;
  permanentStop?: boolean;
  recoveryState?: 'pending' | 'closed-revoked' | 'verified' | 'unknown';
  stopReason?: 'unknown' | 'clock-regression' | 'restore' | 'duplicate' | 'revoked' | 'expired';
};

const closed = (code: string): SourceClosedResult => ({
  code,
  sourceOnly: true,
  modelAccepted: false,
  hostQualified: false,
  bodyAdmissionAuthorized: false,
  liveReady: false,
  costs: 0,
});

function sanitizeResult(value: unknown): SourceClosedResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return closed('CONTROLLED_HOST_RESULT_INVALID');
  const input = value as Record<string, unknown>;
  const result: SourceClosedResult = {
    ...closed(typeof input.code === 'string' ? input.code : 'CONTROLLED_HOST_RESULT_INVALID'),
    modelAccepted: input.modelAccepted === true,
  };
  if (typeof input.candidateWritten === 'boolean') result.candidateWritten = input.candidateWritten;
  if (typeof input.metadataMatches === 'boolean') result.metadataMatches = input.metadataMatches;
  if (typeof input.stopReason === 'string'
    && ['unknown', 'clock-regression', 'restore', 'duplicate', 'revoked', 'expired'].includes(input.stopReason)) {
    result.stopReason = input.stopReason as SourceClosedResult['stopReason'];
  }
  return result;
}

// Registration remains unreachable in production because the fixed independent
// approval verifier returns null. This function is internal-only and cannot be
// called by a client or HTTP route.
export const registerApprovedGrantAndScope = internalMutation({
  args: {
    binding: grantBinding,
    principalKey: v.string(),
    evidence: independentContinuityEvidence,
    requestNonceDigest: v.string(),
  },
  returns: sourceClosedResult,
  handler: async (ctx, args) => sanitizeResult(await registerGrantCandidate(ctx.db, args, Date.now())),
});

export const projectAuthenticatedAuthority = internalMutation({
  args: {
    binding: grantBinding,
    principalKey: v.string(),
    evidence: independentContinuityEvidence,
  },
  returns: sourceClosedResult,
  handler: async (ctx, args) => sanitizeResult(await projectAuthenticatedAuthorityCandidate(ctx.db, args, Date.now())),
});

export const transact = internalMutation({
  args: {
    scopeKey: v.string(),
    principalKey: v.string(),
    operation,
    bindingDigest: v.string(),
    expectedRevision: v.number(),
    requestNonceDigest: v.string(),
    expectedPrincipalGeneration: v.number(),
    custodyEpochDigest: v.string(),
  },
  returns: sourceClosedResult,
  handler: async (ctx, args) => {
    const { scopeKey, principalKey, ...command } = args;
    return sanitizeResult(await applyCandidateTransaction(ctx.db, { scopeKey, principalKey, command }, Date.now()));
  },
});

// Restrictive recovery is the only registered operation that may commit without
// independent forward authority. It can only close/revoke an existing slot.
export const persistRestriction = internalMutation({
  args: {
    scopeKey: v.string(),
    reason: stopReason,
    clockObservation: v.union(v.number(), v.null()),
  },
  returns: sourceClosedResult,
  handler: async (ctx, args) => sanitizeResult(await persistRestrictionCandidate(ctx.db, args)),
});

export const readState = internalQuery({
  args: { scopeKey: v.string() },
  returns: sourceClosedResult,
  handler: async (ctx, args) => {
    try {
      const state = await readCandidateState(ctx.db, args.scopeKey);
      if (!state) return { ...closed('CONTROLLED_HOST_STATE_MISSING'), statePresent: false };
      return {
        ...closed('CONTROLLED_HOST_STATE_PRESENT'),
        statePresent: true,
        revision: state.scope.revision,
        runSpent: state.scope.runSpent,
        attemptSpent: state.attempt?.attemptSpent ?? false,
        rollbackArmed: state.attempt?.rollbackArmed ?? false,
        fenceOpenedOnce: state.attempt?.fenceOpenedOnce ?? false,
        fenceOpen: state.attempt?.fenceOpen ?? false,
        consumed: state.attempt?.consumed ?? false,
        closed: state.attempt?.closed ?? false,
        revoked: state.scope.revoked,
        unknown: state.attempt?.unknown ?? false,
        permanentStop: state.scope.permanentStop,
        ...(state.attempt ? { recoveryState: state.attempt.recoveryState } : {}),
        ...(state.scope.stopReason ? { stopReason: state.scope.stopReason } : {}),
      };
    } catch {
      return closed('CONTROLLED_HOST_STATE_INVALID');
    }
  },
});

export const readReceipt = internalQuery({
  args: { operationKey: v.string() },
  returns: sourceClosedResult,
  handler: async (ctx, args) => {
    try {
      const receipt = await readCandidateReceipt(ctx.db, args.operationKey);
      if (!receipt) return { ...closed('CONTROLLED_HOST_RECEIPT_MISSING'), receiptPresent: false };
      const verified = verifyIndependentReceipt(receipt);
      return {
        ...sanitizeResult(verified),
        code: 'CONTROLLED_HOST_RECEIPT_PRESENT_UNVERIFIED',
        receiptPresent: true,
        revision: receipt.revision,
        resultDigest: receipt.resultDigest,
      };
    } catch {
      return closed('CONTROLLED_HOST_RECEIPT_INVALID');
    }
  },
});

// No evidence row is written until a separately reviewed independent smoke
// verifier exists. A digest by itself cannot qualify a smoke result.
export const recordIndependentSmoke = internalMutation({
  args: { evidenceKey: v.string() },
  returns: sourceClosedResult,
  handler: async (_ctx, args) => sanitizeResult(verifyIndependentSmoke(args.evidenceKey)),
});
