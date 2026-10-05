const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const { registerCommercialRoutes } = require('../../server/commercialization');
// Register the real route in a new process, then invoke its handler without a socket.
const app = express();
registerCommercialRoutes(app, { resolveIdentity: async () => ({ issuer: 'local-fixture', subject: 'exhaustion' }) });
const handler = app.router.stack.find(layer => layer.route?.path === '/api/me').route.stack[0].handle;
const req = { app, body: {}, get: () => '' };
const res = { headersSent: false, status(code) { this.code = code; return this; }, json(body) { this.body = body; this.headersSent = true; } };
handler(req, res).then(async () => {
  assert.equal(res.body.usage.usedCredits, 5);
  assert.equal(res.body.usage.remainingCredits, 0);
  const store = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  assert.ok(store.stripeEvents.evt_a);
  assert.ok(Object.values(store.shops).some(shop => shop.stripeCustomerId === 'cus_a'));
  process.env.STRIPE_PRICE_PRO_SHOP = 'price_synthetic';
  const checkout = app.router.stack.find(layer => layer.route?.path === '/api/billing/checkout-session').route.stack[0].handle;
  const result = { ...res, headersSent: false, body: undefined };
  await checkout({ app, body: { planId: 'pro_shop' }, get: () => '' }, result);
  assert.equal(result.code, 503, 'missing Stripe client must deny');
  console.log('restart persistence passed');
}).catch(error => { console.error(error); process.exitCode = 1; });
