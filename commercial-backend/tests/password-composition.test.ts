import { test, expect, vi } from 'vitest';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import schema from '../convex/schema';
import { api } from '../convex/_generated/api';
import { authorizeCommercialSignIn, commercialAuthProviders } from '../convex/commercialPassword';
import { commercialSignInRejection } from '../../utils/commercialAuthRejection';

test('public nested Password composition reuses its successful session without signing keys', async () => {
  const t = convexTest(schema, { ...import.meta.glob('../convex/**/*.{ts,js}'),
    '../convex/composition.ts': () => import('./password-composition.fixture') });
  const ref = makeFunctionReference<'action'>('composition:invoke');
  const input = { email: 'composition@synthetic.invalid', password: 'offline-password-only' };
  const signup = await t.action(ref, { ...input, nested: false });
  const before = await t.run(ctx => ctx.db.query('authSessions').collect());
  const signin = await t.action(ref, { ...input, nested: true });
  const after = await t.run(ctx => ctx.db.query('authSessions').collect());
  expect(signin.userId).toBe(signup.userId);
  expect(signin.sessionId).not.toBe(signup.sessionId);
  expect(after.length - before.length).toBe(1);
  expect(after.filter(row => row._id === signin.sessionId)).toHaveLength(1);
});

test('official hashing, password-account identity and failed-attempt accounting survive the adapter', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(2000000000000);
  try {
    const t = convexTest(schema, { ...import.meta.glob('../convex/**/*.{ts,js}'),
      '../convex/composition.ts': () => import('./password-composition.fixture') });
    const ref = makeFunctionReference<'action'>('composition:invoke');
    const input = { email: 'limits@synthetic.invalid', password: 'offline-scrypt-password' };
    const signup = await t.action(ref, { ...input, nested: false });
    const account = await t.run(ctx => ctx.db.query('authAccounts').unique());
    expect(account?.provider).toBe('password');
    expect(account?.userId).toBe(signup.userId);
    expect(account?.secret).not.toBe(input.password);
    const secret = account?.secret;
    for (let n = 0; n < 10; n++) {
      await expect(t.action(api.auth.signIn, { provider: 'commercial-password-signin',
        params: { ...input, password: 'wrong-offline-password', flow: 'signIn' } }))
        .rejects.toMatchObject({ data: commercialSignInRejection() });
    }
    const limit = await t.run(ctx => ctx.db.query('authRateLimits').unique());
    expect(limit?.attemptsLeft).toBe(0);
    // Correct credentials are now throttled by the official provider too.
    await expect(t.action(ref, { ...input, nested: true })).rejects.toMatchObject({ data: commercialSignInRejection() });
    await expect(t.action(ref, { ...input, email: 'missing@synthetic.invalid', nested: true }))
      .rejects.toMatchObject({ data: commercialSignInRejection() });
    expect((await t.run(ctx => ctx.db.query('authSessions').collect()))).toHaveLength(1);
    expect((await t.run(ctx => ctx.db.query('authAccounts').unique()))?.secret).toBe(secret);
    // Clear only synthetic time-based throttling by advancing the fixture clock.
    vi.mocked(Date.now).mockReturnValue(2000003600001);
    const resumed = await t.action(ref, { ...input, nested: true });
    expect(resumed.userId).toBe(signup.userId);
    expect(await t.run(ctx => ctx.db.query('authRateLimits').unique())).toBeNull();
  } finally { vi.restoreAllMocks(); }
});

test('disabled assembly exposes no providers and strict params fail before any delegation', async () => {
  const runMutation = vi.fn(() => { throw new Error('must not delegate'); });
  const ctx = { runMutation } as any; // Synthetic context only; no live values.
  const valid = { email: 'input@synthetic.invalid', password: 'offline-password', flow: 'signIn' };
  for (const params of [{ ...valid, flow: 'signUp' }, { ...valid, flow: 'reset' },
    { ...valid, accountId: 'forged' }, { ...valid, sessionId: 'forged' }, { ...valid, password: '' },
    { ...valid, password: undefined }, { ...valid, email: '' }, { ...valid, code: 'forged' }]) {
    await expect(authorizeCommercialSignIn(params, ctx)).rejects.toThrow('Invalid commercial sign-in parameters');
  }
  expect(runMutation).not.toHaveBeenCalled();
  vi.stubEnv('COMMERCIAL_ASSEMBLY', 'disabled');
  expect(commercialAuthProviders()).toEqual([]);
  await expect(authorizeCommercialSignIn(valid, ctx)).rejects.toThrow('COMMERCIAL_UNAVAILABLE');
  expect(runMutation).not.toHaveBeenCalled();
});

test('unknown delegated errors are preserved, never translated into credential rejection', async () => {
  const failure = new Error('unrecognized offline failure');
  const ctx = { runMutation: async () => { throw failure; } } as any;
  await expect(authorizeCommercialSignIn({ email: 'unknown@synthetic.invalid', password: 'offline-password', flow: 'signIn' }, ctx))
    .rejects.toBe(failure);
});
