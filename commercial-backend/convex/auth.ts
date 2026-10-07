import { convexAuth } from '@convex-dev/auth/server';
import { commercialAuthProviders } from './commercialPassword';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: commercialAuthProviders(),
  session: { totalDurationMs: 24 * 60 * 60 * 1000 },
});
