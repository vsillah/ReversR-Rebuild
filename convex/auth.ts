// Source-only candidate; gate and empty cohort prevent accidental activation.
import { convexAuth } from '@convex-dev/auth/server';
import { developmentConfiguration, developmentPassword, developmentRedirect } from './developmentAuth';
const configuration = developmentConfiguration(process.env);
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth(configuration ? {
  providers: [developmentPassword([])],
  session: { totalDurationMs: 15 * 60 * 1000 },
  callbacks: { redirect: async params => developmentRedirect(params) },
} : { providers: [] });
