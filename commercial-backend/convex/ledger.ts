import { v, ConvexError } from 'convex/values';
import { internalMutation } from './_generated/server';
import { membership } from './session';
import { costs, credits } from './catalog';

export const debit = internalMutation({
  args: { feature: v.string(), key: v.string(), requestHash: v.string() },
  returns: v.object({ used: v.number(), remaining: v.number(), duplicate: v.boolean() }),
  handler: async (ctx, args) => {
    const { user, shop } = await membership(ctx);
    if (!Object.hasOwn(costs, args.feature) || !args.key || args.key.length > 200 || !/^[a-f0-9]{64}$/.test(args.requestHash)) throw new ConvexError('INVALID_DEBIT');
    const rule = credits(shop.planId);
    const period = await ctx.db.query('creditPeriods').withIndex('by_shopId_and_periodKey', q => q.eq('shopId', shop._id).eq('periodKey', rule.key)).unique();
    const previous = await ctx.db.query('creditEvents').withIndex('by_shopId_and_periodKey_and_feature_and_key', q => q.eq('shopId', shop._id).eq('periodKey', rule.key).eq('feature', args.feature).eq('key', args.key)).unique();
    const used = period?.used || 0;
    if (previous) {
      if (previous.requestHash !== args.requestHash) throw new ConvexError('IDEMPOTENCY_CONFLICT');
      return { used, remaining: Math.max(0, rule.limit - used), duplicate: true };
    }
    const cost = costs[args.feature];
    if (used + cost > rule.limit) throw new ConvexError('CREDITS_EXHAUSTED');
    if (period) await ctx.db.patch(period._id, { used: used + cost });
    else await ctx.db.insert('creditPeriods', { shopId: shop._id, periodKey: rule.key, used: cost });
    await ctx.db.insert('creditEvents', { shopId: shop._id, userId: user._id, periodKey: rule.key, ...args, credits: cost });
    return { used: used + cost, remaining: rule.limit - used - cost, duplicate: false };
  },
});
