import { v, ConvexError } from 'convex/values';
import { internalMutation } from './_generated/server';
import { membership } from './session';
import { configuration } from './configuration';
import { plan } from './schema';

export const prepare = internalMutation({ args: { planId: plan, intent: v.string() },
  returns: v.object({ shopId: v.id('shops'), customerId: v.union(v.string(), v.null()), intent: v.string() }),
  handler: async (ctx, args) => {
    const { shop } = await membership(ctx, true);
    if (args.planId === 'free') throw new ConvexError('PAID_PLAN_REQUIRED');
    if (args.planId === 'team') throw new ConvexError('TEAM_PROVISIONING_PENDING');
    if (shop.subscriptionId && !['canceled', 'incomplete_expired'].includes(shop.subscriptionStatus)) throw new ConvexError('USE_BILLING_PORTAL');
    if (shop.checkoutIntent && (shop.checkoutPlan !== args.planId || !shop.checkoutStartedAt || Date.now() - shop.checkoutStartedAt >= 23 * 3600000)) throw new ConvexError('CHECKOUT_RECONCILIATION_REQUIRED');
    const intent = shop.checkoutIntent || args.intent;
    await ctx.db.patch(shop._id, { checkoutIntent: intent, checkoutPlan: args.planId, checkoutStartedAt: shop.checkoutStartedAt || Date.now() });
    return { shopId: shop._id, customerId: shop.customerId || null, intent };
  } });
export const bindCustomer = internalMutation({ args: { intent: v.string(), customerId: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const { shop } = await membership(ctx, true);
  if (shop.checkoutIntent !== args.intent || (shop.customerId && shop.customerId !== args.customerId)) throw new ConvexError('BILLING_BINDING_CHANGED');
  await ctx.db.patch(shop._id, { customerId: args.customerId });
  return null;
} });
export const portalCustomer = internalMutation({ args: {}, returns: v.string(), handler: async ctx => {
  const { shop } = await membership(ctx, true);
  if (!shop.customerId) throw new ConvexError('NO_BILLING_ACCOUNT');
  return shop.customerId;
} });
export const beginEvent = internalMutation({ args: { eventId: v.string(), customerId: v.string() },
  returns: v.union(v.null(), v.object({ shopId: v.id('shops'), revision: v.number() })), handler: async (ctx, args) => {
    if (!configuration()) throw new ConvexError('COMMERCIAL_UNAVAILABLE');
    const seen = await ctx.db.query('stripeEvents').withIndex('by_eventId', q => q.eq('eventId', args.eventId)).unique();
    if (seen) return null;
    const shop = await ctx.db.query('shops').withIndex('by_customerId', q => q.eq('customerId', args.customerId)).unique();
    if (!shop) throw new ConvexError('UNBOUND_CUSTOMER');
    const revision = (shop.revision || 0) + 1;
    await ctx.db.patch(shop._id, { revision });
    return { shopId: shop._id, revision };
  } });
export const applyEvent = internalMutation({ args: { eventId: v.string(), shopId: v.id('shops'), revision: v.number(),
  customerId: v.string(), subscriptionId: v.string(), status: v.string(), planId: plan,
  periodEnd: v.number(), intent: v.string(), metadataShopId: v.string() }, returns: v.null(), handler: async (ctx, args) => {
    if (!configuration()) throw new ConvexError('COMMERCIAL_UNAVAILABLE');
    const seen = await ctx.db.query('stripeEvents').withIndex('by_eventId', q => q.eq('eventId', args.eventId)).unique();
    if (seen) return null;
    const shop = await ctx.db.get(args.shopId);
    if (!shop || shop.customerId !== args.customerId || shop.revision !== args.revision) throw new ConvexError('RECONCILE_RETRY');
    const previous = await ctx.db.query('subscriptions').withIndex('by_subscriptionId', q => q.eq('subscriptionId', args.subscriptionId)).unique();
    if (previous && previous.shopId !== shop._id) throw new ConvexError('SUBSCRIPTION_OWNER_MISMATCH');
    const retired = previous && shop.subscriptionId !== args.subscriptionId;
    if (!retired) {
      if (shop.subscriptionId !== args.subscriptionId) {
        const terminal = !shop.subscriptionId || ['canceled', 'incomplete_expired'].includes(shop.subscriptionStatus);
        if (!terminal || !shop.checkoutIntent || args.intent !== shop.checkoutIntent || args.metadataShopId !== shop._id) throw new ConvexError('UNBOUND_SUBSCRIPTION');
      }
      const consumesIntent = shop.subscriptionId !== args.subscriptionId;
      await ctx.db.patch(shop._id, { subscriptionId: args.subscriptionId, subscriptionStatus: args.status,
        planId: ['active', 'trialing'].includes(args.status) ? args.planId : 'free', currentPeriodEnd: args.periodEnd,
        ...(consumesIntent ? { checkoutIntent: undefined, checkoutPlan: undefined, checkoutStartedAt: undefined } : {}) });
      if (!previous) await ctx.db.insert('subscriptions', { subscriptionId: args.subscriptionId, shopId: shop._id });
    }
    await ctx.db.insert('stripeEvents', { eventId: args.eventId, subscriptionId: args.subscriptionId });
    return null;
  } });
