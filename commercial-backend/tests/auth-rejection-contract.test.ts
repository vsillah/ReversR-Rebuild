import { expect, test } from 'vitest';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { runInNewContext } from 'node:vm';
import { commercialAuthRequest, commercialAuthFailureMessage, commercialSignInRejection,
  inspectCommercialSignInRejection, isCommercialSignInRejection, signInCommercialAccount } from '../../utils/commercialAuthRejection';

test('installed SDK preserves exact structured rejection; malformed and generic errors stay inconclusive', async () => {
  const payloads = [commercialSignInRejection(), null, 'InvalidSecret', { ...commercialSignInRejection(), version: 2 },
    { ...commercialSignInRejection(), extra: 'private-fixture' }, { code: 'SIGN_IN_REJECTED' }, [],
    JSON.stringify(commercialSignInRejection())];
  for (const [index, data] of payloads.entries()) {
    const sdk = new ConvexHttpClient('https://offline-only.convex.cloud', { logger: false, fetch: async () =>
      new Response(JSON.stringify({ status: 'error', errorMessage: 'Server Error', errorData: data, logLines: [] }), { status: 200 }) });
    const result = await inspectCommercialSignInRejection(() => sdk.action(makeFunctionReference<'action'>('auth:signIn'),
      { provider: 'commercial-password-signin', params: { email: 'fixture@synthetic.invalid', password: 'private-fixture', flow: 'signIn' } }), () => {});
    expect(result.outcome).toBe(index === 0 ? 'confirmed_sign_in_rejection' : 'unclassified_rejection');
    expect(result.exactInternalCauseEstablished).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private-fixture');
  }
});

test('frontend action integration rejects unresolved sign-in and propagates only safe feedback', async () => {
  const calls: string[] = [];
  await signInCommercialAccount(async provider => { calls.push(provider); return { signingIn: true }; }, 'offline@synthetic.invalid', 'offline-password', false);
  await signInCommercialAccount(async provider => { calls.push(provider); return { signingIn: true }; }, 'offline@synthetic.invalid', 'offline-password', true);
  expect(calls).toEqual(['commercial-password-signin', 'password']);
  await expect(signInCommercialAccount(async () => ({ signingIn: false }), 'offline@synthetic.invalid', 'offline-password', false))
    .rejects.toThrow('Account access outcome unavailable');
  const typed = { data: commercialSignInRejection(), message: 'private-fixture' };
  await expect(signInCommercialAccount(async () => { throw typed; }, 'offline@synthetic.invalid', 'offline-password', false)).rejects.toBe(typed);
  expect(commercialAuthFailureMessage(typed)).not.toContain('private-fixture');
});

test('exact payload on ordinary, transport and non-error throws is not application-error evidence', async () => {
  for (const error of [
    Object.assign(new Error('private-runtime'), { data: commercialSignInRejection() }),
    Object.assign(new TypeError('private-transport'), { data: commercialSignInRejection() }),
    { data: commercialSignInRejection() },
    { name: 'ConvexError', data: commercialSignInRejection() },
    { [Symbol.for('ConvexError')]: false, data: commercialSignInRejection() },
    { [Symbol('ConvexError')]: true, data: commercialSignInRejection() },
  ]) {
    const result = await inspectCommercialSignInRejection(async () => { throw error; }, () => {});
    expect(result.outcome).toBe('unclassified_rejection');
    expect(JSON.stringify(result)).not.toContain('private-');
  }
});

test('SDK global brand survives a foreign Error prototype without accepting malformed data', async () => {
  const ForeignError = runInNewContext('Error');
  const error = new ConvexError(commercialSignInRejection());
  Object.setPrototypeOf(error, ForeignError.prototype);
  expect(error instanceof ConvexError).toBe(false);
  expect(error instanceof Error).toBe(false);
  expect(error[Symbol.for('ConvexError') as keyof typeof error]).toBe(true);
  expect((await inspectCommercialSignInRejection(async () => { throw error; }, () => {})).outcome)
    .toBe('confirmed_sign_in_rejection');
  const malformed = new ConvexError({ ...commercialSignInRejection(), extra: true });
  expect((await inspectCommercialSignInRejection(async () => { throw malformed; }, () => {})).outcome)
    .toBe('unclassified_rejection');
});

test('redaction, message spoofing, network failure and null resolution cannot pass', async () => {
  for (const error of [new Error('Server Error'), new Error(JSON.stringify(commercialSignInRejection())), new TypeError('fetch failed')]) {
    expect((await inspectCommercialSignInRejection(async () => { throw error; }, () => {})).outcome).toBe('unclassified_rejection');
  }
  for (const response of [{ tokens: null }, { tokens: { token: 'private-access', refreshToken: 'private-refresh' } }]) {
    let custody;
    const result = await inspectCommercialSignInRejection(async () => response, value => { custody = value; });
    expect(custody).toBe(response);
    expect(result.outcome).toBe('unexpected_resolution');
    expect(JSON.stringify(result)).not.toContain('private-');
  }
});

test('frontend keeps official signup and routes sign-in through adapter with safe feedback', () => {
  expect(commercialAuthRequest('fixture@synthetic.invalid', 'offline-password', false)).toEqual({
    provider: 'commercial-password-signin', params: { email: 'fixture@synthetic.invalid', password: 'offline-password', flow: 'signIn' },
  });
  expect(commercialAuthRequest('fixture@synthetic.invalid', 'offline-password', true).provider).toBe('password');
  expect(commercialAuthRequest('fixture@synthetic.invalid', 'offline-password', true).params.flow).toBe('signUp');
  expect(commercialAuthFailureMessage({ data: commercialSignInRejection() })).toBe('Sign-in was rejected. Check your details or try again later.');
  expect(commercialAuthFailureMessage(new Error('private raw error'))).toBe('Account access could not be confirmed. Try again later.');
  expect(isCommercialSignInRejection({ ...commercialSignInRejection(), extra: true })).toBe(false);
});
