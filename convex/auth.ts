// Source-only assembly: no login method is enabled. Provider selection is a later gate.
import { convexAuth } from '@convex-dev/auth/server';
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [],
});
