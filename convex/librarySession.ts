import { getAuthSessionId, getAuthUserId } from '@convex-dev/auth/server';
import type { QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { developmentAuthReviewed } from './developmentAuth';

/** Auth SDK parses only server-verified identity. Point reads independently enforce
 * session deletion/expiry through validThrough and owner existence in this snapshot.
 * validThrough is the backend-validated deadline, not a new client liveness claim.
 * Time passage alone does not invalidate a cached query; gateway freshness is required.
 * Password method is valid only for this isolated, Password-only deployment after
 * its empty-history/cohort gate; there is no inference from an email or account row.
 * Internal callers must preserve the authenticated user's context. A service token
 * or supplied principal is never a substitute for the user's exact login context.
 */
export async function readExactLibrarySession(ctx: QueryCtx, loginSessionId: Id<'authSessions'>, validThrough: number) {
  try {
    if (!developmentAuthReviewed || !Number.isSafeInteger(validThrough) || validThrough < 0) throw new Error('AUTH_UNAVAILABLE');
    const userId = await getAuthUserId(ctx);
    const exactId = await getAuthSessionId(ctx);
    if (!userId || exactId !== loginSessionId) return null;
    const session = await ctx.db.get(loginSessionId);
    if (!session) return null;
    if (session._id !== loginSessionId || !Number.isSafeInteger(session.expirationTime)
      || session.expirationTime < 0) throw new Error('AUTH_UNAVAILABLE');
    if (session.userId !== userId || session.expirationTime <= validThrough) return null;
    const owner = await ctx.db.get(userId);
    if (!owner || owner._id !== userId || session.expirationTime <= validThrough) return null;
    return { userId, loginSessionId, authMethod: 'password' as const,
      expiresAt: session.expirationTime, active: true };
  } catch { throw new Error('AUTH_UNAVAILABLE'); }
}
