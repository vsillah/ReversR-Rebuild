import type { QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

/** No provider is qualified. Never infer exact-login liveness from a subject/JWT.
 * A future implementation must read the exact library session AND owner in ctx's
 * snapshot and qualify upstream revocation separately. No client liveness inputs.
 * Test loaders may replace this module; no runtime/env injection switch exists.
 */
export async function readExactLibrarySession(
  _ctx: QueryCtx, _loginSessionId: Id<'authSessions'>,
): Promise<null> {
  throw new Error('AUTH_UNAVAILABLE');
}
