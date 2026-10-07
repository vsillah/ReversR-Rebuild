export const COMMERCIAL_SIGN_IN_PROVIDER = 'commercial-password-signin';
export const commercialSignInRejection = () => ({
  kind: 'commercial-auth', version: 1, code: 'SIGN_IN_REJECTED',
} as const);

// Only explicit application data is evidence. Messages are never inspected.
export function isCommercialSignInRejection(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const value = data as Record<string, unknown>;
  const keys = Object.keys(value).sort();
  return Reflect.ownKeys(value).length === 3 && keys.length === 3 && keys.join(',') === 'code,kind,version'
    && value.kind === 'commercial-auth' && value.version === 1 && value.code === 'SIGN_IN_REJECTED';
}

export function commercialAuthRequest(email: string, password: string, create: boolean) {
  return { provider: create ? 'password' : COMMERCIAL_SIGN_IN_PROVIDER,
    params: { email, password, flow: create ? 'signUp' : 'signIn' } };
}

export async function signInCommercialAccount(
  signIn: (provider: string, params: { email: string; password: string; flow: string }) => Promise<{ signingIn: boolean }>,
  email: string, password: string, create: boolean,
) {
  const request = commercialAuthRequest(email, password, create);
  const result = await signIn(request.provider, request.params);
  if (result?.signingIn !== true) throw new Error('Account access outcome unavailable');
}

export function commercialAuthFailureMessage(error: unknown): string {
  const data = error && typeof error === 'object' && 'data' in error ? error.data : undefined;
  return isCommercialSignInRejection(data)
    ? 'Sign-in was rejected. Check your details or try again later.'
    : 'Account access could not be confirmed. Try again later.';
}

export async function inspectCommercialSignInRejection(
  action: () => Promise<unknown>, onResolution: (value: unknown) => void,
) {
  let value: unknown;
  try { value = await action(); }
  catch (error) {
    // Convex's installed SDK uses this global symbol across realms/package copies.
    // An Error name or attached data alone is not an application-error envelope.
    const branded = error !== null && typeof error === 'object'
      && (error as Record<symbol, unknown>)[Symbol.for('ConvexError')] === true;
    const data = branded && 'data' in error ? error.data : undefined;
    return { outcome: branded && isCommercialSignInRejection(data) ? 'confirmed_sign_in_rejection' : 'unclassified_rejection',
      sdkOutcome: 'rejected', exactInternalCauseEstablished: false } as const;
  }
  onResolution(value); // Caller retains any unexpected tokens privately for cleanup.
  return { outcome: 'unexpected_resolution', sdkOutcome: 'resolved', exactInternalCauseEstablished: false } as const;
}
