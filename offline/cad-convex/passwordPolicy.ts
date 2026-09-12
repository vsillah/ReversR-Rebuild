// Offline candidate only: never imported by convex/auth.ts or application code.
import type { PasswordConfig } from '@convex-dev/auth/providers/Password';
import type { DataModel } from '../../convex/_generated/dataModel';

function fail(): never { throw new Error('AUTH_UNAVAILABLE'); }
const syntheticEmail = (value: unknown): value is string => typeof value === 'string'
  && /^cad-test-[a-z0-9-]{1,32}@auth-test\.invalid$/.test(value);

/** Host-owned test cohort, not enrollment permission or verified user authority.
 * Only existing accounts can sign in. Provisioning and session provenance remain
 * separate blockers; an unverified email must never grant CAD membership.
 */
export function createPasswordPolicyForTests(options: {
  testOnly: true; syntheticEmails: readonly string[];
}): PasswordConfig<DataModel> {
  if (!options || options.testOnly !== true || !Array.isArray(options.syntheticEmails)
    || options.syntheticEmails.length < 1 || options.syntheticEmails.length > 8
    || !options.syntheticEmails.every(syntheticEmail)) fail();
  const cohort = new Set(options.syntheticEmails);
  if (cohort.size !== options.syntheticEmails.length) fail();
  return Object.freeze({
    id: 'password',
    // Password calls this before profile for signup/reset. Those flows always deny.
    validatePasswordRequirements: () => fail(),
    profile(params) {
      if (!params || params.flow !== 'signIn' || !syntheticEmail(params.email)
        || !cohort.has(params.email) || typeof params.password !== 'string'
        || params.password.length < 12 || params.password.length > 128
        || Object.keys(params).some(key => !['flow', 'email', 'password'].includes(key))) fail();
      return { email: params.email };
    },
    // No reset/verify providers, callbacks, custom crypto, or account linking.
  } satisfies PasswordConfig<DataModel>);
}
