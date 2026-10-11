/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test, vi } from 'vitest';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
import { AUTHENTICATED_IGS_LIMITS } from '../convex/cadAuthenticatedIgs';

const modules = import.meta.glob('../convex/**/*.{ts,js}');
const setup = () => {
  vi.stubEnv('COMMERCIAL_AUTH_ISSUER', 'https://commercial-synthetic.convex.site');
  vi.stubEnv('COMMERCIAL_ASSEMBLY', 'ordinary-customers-v1');
  vi.stubEnv('CONVEX_SITE_URL', 'https://commercial-synthetic.convex.site');
  vi.stubEnv('CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED', 'true');
  vi.stubEnv('CAD_AUTHENTICATED_IGS_ENVIRONMENT', 'development');
  return convexTest(schema, modules);
};

async function identity(t: ReturnType<typeof setup>, planId: 'free' | 'pro_shop' = 'pro_shop') {
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: 'cad-owner@synthetic.invalid' });
    const sessionId = await ctx.db.insert('authSessions', {
      userId, expirationTime: Date.now() + 10 * 60_000,
    });
    return { userId, sessionId };
  });
  const client = t.withIdentity({ issuer: 'https://commercial-synthetic.convex.site',
    subject: `${ids.userId}|${ids.sessionId}` });
  const account = await client.mutation(api.accounts.me, {});
  await t.run(ctx => ctx.db.patch(account.shopId, { planId }));
  return { ...ids, shopId: account.shopId, client };
}

const invoke = async (t: ReturnType<typeof setup>, operation: string, payload: unknown, now = Date.now()) => {
  const result = await t.mutation(internal.cadAuthenticatedIgs.service, {
    operation, payloadJson: JSON.stringify(payload), now,
  });
  return JSON.parse(result.resultJson);
};

test('revoked legacy bearer sessions remain inert while active storage stays cookie and CSRF bound', async () => {
  const t = setup();
  const account = await identity(t);
  const now = Date.now();
  const credentialDigest = '1'.repeat(64);
  const legacy = { schemaVersion: 2 as const, credentialDigest, userId: account.userId,
    shopId: 'cad-controlled-upload-development-qualification',
    loginSessionId: account.sessionId, sessionId: 'legacy-revoked-session',
    authMethod: 'password' as const, cadUploadAllowed: false, transport: 'bearer' as const,
    issuedAt: now - 120_000, expiresAt: now + 120_000, status: 'revoked' as const,
    userGeneration: 1, membershipGeneration: 1, revokedAt: now - 60_000 };
  const legacyId = await t.run(ctx => ctx.db.insert('cadUploadSessions', legacy));

  expect(await invoke(t, 'session.read', { credentialDigest }, now)).toBeNull();
  expect(await invoke(t, 'job.claim', { owner: { userId: account.userId, shopId: account.shopId,
    uploadSessionId: legacy.sessionId }, jobId: 'legacy-job', idempotencyDigest: '2'.repeat(64),
    requestDigest: '3'.repeat(64), extension: 'igs', contentLength: 1024 }, now))
    .toEqual({ accepted: false, code: 'UPLOAD_DENIED' });
  await expect(t.run(ctx => ctx.db.patch(legacyId, { status: 'active' })))
    .rejects.toThrow();
  expect(await t.run(ctx => ctx.db.get(legacyId))).toMatchObject({ status: 'revoked',
    transport: 'bearer', revokedAt: legacy.revokedAt });

  const { userGeneration: _userGeneration, membershipGeneration: _membershipGeneration,
    revokedAt: _revokedAt, ...legacyBinding } = legacy;
  const legacyAllowedDigest = '6'.repeat(64);
  await t.run(ctx => ctx.db.insert('cadUploadSessions', {
    ...legacyBinding, credentialDigest: legacyAllowedDigest,
    sessionId: 'legacy-revoked-allowed-session', cadUploadAllowed: true,
  }));
  expect(await invoke(t, 'session.read', { credentialDigest: legacyAllowedDigest }, now)).toBeNull();

  const active = { ...legacyBinding, credentialDigest: '4'.repeat(64), shopId: account.shopId,
    sessionId: 'invalid-active-session', cadUploadAllowed: true, csrfDigest: '7'.repeat(64),
    issuedAt: now, expiresAt: now + 60_000, status: 'active' as const };
  await expect(t.run(ctx => ctx.db.insert('cadUploadSessions', active as never))).rejects.toThrow();
  const { csrfDigest: _csrfDigest, ...missingCsrf } = active;
  await expect(t.run(ctx => ctx.db.insert('cadUploadSessions', {
    ...missingCsrf, credentialDigest: '5'.repeat(64), sessionId: 'missing-csrf-session',
    transport: 'cookie' as const,
  } as never))).rejects.toThrow();
  await expect(t.run(ctx => ctx.db.insert('cadUploadSessions', {
    ...active, credentialDigest: '8'.repeat(64), shopId: legacy.shopId,
    sessionId: 'legacy-shop-active-session', transport: 'cookie' as const,
  } as never))).rejects.toThrow();
});

test('resource and all-in daily reservations are fixed at six attempts and twelve dollars', () => {
  expect(AUTHENTICATED_IGS_LIMITS.SOURCE_MAX_BYTES).toBe(8 * 1024 * 1024);
  expect(AUTHENTICATED_IGS_LIMITS.MAX_DAILY_ATTEMPTS).toBe(6);
  expect(AUTHENTICATED_IGS_LIMITS.MAX_DAILY_ATTEMPTS
    * AUTHENTICATED_IGS_LIMITS.COST_PER_ATTEMPT_MICROS)
    .toBe(AUTHENTICATED_IGS_LIMITS.MAX_DAILY_RESERVED_COST_MICROS);
  expect(AUTHENTICATED_IGS_LIMITS.MAX_DAILY_RESERVED_COST_MICROS).toBe(12_000_000);
});

test('daily quota admits six attempts and rejects a seventh before insertion', async () => {
  const t = setup();
  const account = await identity(t);
  const now = Date.now();
  const uploadSessionId = 'six-attempt-session';
  const record = { schemaVersion: 2, userId: account.userId, shopId: account.shopId,
    loginSessionId: account.sessionId, sessionId: uploadSessionId, authMethod: 'password',
    cadUploadAllowed: true, transport: 'cookie', issuedAt: now,
    expiresAt: now + 5 * 60_000, status: 'active', csrfDigest: '0'.repeat(64) };
  expect(await invoke(t, 'session.insert', { credentialDigest: 'f'.repeat(64), record }, now)).toBe(true);
  const owner = { userId: account.userId, shopId: account.shopId, uploadSessionId };
  const idempotencyDigests = ['1', '2', '3', '4', '5', '6', '7'];
  const requestDigests = ['a', 'b', 'c', 'd', 'e', 'f', '0'];

  for (let index = 0; index < 6; index += 1) {
    expect(await invoke(t, 'job.claim', { owner, jobId: `daily-job-${index + 1}`,
      idempotencyDigest: idempotencyDigests[index].repeat(64),
      requestDigest: requestDigests[index].repeat(64), extension: 'igs', contentLength: 1024 },
    now + index + 1)).toMatchObject({ accepted: true, duplicate: false });
  }

  expect(await invoke(t, 'job.claim', { owner, jobId: 'daily-job-7',
    idempotencyDigest: idempotencyDigests[6].repeat(64),
    requestDigest: requestDigests[6].repeat(64), extension: 'igs', contentLength: 1024 }, now + 7))
    .toEqual({ accepted: false, code: 'UPLOAD_QUOTA_EXHAUSTED' });
  const quota = await t.run(ctx => ctx.db.query('cadAuthenticatedIgsQuota')
    .withIndex('by_scopeKey', q => q.eq('scopeKey', String(account.shopId))).unique());
  expect(quota).toMatchObject({ attemptCount: 6, reservedCostMicros: 12_000_000 });
  expect(await t.run(ctx => ctx.db.query('cadAuthenticatedIgsJobs').collect())).toHaveLength(6);
});

test('current login, membership and paid CAD entitlement are all required', async () => {
  const t = setup();
  const free = await identity(t, 'free');
  await expect(free.client.mutation(api.cadAuthenticatedIgs.authorizeCurrent, {}))
    .rejects.toThrow('CAD_ENTITLEMENT_REQUIRED');
  await t.run(ctx => ctx.db.patch(free.shopId, { planId: 'pro_shop' }));
  await expect(free.client.mutation(api.cadAuthenticatedIgs.authorizeCurrent, {})).resolves
    .toMatchObject({ userId: free.userId, shopId: free.shopId, loginSessionId: free.sessionId,
      authMethod: 'password', cadUploadAllowed: true });
  await t.run(async ctx => {
    const membership = await ctx.db.query('memberships').withIndex('by_userId', q =>
      q.eq('userId', free.userId)).unique();
    await ctx.db.patch(membership!._id, { active: false });
  });
  await expect(free.client.mutation(api.cadAuthenticatedIgs.authorizeCurrent, {}))
    .rejects.toThrow('ACCOUNT_REQUIRED');
});

test('durable upload session, quota, idempotency and terminal conversion state survive client recreation', async () => {
  const t = setup();
  const account = await identity(t);
  const now = Date.now();
  const uploadSessionId = 'upload-session-one';
  const record = { schemaVersion: 2, userId: account.userId, shopId: account.shopId,
    loginSessionId: account.sessionId, sessionId: uploadSessionId, authMethod: 'password',
    cadUploadAllowed: true, transport: 'cookie', issuedAt: now,
    expiresAt: now + 5 * 60_000, status: 'active', csrfDigest: 'a'.repeat(64) };
  expect(await invoke(t, 'session.insert', { credentialDigest: 'b'.repeat(64), record }, now)).toBe(true);
  expect(await invoke(t, 'session.read', { credentialDigest: 'b'.repeat(64) }, now + 1))
    .toMatchObject({ sessionId: uploadSessionId, userId: account.userId, shopId: account.shopId,
      status: 'active' });
  const owner = { userId: account.userId, shopId: account.shopId, uploadSessionId };
  const claim = { owner, jobId: 'job-one', idempotencyDigest: 'c'.repeat(64),
    requestDigest: 'd'.repeat(64), extension: 'igs', contentLength: 701346 };
  expect(await invoke(t, 'job.claim', claim, now + 2)).toMatchObject({ accepted: true,
    duplicate: false, job: { state: 'admitted', attemptCount: 0 } });
  expect(await invoke(t, 'job.claim', claim, now + 3)).toMatchObject({ accepted: true,
    duplicate: true, job: { jobId: 'job-one' } });
  expect(await invoke(t, 'job.claim', { ...claim, requestDigest: 'e'.repeat(64) }, now + 4))
    .toMatchObject({ accepted: false, code: 'IDEMPOTENCY_CONFLICT' });
  expect(await invoke(t, 'job.claim', { ...claim, jobId: 'too-large',
    idempotencyDigest: 'f'.repeat(64), contentLength: 8 * 1024 * 1024 + 1 }, now + 5))
    .toMatchObject({ accepted: false, code: 'UPLOAD_DENIED' });

  const original = { schemaVersion: 1, artifactId: 'original-one', ...owner,
    kind: 'original-igs', format: 'model/iges', byteCount: 701346,
    restrictedDigest: '1'.repeat(64), providerObjectKey: `phase5/${'2'.repeat(64)}`,
    objectKeyDigest: '3'.repeat(64), state: 'reserved', createdAt: now + 6,
    retainedUntil: now + 86_400_000, generation: 1 };
  const policy = { maxStoredBytes: 12 * 1024 * 1024, maxObjects: 12,
    maxClassAOperations: 1000, maxClassBOperations: 1000, maxDeleteOperations: 1000 };
  expect(await invoke(t, 'artifact.reserve', { scopeKey: account.shopId, owner,
    record: original, policy }, now + 6)).toBe(true);
  expect(await invoke(t, 'artifact.transition', { artifactId: original.artifactId, owner,
    expectedGeneration: 1, transition: 'stored', reasonDigest: null }, now + 7)).toBe(true);
  expect(await invoke(t, 'job.attachOriginal', { owner, jobId: 'job-one',
    artifactId: original.artifactId }, now + 8)).toBe(true);
  expect(await invoke(t, 'job.claimConversion', { owner, jobId: 'job-one' }, now + 9))
    .toMatchObject({ accepted: true, job: { state: 'converting', attemptCount: 1 } });
  expect(await invoke(t, 'job.claimConversion', { owner, jobId: 'job-one' }, now + 10))
    .toMatchObject({ accepted: false, code: 'CONVERSION_ALREADY_CLAIMED' });

  const nextClaim = { ...claim, jobId: 'job-two', idempotencyDigest: '9'.repeat(64),
    requestDigest: '8'.repeat(64) };
  expect(await invoke(t, 'job.claim', nextClaim, now + 11)).toMatchObject({ accepted: true });
  const secondOriginal = { ...original, artifactId: 'original-two',
    providerObjectKey: `phase5/${'5'.repeat(64)}`, objectKeyDigest: '6'.repeat(64),
    restrictedDigest: '7'.repeat(64), createdAt: now + 12, retainedUntil: now + 86_400_012 };
  expect(await invoke(t, 'artifact.reserve', { scopeKey: account.shopId, owner,
    record: secondOriginal, policy }, now + 12)).toBe(true);
  expect(await invoke(t, 'artifact.transition', { artifactId: secondOriginal.artifactId, owner,
    expectedGeneration: 1, transition: 'stored', reasonDigest: null }, now + 13)).toBe(true);
  expect(await invoke(t, 'job.attachOriginal', { owner, jobId: 'job-two',
    artifactId: secondOriginal.artifactId }, now + 14)).toBe(true);
  expect(await invoke(t, 'job.claimConversion', { owner, jobId: 'job-two' }, now + 60_010))
    .toMatchObject({ accepted: true, job: { state: 'converting', attemptCount: 1 } });

  const recreated = t.withIdentity({ issuer: 'https://commercial-synthetic.convex.site',
    subject: `${account.userId}|${account.sessionId}` });
  await expect(recreated.mutation(api.cadAuthenticatedIgs.authorizeCurrent, {})).resolves
    .toMatchObject({ shopId: account.shopId });
  const terminal = await invoke(t, 'job.read', { currentSessionId: uploadSessionId,
    jobId: 'job-one' }, now + 60_011);
  expect(terminal).toMatchObject({ state: 'quarantined', attemptCount: 1,
    code: 'CONVERSION_OUTCOME_UNKNOWN' });
  expect(JSON.stringify(terminal)).not.toContain('restrictedDigest');
  expect(JSON.stringify(terminal)).not.toContain('providerObjectKey');
  expect(await invoke(t, 'artifact.transition', { artifactId: original.artifactId, owner,
    expectedGeneration: 2, transition: 'deleting', reasonDigest: null }, now + 60_012)).toBe(true);
  expect(await invoke(t, 'artifact.confirmDeleted', { scopeKey: account.shopId,
    artifactId: original.artifactId, owner, expectedGeneration: 3,
    tombstoneDigest: '4'.repeat(64) }, now + 60_013)).toMatchObject({ deleted: true });
  expect(await invoke(t, 'job.artifacts', { currentSessionId: uploadSessionId,
    jobId: 'job-one' }, now + 60_014)).toMatchObject({ artifactIds: { original: null } });
});
