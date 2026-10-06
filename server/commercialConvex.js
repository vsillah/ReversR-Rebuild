const { ConvexHttpClient } = require('convex/browser');
const { makeFunctionReference } = require('convex/server');

function configuration(env = process.env) {
  const url = env.COMMERCIAL_CONVEX_URL;
  const issuer = env.COMMERCIAL_CONVEX_ISSUER;
  if (env.COMMERCIAL_BACKEND !== 'convex' || !url || !/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(url)
      || issuer !== url.replace('.convex.cloud', '.convex.site')) return null;
  return { url, issuer };
}
function client(req) {
  const config = configuration();
  if (!config) throw Object.assign(new Error('Commercial backend unavailable. Ask support to finish the reviewed account setup.'), { statusCode: 503 });
  const authorization = req.get('authorization') || '';
  if (!/^Bearer \S+$/.test(authorization)) throw Object.assign(new Error('Sign in to your commercial account.'), { statusCode: 401 });
  const sdk = new ConvexHttpClient(config.url);
  sdk.setAuth(authorization.slice(7));
  return sdk;
}
function failure(res, error) {
  const message = String(error?.data || error?.message || 'Commercial operation unavailable');
  const status = error.statusCode || (/LOGIN_REQUIRED|SESSION_EXPIRED/.test(message) ? 401
    : /OWNER_REQUIRED/.test(message) ? 403 : /CREDITS_EXHAUSTED|CONFLICT|CHECKOUT_RECONCILIATION|USE_BILLING_PORTAL/.test(message) ? 409 : 503);
  res.status(status).json({ status: 'error', error: status === 401 ? 'Your session expired. Sign in again.'
    : status === 403 ? 'Only the shop owner can manage billing or the shop profile.'
    : status === 409 ? 'Billing needs review. Use the billing portal or contact support.'
    : 'Commercial service unavailable. Refresh or contact support; no work was admitted.', canRetry: status === 503 });
}
const reference = name => makeFunctionReference(name);
function register(app, formatAccount) {
  const account = async (req, res, mode) => {
    try {
      const sdk = client(req);
      const raw = mode === 'profile'
        ? await sdk.mutation(reference('accounts:profile'), { name: String(req.body?.profile?.name || ''), shopName: String(req.body?.profile?.shopName || '') })
        : await sdk.mutation(reference('accounts:me'), {});
      const value = formatAccount(raw);
      res.json(mode === 'usage' ? { status: 'ok', usage: value.usage, creditCosts: value.creditCosts }
        : mode === 'entitlements' ? { status: 'ok', entitlements: value.entitlements, plans: value.plans } : value);
    } catch (error) { failure(res, error); }
  };
  app.get('/api/me', (req, res) => account(req, res));
  app.get('/api/usage', (req, res) => account(req, res, 'usage'));
  app.get('/api/entitlements', (req, res) => account(req, res, 'entitlements'));
  app.post('/api/commercial/profile', (req, res) => account(req, res, 'profile'));
  for (const [route, action] of [['checkout-session', 'checkout'], ['portal-session', 'portal']]) {
    app.post(`/api/billing/${route}`, async (req, res) => {
      try { res.json({ status: 'ok', ...await client(req).action(reference(`billing:${action}`), action === 'checkout' ? { planId: req.body?.planId } : {}) }); }
      catch (error) { failure(res, error); }
    });
  }
  app.use(['/api/commercial', '/api/support', '/api/admin/commercial', '/api/admin/support', '/api/billing'], (_req, res) => {
    res.status(503).json({ status: 'error', error: 'This commercial operation is not integrated. Contact support.' });
  });
}
async function charge(req, res, feature) {
  try { await client(req).mutation(reference('accounts:authorizeWorkflow'), { feature }); }
  catch (error) { failure(res, error); return { ok: false }; }
  // Never infer admission from an unexpected empty/successful remote response.
  res.status(503).json({ status: 'error', error: 'Journey authorization is not integrated.' });
  return { ok: false };
}
async function webhook(req, res) {
  const config = configuration();
  if (!config) return res.status(503).json({ error: 'Commercial webhook unavailable.' });
  try {
    const response = await fetch(`${config.issuer}/stripe`, { method: 'POST', redirect: 'error',
      signal: AbortSignal.timeout(15000), headers: { 'content-type': 'application/json', 'stripe-signature': req.get('stripe-signature') || '' }, body: req.body });
    res.status(response.ok ? 200 : 503).json({ received: response.ok });
  } catch { res.status(503).json({ received: false }); }
}
module.exports = { configuration, register, charge, webhook };
