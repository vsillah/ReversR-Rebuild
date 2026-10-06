import { getAuthSessionId, getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { configuration } from './configuration';

export async function session(ctx: MutationCtx) {
  const config = configuration();
  if (!config) throw new ConvexError('COMMERCIAL_UNAVAILABLE');
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.issuer !== config.issuer) throw new ConvexError('LOGIN_REQUIRED');
  const userId = await getAuthUserId(ctx);
  const sessionId = await getAuthSessionId(ctx);
  if (!userId || !sessionId) throw new ConvexError('LOGIN_REQUIRED');
  const current = await ctx.db.get(sessionId);
  const user = await ctx.db.get(userId);
  if (!current || !user || current.userId !== userId || current.expirationTime <= Date.now()) {
    throw new ConvexError('SESSION_EXPIRED');
  }
  return { user, expiresAt: current.expirationTime };
}

export async function membership(ctx: MutationCtx, ownerOnly = false) {
  const current = await session(ctx);
  const member = await ctx.db.query('memberships').withIndex('by_userId', q => q.eq('userId', current.user._id)).unique();
  const shop = member?.active ? await ctx.db.get(member.shopId) : null;
  if (!member || !shop) throw new ConvexError('ACCOUNT_REQUIRED');
  if (ownerOnly && (member.role !== 'owner' || shop.ownerId !== current.user._id)) throw new ConvexError('OWNER_REQUIRED');
  return { ...current, member, shop };
}
