import { internalMutation } from '../convex/_generated/server';
import { internal } from '../convex/_generated/api';
import { v } from 'convex/values';
export const fail = internalMutation({ args: {}, returns: v.null(), handler: async ctx => {
  await ctx.runMutation(internal.ledger.debit, { feature: 'analyze', key: 'rollback', requestHash: 'a'.repeat(64) });
  throw new Error('SYNTHETIC_COMMIT_FAILURE');
} });
