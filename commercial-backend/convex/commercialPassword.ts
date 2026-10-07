import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import { Password } from '@convex-dev/auth/providers/Password';
import { signInViaProvider, type GenericActionCtxWithAuthConfig } from '@convex-dev/auth/server';
import { ConvexError, type Value } from 'convex/values';
import type { DataModel } from './_generated/dataModel';
import { configuration } from './configuration';
import { COMMERCIAL_SIGN_IN_PROVIDER, commercialSignInRejection } from '../../utils/commercialAuthRejection';

export async function authorizeCommercialSignIn(
  params: Partial<Record<string, Value | undefined>>, ctx: GenericActionCtxWithAuthConfig<DataModel>,
) {
  if (!configuration()) throw new Error('COMMERCIAL_UNAVAILABLE');
  if (Object.keys(params).sort().join(',') !== 'email,flow,password' || params.flow !== 'signIn'
      || typeof params.email !== 'string' || !params.email.trim()
      || typeof params.password !== 'string' || !params.password) {
    throw new Error('Invalid commercial sign-in parameters');
  }
  let result;
  try {
    // Public composition: Password retains account lookup, Scrypt and rate limits.
    // Its returned sessionId must be passed through so the outer provider reuses it.
    result = await signInViaProvider(ctx, Password(), { params });
  } catch (error) {
    // These exact ordinary errors are the pinned Password/retrieveAccount contract.
    // Never expose which account-specific branch ran; never translate unknown errors.
    if (error instanceof Error && error.constructor === Error
        && ['InvalidSecret', 'InvalidAccountId', 'Invalid credentials', 'TooManyFailedAttempts'].includes(error.message)) {
      throw new ConvexError(commercialSignInRejection());
    }
    throw error;
  }
  if (!result) throw new Error('Commercial sign-in outcome unavailable');
  return result;
}

export function commercialAuthProviders() {
  return configuration() ? [Password, ConvexCredentials<DataModel>({
    id: COMMERCIAL_SIGN_IN_PROVIDER, authorize: authorizeCommercialSignIn,
  })] : [];
}
