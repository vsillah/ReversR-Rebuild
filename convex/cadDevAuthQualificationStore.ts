import { getAuthSessionId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internalQuery, query } from './_generated/server';
import { cadDevAuthQualificationBinding } from './cadDevAuthQualificationBinding';
import { developmentPasswordCohort } from './developmentAuth';
import { readExactLibrarySession } from './librarySession';

const authCount = v.object({
  users: v.number(),
  authAccounts: v.number(),
  authSessions: v.number(),
  authRefreshTokens: v.number(),
  authVerificationCodes: v.number(),
  authRateLimits: v.number(),
  authVerifiersSelectorLimited: v.boolean(),
  cadUploadSessionsSelectorLimited: v.boolean(),
});

const slotInventory = v.object({
  slot: v.number(),
  email: v.string(),
  userId: v.union(v.id('users'), v.null()),
  accountId: v.union(v.id('authAccounts'), v.null()),
  counts: authCount,
});

const exactSession = v.object({
  userId: v.id('users'),
  loginSessionId: v.id('authSessions'),
  authMethod: v.literal('password'),
  expiresAt: v.number(),
  active: v.boolean(),
});

function guardBinding(runKeySha256: string) {
  const run = cadDevAuthQualificationBinding.run;
  if (!cadDevAuthQualificationBinding.enabled || run.runKeySha256 === null
    || runKeySha256 !== run.runKeySha256) throw new Error('QUALIFICATION_DISABLED');
}

async function slotInventoryForEmail(ctx: any, slot: number, email: string) {
  const users = await ctx.db.query('users').withIndex('email', (q: any) => q.eq('email', email)).take(3);
  if (users.length > 1) throw new Error('QUALIFICATION_SELECTOR_DRIFT');
  const accounts = await ctx.db.query('authAccounts').withIndex('providerAndAccountId',
    (q: any) => q.eq('provider', 'password').eq('providerAccountId', email)).take(3);
  if (accounts.length > 1) throw new Error('QUALIFICATION_SELECTOR_DRIFT');
  const user = accounts[0] ? await ctx.db.get(accounts[0].userId) : (users[0] ?? null);
  if (accounts[0] && users[0] && accounts[0].userId !== users[0]._id) throw new Error('QUALIFICATION_SELECTOR_DRIFT');
  const accountId = accounts[0]?._id ?? null;
  const userId = user?._id ?? null;
  const accountByUser = userId
    ? await ctx.db.query('authAccounts').withIndex('userIdAndProvider',
      (q: any) => q.eq('userId', userId).eq('provider', 'password')).take(3)
    : [];
  if (accountByUser.length > 1 || (accountByUser[0] && accountByUser[0]._id !== accountId)) {
    throw new Error('QUALIFICATION_SELECTOR_DRIFT');
  }
  const sessions = userId
    ? await ctx.db.query('authSessions').withIndex('userId', (q: any) => q.eq('userId', userId)).take(3)
    : [];
  let refreshTokens = 0;
  for (const session of sessions) {
    refreshTokens += (await ctx.db.query('authRefreshTokens').withIndex('sessionId',
      (q: any) => q.eq('sessionId', session._id)).take(3)).length;
  }
  const verificationCodes = accountId
    ? await ctx.db.query('authVerificationCodes').withIndex('accountId', (q: any) => q.eq('accountId', accountId)).take(3)
    : [];
  const rateLimits = accountId
    ? await ctx.db.query('authRateLimits').withIndex('identifier', (q: any) => q.eq('identifier', accountId)).take(3)
    : [];
  return {
    slot,
    email,
    userId,
    accountId,
    counts: {
      users: user ? 1 : 0,
      authAccounts: accounts.length,
      authSessions: sessions.length,
      authRefreshTokens: refreshTokens,
      authVerificationCodes: verificationCodes.length,
      authRateLimits: rateLimits.length,
      authVerifiersSelectorLimited: true,
      cadUploadSessionsSelectorLimited: true,
    },
  };
}

export const inventory = internalQuery({
  args: {},
  returns: v.array(slotInventory),
  handler: async ctx => {
    const cohort = developmentPasswordCohort();
    if (cohort.length !== 2 || cohort[0] !== cadDevAuthQualificationBinding.cohort[0]
      || cohort[1] !== cadDevAuthQualificationBinding.cohort[1]) {
      throw new Error('QUALIFICATION_COHORT_MISMATCH');
    }
    return Promise.all(cohort.map((email, slot) => slotInventoryForEmail(ctx, slot, email)));
  },
});

export const readCurrent = query({
  args: { runKeySha256: v.string(), validThrough: v.number() },
  returns: v.union(exactSession, v.null()),
  handler: async (ctx, args) => {
    guardBinding(args.runKeySha256);
    const loginSessionId = await getAuthSessionId(ctx);
    if (!loginSessionId) return null;
    return readExactLibrarySession(ctx, loginSessionId, args.validThrough);
  },
});
