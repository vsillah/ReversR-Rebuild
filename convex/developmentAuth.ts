// Source review gate. Environment values alone can never enable this candidate.
import { Password } from '@convex-dev/auth/providers/Password';
import type { PasswordConfig } from '@convex-dev/auth/providers/Password';
import type { DataModel } from './_generated/dataModel';
export const developmentAuthReviewed: boolean = false;
export const developmentOrigin = 'http://localhost:5001';
export const developmentIssuer = 'https://majestic-alligator-31.convex.site';
const fail = (): never => { throw new Error('AUTH_UNAVAILABLE'); };

export function developmentConfiguration(env: Record<string, string | undefined>) {
  if (!developmentAuthReviewed) return null;
  if (env.CONVEX_SITE_URL !== developmentIssuer || env.SITE_URL !== developmentOrigin
    || !env.JWT_PRIVATE_KEY?.trim() || !env.JWKS?.trim()) fail();
  // The cohort is installed only by a later reviewed source change. No env enrollment.
  return { origin: developmentOrigin, issuer: developmentIssuer };
}
export function developmentPassword(cohort: readonly string[]) {
  if (!cohort.length || cohort.length > 2 || new Set(cohort).size !== cohort.length
    || !cohort.every(email => /^cad-test-[a-z0-9-]{1,32}@auth-test\.invalid$/.test(email))) fail();
  const allowed = new Set(cohort);
  const policy: PasswordConfig<DataModel> = {
    id: 'password',
    validatePasswordRequirements: () => fail(),
    profile(params) {
      if (params.flow !== 'signIn' || typeof params.email !== 'string' || !allowed.has(params.email)
        || typeof params.password !== 'string' || params.password.length < 12 || params.password.length > 128
        || Object.keys(params).some(key => !['flow', 'email', 'password'].includes(key))) return fail();
      return { email: params.email };
    },
  };
  return Password(policy);
}
export function developmentRedirect({ redirectTo }: { redirectTo: string }) {
  // Exact allowlist: no query strings, prefix matching, protocol-relative URLs or native schemes.
  if (redirectTo === '/' || redirectTo === developmentOrigin + '/') return developmentOrigin + '/';
  return fail();
}
