/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { test, expect, vi } from 'vitest';
import { makeFunctionReference } from 'convex/server';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
const modules = import.meta.glob('../convex/**/*.{ts,js}');
const setup = () => convexTest(schema, modules);
async function identity(t: ReturnType<typeof setup>, email = 'same@synthetic.invalid') {
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email });
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 60000 });
    return { userId, sessionId };
  });
  const client = t.withIdentity({ issuer: 'https://commercial-synthetic.convex.site', subject: `${ids.userId}|${ids.sessionId}` });
  return { ...ids, client };
}
const debit = { feature: 'analyze', key: 'same', requestHash: 'a'.repeat(64) };
test('real registered auth/user/session checks deny guests, wrong issuers and expired/deleted sessions', async () => {
  const t = setup();
  await expect(t.mutation(api.accounts.me, {})).rejects.toThrow('LOGIN_REQUIRED');
  const a = await identity(t);
  await expect(t.withIdentity({ issuer: 'https://wrong.invalid', subject: `${a.userId}|${a.sessionId}` }).mutation(api.accounts.me, {})).rejects.toThrow('LOGIN_REQUIRED');
  await t.run(ctx => ctx.db.patch(a.sessionId, { expirationTime: 0 }));
  await expect(a.client.mutation(api.accounts.me, {})).rejects.toThrow('SESSION_EXPIRED');
  await t.run(ctx => ctx.db.delete(a.sessionId));
  await expect(a.client.mutation(api.accounts.me, {})).rejects.toThrow('SESSION_EXPIRED');
});
test('identical emails create separate persistent shops, remain unverified, and survive client recreation', async () => {
  const t = setup(); const a = await identity(t); const b = await identity(t);
  const first = await a.client.mutation(api.accounts.me, {});
  const second = await b.client.mutation(api.accounts.me, {});
  expect(first.shopId).not.toEqual(second.shopId); expect(first.emailVerified).toBe(false);
  const recreated = t.withIdentity({ issuer: 'https://commercial-synthetic.convex.site', subject: `${a.userId}|${a.sessionId}` });
  expect((await recreated.mutation(api.accounts.me, {})).shopId).toBe(first.shopId);
  await expect(a.client.mutation(api.accounts.profile, { name: 'New name', shopName: 'New shop' })).resolves.toMatchObject({ name: 'New name', shopId: first.shopId });
});
test('session ownership mismatch and deleted user are denied', async () => {
  const t = setup(); const a = await identity(t); const b = await identity(t);
  const mismatched = t.withIdentity({ issuer: 'https://commercial-synthetic.convex.site', subject: `${a.userId}|${b.sessionId}` });
  await expect(mismatched.mutation(api.accounts.me, {})).rejects.toThrow('SESSION_EXPIRED');
  await t.run(ctx => ctx.db.delete(a.userId));
  await expect(a.client.mutation(api.accounts.me, {})).rejects.toThrow('SESSION_EXPIRED');
});
test('billing and shop profile require owner, not merely membership', async () => {
  const t = setup(); const a = await identity(t); const b = await identity(t);
  const shop = await a.client.mutation(api.accounts.me, {});
  await t.run(ctx => ctx.db.insert('memberships', { userId: b.userId, shopId: shop.shopId, active: true, role: 'member' }));
  await expect(b.client.mutation(internal.billingState.prepare, { planId: 'pro_shop', intent: 'synthetic' })).rejects.toThrow('OWNER_REQUIRED');
  await expect(b.client.mutation(api.accounts.profile, { name: 'Hijack', shopName: 'Hijack' })).rejects.toThrow('OWNER_REQUIRED');
});
test('quota transaction scopes duplicate keys per shop and rejects mismatched payloads', async () => {
  const t = setup(); const a = await identity(t); const b = await identity(t);
  await a.client.mutation(api.accounts.me, {}); await b.client.mutation(api.accounts.me, {});
  expect(await a.client.mutation(internal.ledger.debit, debit)).toMatchObject({ used: 1, duplicate: false });
  expect(await a.client.mutation(internal.ledger.debit, debit)).toMatchObject({ used: 1, duplicate: true });
  expect(await b.client.mutation(internal.ledger.debit, debit)).toMatchObject({ used: 1, duplicate: false });
  await expect(a.client.mutation(internal.ledger.debit, { ...debit, requestHash: 'b'.repeat(64) })).rejects.toThrow('IDEMPOTENCY_CONFLICT');
});
test('concurrent exhaustion permits exactly one of two remaining debits in convex-test', async () => {
  const t = setup(); const a = await identity(t); await a.client.mutation(api.accounts.me, {});
  for (let i = 0; i < 4; i++) await a.client.mutation(internal.ledger.debit, { ...debit, key: `${i}` });
  const results = await Promise.allSettled([a.client.mutation(internal.ledger.debit, { ...debit, key: 'last-a' }), a.client.mutation(internal.ledger.debit, { ...debit, key: 'last-b' })]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect((await a.client.mutation(api.accounts.me, {})).usedCredits).toBe(5);
});
test('transaction rollback discards the real registered debit on parent failure', async () => {
  const t = convexTest(schema, { ...modules, '../convex/rollback.ts': () => import('./rollback.fixture') });
  const a = await identity(t); await a.client.mutation(api.accounts.me, {});
  await expect(a.client.mutation(makeFunctionReference<'mutation'>('rollback:fail'), {})).rejects.toThrow('SYNTHETIC_COMMIT_FAILURE');
  expect((await a.client.mutation(api.accounts.me, {})).usedCredits).toBe(0);
});
test('missing configuration denies and workflow remains closed despite paid identity', async () => {
  const t = setup(); const a = await identity(t); await a.client.mutation(api.accounts.me, {});
  await expect(a.client.mutation(api.accounts.authorizeWorkflow, { feature: 'generate-bom' })).rejects.toThrow('WORKFLOW_POLICY_PENDING');
  vi.stubEnv('COMMERCIAL_ASSEMBLY', '');
  await expect(a.client.mutation(api.accounts.me, {})).rejects.toThrow('COMMERCIAL_UNAVAILABLE');
});
test('webhook state transactions handle cancellation, recovery, duplicates and racing reconciliations', async () => {
  const t = setup(); const a = await identity(t); const account = await a.client.mutation(api.accounts.me, {});
  await a.client.mutation(internal.billingState.prepare, { planId: 'pro_shop', intent: 'intent-one' });
  await a.client.mutation(internal.billingState.bindCustomer, { customerId: 'cus_synthetic', intent: 'intent-one' });
  const apply = async (eventId: string, status: string) => {
    const lease = await t.mutation(internal.billingState.beginEvent, { eventId, customerId: 'cus_synthetic' });
    if (lease) await t.mutation(internal.billingState.applyEvent, { ...lease, eventId, customerId: 'cus_synthetic', subscriptionId: 'sub_synthetic', status, planId: 'pro_shop', periodEnd: 2000000000000, intent: 'intent-one', metadataShopId: account.shopId });
  };
  await apply('evt_active', 'active'); expect((await a.client.mutation(api.accounts.me, {})).planId).toBe('pro_shop');
  await apply('evt_failed', 'past_due'); expect((await a.client.mutation(api.accounts.me, {})).planId).toBe('free');
  await apply('evt_recovered', 'active'); await apply('evt_failed', 'past_due');
  expect((await a.client.mutation(api.accounts.me, {})).planId).toBe('pro_shop');
  const old = await t.mutation(internal.billingState.beginEvent, { eventId: 'evt_old', customerId: 'cus_synthetic' });
  await apply('evt_cancel', 'canceled');
  await expect(t.mutation(internal.billingState.applyEvent, { ...old!, eventId: 'evt_old', customerId: 'cus_synthetic', subscriptionId: 'sub_synthetic', status: 'active', planId: 'pro_shop', periodEnd: 2000000000000, intent: '', metadataShopId: account.shopId })).rejects.toThrow('RECONCILE_RETRY');
  expect((await a.client.mutation(api.accounts.me, {})).planId).toBe('free');
});

test('late canceled-subscription event preserves the replacement intent; retired replay cannot downgrade it', async () => {
  const t = setup(); const a = await identity(t); const account = await a.client.mutation(api.accounts.me, {});
  await a.client.mutation(internal.billingState.prepare, { planId: 'pro_shop', intent: 'first' });
  await a.client.mutation(internal.billingState.bindCustomer, { customerId: 'cus_replace', intent: 'first' });
  const apply = async (eventId: string, subscriptionId: string, status: string, intent: string) => {
    const lease = await t.mutation(internal.billingState.beginEvent, { eventId, customerId: 'cus_replace' });
    if (lease) await t.mutation(internal.billingState.applyEvent, { ...lease, eventId, customerId: 'cus_replace', subscriptionId, status, planId: 'pro_shop', periodEnd: 2000000000000, intent, metadataShopId: account.shopId });
  };
  await apply('evt_first', 'sub_first', 'canceled', 'first');
  await a.client.mutation(internal.billingState.prepare, { planId: 'pro_shop', intent: 'second' });
  await apply('evt_late', 'sub_first', 'canceled', 'first');
  expect((await t.run(ctx => ctx.db.get(account.shopId)))?.checkoutIntent).toBe('second');
  await apply('evt_second', 'sub_second', 'active', 'second');
  await apply('evt_retired', 'sub_first', 'canceled', 'first');
  expect((await a.client.mutation(api.accounts.me, {})).planId).toBe('pro_shop');
  await expect(a.client.mutation(internal.billingState.prepare, { planId: 'team', intent: 'team' })).rejects.toThrow('TEAM_PROVISIONING_PENDING');
});
