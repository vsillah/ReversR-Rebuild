import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export const plan = v.union(v.literal('free'), v.literal('pro_shop'), v.literal('team'));
export default defineSchema({
  ...authTables,
  shops: defineTable({ ownerId: v.id('users'), name: v.string(), planId: plan,
    subscriptionStatus: v.string(), currentPeriodEnd: v.number(), customerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()), checkoutIntent: v.optional(v.string()),
    checkoutPlan: v.optional(plan), checkoutStartedAt: v.optional(v.number()), revision: v.optional(v.number()) })
    .index('by_ownerId', ['ownerId']).index('by_customerId', ['customerId']),
  memberships: defineTable({ userId: v.id('users'), shopId: v.id('shops'), active: v.boolean(),
    role: v.union(v.literal('owner'), v.literal('member')) }).index('by_userId', ['userId']),
  creditPeriods: defineTable({ shopId: v.id('shops'), periodKey: v.string(), used: v.number() })
    .index('by_shopId_and_periodKey', ['shopId', 'periodKey']),
  creditEvents: defineTable({ shopId: v.id('shops'), userId: v.id('users'), periodKey: v.string(),
    feature: v.string(), key: v.string(), requestHash: v.string(), credits: v.number() })
    .index('by_shopId_and_periodKey_and_feature_and_key', ['shopId', 'periodKey', 'feature', 'key']),
  stripeEvents: defineTable({ eventId: v.string(), subscriptionId: v.string() }).index('by_eventId', ['eventId']),
  subscriptions: defineTable({ subscriptionId: v.string(), shopId: v.id('shops') })
    .index('by_subscriptionId', ['subscriptionId']),
});
