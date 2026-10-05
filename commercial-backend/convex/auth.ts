import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import { configuration } from './configuration';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: configuration() ? [Password] : [],
  session: { totalDurationMs: 24 * 60 * 60 * 1000 },
});
