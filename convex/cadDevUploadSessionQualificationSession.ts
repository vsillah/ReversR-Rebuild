import { getAuthSessionId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { query } from './_generated/server';
import { cadDevUploadSessionQualificationBinding } from './cadDevUploadSessionQualificationBinding';
import { readExactLibrarySession } from './librarySession';

const exactSession = v.object({
  userId: v.id('users'),
  loginSessionId: v.id('authSessions'),
  authMethod: v.literal('password'),
  expiresAt: v.number(),
  active: v.boolean(),
});

const hex = (value: string) => /^[a-f0-9]{64}$/.test(value);

function guard(args: {
  runKeySha256: string;
  acceptedProjectionSha256: string;
  acceptanceReceiptSha256: string;
  validThrough: number;
}) {
  const binding = cadDevUploadSessionQualificationBinding;
  const run = binding.run;
  if (!binding.enabled || run.runKeySha256 === null || run.acceptedProjectionSha256 === null
    || run.acceptanceReceiptSha256 === null || run.windowStartMs === null || run.windowEndMs === null) {
    throw new Error('QUALIFICATION_SESSION_DISABLED');
  }
  if (!hex(args.runKeySha256) || args.runKeySha256 !== run.runKeySha256
    || args.acceptedProjectionSha256 !== run.acceptedProjectionSha256
    || args.acceptanceReceiptSha256 !== run.acceptanceReceiptSha256) {
    throw new Error('QUALIFICATION_SESSION_DENIED');
  }
  const now = Date.now();
  if (!Number.isSafeInteger(now) || now < run.windowStartMs || now >= run.windowEndMs
    || run.windowEndMs <= run.windowStartMs
    || run.windowEndMs > run.windowStartMs + binding.constraints.maxWindowMs) {
    throw new Error('QUALIFICATION_SESSION_WINDOW_CLOSED');
  }
  if (!Number.isSafeInteger(args.validThrough) || args.validThrough < now
    || args.validThrough > Math.min(run.windowEndMs, now + binding.constraints.maxOperationBudgetMs)) {
    throw new Error('QUALIFICATION_SESSION_DEADLINE_INVALID');
  }
}

export const readCurrent = query({
  args: {
    runKeySha256: v.string(),
    acceptedProjectionSha256: v.string(),
    acceptanceReceiptSha256: v.string(),
    validThrough: v.number(),
  },
  returns: v.union(exactSession, v.null()),
  handler: async (ctx, args) => {
    guard(args);
    const loginSessionId = await getAuthSessionId(ctx);
    if (!loginSessionId) return null;
    return readExactLibrarySession(ctx, loginSessionId, args.validThrough);
  },
});
