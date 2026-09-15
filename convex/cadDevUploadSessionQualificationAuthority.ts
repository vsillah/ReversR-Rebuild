import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

const principal = v.object({
  userId: v.id('users'),
  shopId: v.string(),
  loginSessionId: v.id('authSessions'),
  authMethod: v.literal('password'),
});

function assertDeadline(deadlineAt: number) {
  const now = Date.now();
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(deadlineAt)
    || deadlineAt <= now || deadlineAt - now > 800) {
    throw new Error('AUTH_UNAVAILABLE');
  }
  return now;
}

export const provisionSyntheticAuthority = internalMutation({
  args: { principal, deadlineAt: v.number() },
  returns: v.object({
    userAuthorityCreated: v.boolean(),
    membershipCreated: v.boolean(),
    userGeneration: v.number(),
    membershipGeneration: v.number(),
  }),
  handler: async (ctx, { principal: binding, deadlineAt }) => {
    const now = assertDeadline(deadlineAt);
    const user = await ctx.db.query('cadUserAuthority')
      .withIndex('by_userId', q => q.eq('userId', binding.userId))
      .unique();
    const member = await ctx.db.query('cadMemberships')
      .withIndex('by_userId_and_shopId', q => q.eq('userId', binding.userId).eq('shopId', binding.shopId))
      .unique();
    if (user && !Number.isSafeInteger(user.generation)) throw new Error('AUTH_UNAVAILABLE');
    if (member && !Number.isSafeInteger(member.generation)) throw new Error('AUTH_UNAVAILABLE');
    if (user) await ctx.db.patch(user._id, { enabled: true, generation: now });
    else await ctx.db.insert('cadUserAuthority', { userId: binding.userId, enabled: true, generation: now });
    if (member) await ctx.db.patch(member._id, { active: true, cadUploadAllowed: true, generation: now });
    else await ctx.db.insert('cadMemberships', {
      userId: binding.userId,
      shopId: binding.shopId,
      active: true,
      cadUploadAllowed: true,
      generation: now,
    });
    return {
      userAuthorityCreated: !user,
      membershipCreated: !member,
      userGeneration: now,
      membershipGeneration: now,
    };
  },
});

export const revokeSyntheticAuthority = internalMutation({
  args: { principal, deadlineAt: v.number() },
  returns: v.object({
    userAuthorityRetained: v.boolean(),
    membershipRetained: v.boolean(),
    userAuthorityRevoked: v.boolean(),
    membershipRevoked: v.boolean(),
  }),
  handler: async (ctx, { principal: binding, deadlineAt }) => {
    const now = assertDeadline(deadlineAt);
    const user = await ctx.db.query('cadUserAuthority')
      .withIndex('by_userId', q => q.eq('userId', binding.userId))
      .unique();
    const member = await ctx.db.query('cadMemberships')
      .withIndex('by_userId_and_shopId', q => q.eq('userId', binding.userId).eq('shopId', binding.shopId))
      .unique();
    if (user) await ctx.db.patch(user._id, { enabled: false, generation: now });
    if (member) await ctx.db.patch(member._id, {
      active: false,
      cadUploadAllowed: false,
      generation: now,
    });
    return {
      userAuthorityRetained: user !== null,
      membershipRetained: member !== null,
      userAuthorityRevoked: user !== null,
      membershipRevoked: member !== null,
    };
  },
});
