import React from 'react';
import { createRoot } from 'react-dom/client';
import AccountScreen from '../../app/account';
import { CommercialProvider } from '../../hooks/useCommercialization';
import { AppThemeProvider } from '../../hooks/useAppTheme';
import { MockAuth } from './mockAuth';
import { PLAN_CATALOG, CREDIT_COSTS } from './mockCatalog';
import { runRevealEventChecks } from './reveal-event-checks';
import { RevealHookProbe } from './reveal-hook-probe';

function RevealChecks() {
  const [result, setResult] = React.useState('');
  return <div><button onClick={() => { setResult('Running local event checks…'); void runRevealEventChecks().then(setResult).catch(error => setResult(error.message)); }}>Run local reveal event checks</button><output>{result}</output><RevealHookProbe /></div>;
}

let expired = false, failSave = false, slow = false;
window.addEventListener('qa-expire', () => { expired = true; });
window.addEventListener('qa-recover', () => { expired = false; });
window.addEventListener('qa-fail-save', () => { failSave = true; });
window.addEventListener('qa-slow-refresh', () => { slow = true; });
window.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith(`${location.origin}/qa-api/`)) throw Error('Network forbidden in QA');
  const token = new Headers(init?.headers).get('authorization');
  if (!token || expired) return Response.json({ error: 'Your session expired. Sign in again.' }, { status: 401 });
  if (url.endsWith('/profile') && failSave) { failSave = false; return Response.json({ error: 'Synthetic save denied. Refresh and retry.' }, { status: 403 }); }
  if (slow && url.endsWith('/me')) { slow = false; await new Promise(resolve => setTimeout(resolve, 900)); }
  if (url.includes('billing')) return Response.json({ error: 'Provider checkout is disabled in this local QA fixture.' }, { status: 503 });
  const saved = init?.body ? JSON.parse(String(init.body)).profile : null;
  return Response.json({ status: 'ok', profile: { id: token, name: saved?.name || 'Synthetic Owner', email: 'owner@synthetic.invalid', role: 'owner' },
    shop: { id: 'synthetic-shop', name: saved?.shopName || 'Public Fixture Repair Shop', billingOwnerUserId: token },
    billing: { planId: 'pro_shop', planLabel: 'Pro Shop', subscriptionStatus: 'active', currentPeriodEnd: '', hasStripeCustomer: true },
    usage: { usedCredits: 2, remainingCredits: 98, monthlyCredits: 100, period: 'month', resetAt: new Date(Date.now() + 86400000).toISOString(), events: [] },
    entitlements: { planId: 'pro_shop', monthlyCredits: 100, unlimitedCredits: false }, sessionExpiresAt: Date.now() + 60000,
    plans: Object.values(PLAN_CATALOG), creditCosts: CREDIT_COSTS, access: null });
};
createRoot(document.getElementById('root')!).render(<MockAuth><AppThemeProvider><CommercialProvider>
  <div style={{ maxWidth: 1100, margin: 'auto', minHeight: '100vh' }}>{new URLSearchParams(location.search).has('reveal-checks') && <RevealChecks />}<AccountScreen /></div>
</CommercialProvider></AppThemeProvider></MockAuth>);
