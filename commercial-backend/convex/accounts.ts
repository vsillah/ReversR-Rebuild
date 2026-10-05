import { v, ConvexError } from 'convex/values';
import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { session, membership } from './session';
import { plan } from './schema';
import { credits } from './catalog';

const view = v.object({ userId: v.id('users'), shopId: v.id('shops'), owner: v.boolean(),
  name: v.string(), email: v.string(), emailVerified: v.boolean(), shopName: v.string(), planId: plan,
  subscriptionStatus: v.string(), currentPeriodEnd: v.number(), hasStripeCustomer: v.boolean(),
  usedCredits: v.number(), limit: v.number(), period: v.union(v.literal('week'), v.literal('month')),
  periodKey: v.string(), resetAt: v.number(), sessionExpiresAt: v.number() });
async function snapshot(ctx: MutationCtx) {
  const { user, shop, member, expiresAt } = await membership(ctx);
  const rule = credits(shop.planId);
  const period = await ctx.db.query('creditPeriods').withIndex('by_shopId_and_periodKey', q => q.eq('shopId', shop._id).eq('periodKey', rule.key)).unique();
  return { userId: user._id, shopId: shop._id, owner: shop.ownerId === user._id && member.role === 'owner',
    name: user.name || 'Repair shop user', email: user.email || '', emailVerified: Boolean(user.emailVerificationTime),
    shopName: shop.name, planId: shop.planId, subscriptionStatus: shop.subscriptionStatus,
    currentPeriodEnd: shop.currentPeriodEnd, hasStripeCustomer: Boolean(shop.customerId),
    usedCredits: period?.used || 0, limit: rule.limit, period: rule.period, periodKey: rule.key,
    resetAt: rule.reset, sessionExpiresAt: expiresAt };
}
export const me = mutation({ args: {}, returns: view, handler: async ctx => {
  const { user } = await session(ctx);
  const member = await ctx.db.query('memberships').withIndex('by_userId', q => q.eq('userId', user._id)).unique();
  if (!member) {
    const shopId = await ctx.db.insert('shops', { ownerId: user._id, name: 'ReversR Repair Shop', planId: 'free', subscriptionStatus: 'none', currentPeriodEnd: 0 });
    await ctx.db.insert('memberships', { userId: user._id, shopId, active: true, role: 'owner' });
  }
  return snapshot(ctx);
} });
export const profile = mutation({ args: { name: v.string(), shopName: v.string() }, returns: view, handler: async (ctx, args) => {
  const { user, shop } = await membership(ctx, true);
  if (!args.name.trim() || args.name.length > 120 || !args.shopName.trim() || args.shopName.length > 120) throw new ConvexError('INVALID_PROFILE');
  await ctx.db.patch(user._id, { name: args.name.trim() });
  await ctx.db.patch(shop._id, { name: args.shopName.trim() });
  return snapshot(ctx);
} });
export const authorizeWorkflow = mutation({ args: { feature: v.string() }, returns: v.null(), handler: async ctx => {
  await membership(ctx);
  throw new ConvexError('WORKFLOW_POLICY_PENDING: server-owned journey, failure credit and result replay policy require review');
} });
