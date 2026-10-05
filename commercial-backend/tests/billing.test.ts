/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { test, expect, vi } from 'vitest';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
const io = vi.hoisted(() => ({ calls: 0, subscription: {} as any }));
vi.mock('stripe', async importOriginal => {
  const real = await importOriginal<typeof import('stripe')>();
  return { default: class extends real.default {
    constructor(...args: ConstructorParameters<typeof real.default>) {
      super(...args);
      this.customers.create = vi.fn(async () => { io.calls++; return { id: 'cus_fixture' }; }) as any;
      this.checkout.sessions.create = vi.fn(async () => { io.calls++; return { id: 'cs_fixture', url: 'https://checkout.synthetic.invalid' }; }) as any;
      this.subscriptions.retrieve = vi.fn(async () => { io.calls++; return io.subscription; }) as any;
    }
  } };
});
async function setup() {
  io.calls = 0;
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic_only');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_synthetic_only');
  vi.stubEnv('STRIPE_PRICE_PRO_SHOP', 'price_fixture');
  vi.stubEnv('COMMERCIAL_BILLING_RETURN_URL', 'https://return.synthetic.invalid/account');
  const t = convexTest(schema, import.meta.glob('../convex/**/*.{ts,js}'));
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: 'synthetic@example.invalid' });
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 60000 });
    return { userId, sessionId };
  });
  const owner = t.withIdentity({ issuer: 'https://commercial-synthetic.convex.site', subject: `${ids.userId}|${ids.sessionId}` });
  const account = await owner.mutation(api.accounts.me, {});
  return { t, owner, account };
}
test('registered checkout denies guests and Team before any provider I/O', async () => {
  const { t } = await setup();
  await expect(t.action(api.billing.checkout, { planId: 'team' })).rejects.toThrow('TEAM_PROVISIONING_PENDING');
  await expect(t.action(api.billing.checkout, { planId: 'pro_shop' })).rejects.toThrow('LOGIN_REQUIRED');
  expect(io.calls).toBe(0);
});
test('registered checkout binds the authenticated shop using mocked provider I/O', async () => {
  const { owner } = await setup();
  expect(await owner.action(api.billing.checkout, { planId: 'pro_shop' })).toMatchObject({ sessionId: 'cs_fixture' });
  expect(await owner.mutation(internal.billingState.portalCustomer, {})).toBe('cus_fixture');
  expect(io.calls).toBe(2);
});
test('real Stripe signature verification precedes reconciliation and duplicate delivery is ignored', async () => {
  const { t, owner, account } = await setup();
  await owner.mutation(internal.billingState.prepare, { planId: 'pro_shop', intent: 'fixture-intent' });
  await owner.mutation(internal.billingState.bindCustomer, { customerId: 'cus_fixture', intent: 'fixture-intent' });
  const body = JSON.stringify({ id: 'evt_fixture', type: 'customer.subscription.updated', data: { object: { id: 'sub_fixture', customer: 'cus_fixture' } } });
  await expect(t.action(internal.billing.webhook, { body, signature: 'invalid' })).rejects.toThrow();
  expect(io.calls).toBe(0);
  const { default: Stripe } = await vi.importActual<typeof import('stripe')>('stripe');
  const stripe = new Stripe('sk_test_synthetic_only');
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_synthetic_only' });
  io.subscription = { id: 'sub_fixture', customer: 'cus_fixture', status: 'active',
    items: { data: [{ price: { id: 'price_fixture' }, current_period_end: 2000000000 }] },
    metadata: { reversrShopId: account.shopId, reversrCheckoutIntent: 'fixture-intent' } };
  await t.action(internal.billing.webhook, { body, signature });
  expect((await owner.mutation(api.accounts.me, {})).planId).toBe('pro_shop');
  await t.action(internal.billing.webhook, { body, signature });
  expect(io.calls).toBe(1);
});
