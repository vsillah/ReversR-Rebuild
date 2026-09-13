// Source-only lifecycle coordinator. All dependencies are trusted local fixture ports.
// This does not register an Auth provider, a Convex function or a live transport.
const { createPositiveSyntheticLedger } = require('./positiveSyntheticLedger');
const tables = Object.freeze(['users', 'authAccounts', 'authSessions', 'authRefreshTokens',
  'authVerificationCodes', 'authVerifiers', 'authRateLimits',
  'cadUserAuthority', 'cadMemberships', 'cadUploadSessions']);
const deny = () => { throw Error('FLOW_DENIED'); };
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const counts = value => keys(value, tables) && Object.values(value).every(n => Number.isSafeInteger(n) && n >= 0 && n <= 20)
  && Object.values(value).reduce((sum, n) => sum + n, 0) <= 20;
const zero = value => counts(value) && Object.values(value).every(n => n === 0);

function createPositiveSyntheticSession({ testOnly, cohort, ports, policy, ledger: options } = {}) {
  let emails;
  try {
    if (testOnly !== true || !Array.isArray(cohort) || cohort.length !== 2
      || new Set(cohort).size !== 2
      || !cohort.every(e => typeof e === 'string' && /^cad-test-[a-z0-9-]{1,32}@auth-test\.invalid$/.test(e))) deny();
    emails = Object.freeze([...cohort]);
    if (!ports || !['prepare', 'provision', 'signIn', 'exactSession', 'logout', 'revoke', 'inventory', 'remove']
      .every(k => typeof ports[k] === 'function') || typeof policy?.profile !== 'function') deny();
  } catch { throw Error('QUALIFICATION_UNAVAILABLE'); }
  const ledger = createPositiveSyntheticLedger({ ...options, testOnly });
  const endAt = options.endAt;
  let prepared = false;
  const owners = [null, null];
  const clients = [null, null];
  const requireSlot = slot => { if (slot !== 0 && slot !== 1) deny(); };
  const owner = slot => { requireSlot(slot); if (!owners[slot]) deny(); return owners[slot]; };
  const session = slot => { const o = owner(slot); if (!o.sessionId || o.removed) deny(); return o; };
  const selection = slot => { const o = owner(slot); return { slot, userId: o.userId, accountId: o.accountId }; };
  const exact = (result, slot, horizon) => {
    const o = session(slot);
    if (!keys(result, ['userId', 'loginSessionId', 'authMethod', 'expiresAt', 'active'])
      || result.userId !== o.userId || result.loginSessionId !== o.sessionId
      || result.authMethod !== 'password' || result.active !== true
      || !Number.isSafeInteger(result.expiresAt) || result.expiresAt <= horizon
      || result.expiresAt > endAt) deny();
  };
  return Object.freeze({
    prepare: () => ledger.execute('prepare', () => { if (prepared) deny(); },
      () => ports.prepare(), result => {
        if (!keys(result, ['counts', 'passwordOnly', 'supportedRemoval', 'diagnosticsReviewed'])
          || !zero(result.counts) || result.passwordOnly !== true
          || result.supportedRemoval !== true || result.diagnosticsReviewed !== true) deny();
        prepared = true;
      }),
    provision: (slot, password) => ledger.execute('provision', () => {
      requireSlot(slot);
      if (!prepared || owners[slot] || typeof password !== 'string'
        || password.length < 12 || password.length > 128) deny();
    }, () => ports.provision({ slot, provider: 'password',
      account: { id: emails[slot], secret: password }, profile: { email: emails[slot] },
      shouldLinkViaEmail: false, shouldLinkViaPhone: false, requireAbsent: true }), result => {
      if (!keys(result, ['userId', 'accountId', 'created']) || result.created !== true
        || !id(result.userId) || !id(result.accountId)
        || owners.some(o => o && (o.userId === result.userId || o.accountId === result.accountId))) deny();
      owners[slot] = { userId: result.userId, accountId: result.accountId,
        sessionId: null, invalidated: false, denialVerified: false, removed: false };
    }, true),
    // Each client is permanently bound to one of the two reviewed slots.
    client(slot) {
      try { requireSlot(slot); } catch { throw Error('QUALIFICATION_UNAVAILABLE'); }
      if (clients[slot]) return clients[slot];
      clients[slot] = Object.freeze({
        signIn: params => {
          let validatedParams;
          return ledger.execute('signIn', () => {
            const o = owner(slot);
            if (owners.some(value => value === null) || o.sessionId || o.invalidated || o.removed
              || !keys(params, ['flow', 'email', 'password']) || params.email !== emails[slot]) deny();
            validatedParams = { ...params };
            const profile = policy.profile(validatedParams);
            if (profile.email !== emails[slot]) deny();
          }, () => ports.signIn({ slot, params: validatedParams }), result => {
            const o = owner(slot);
            if (!keys(result, ['userId', 'loginSessionId']) || result.userId !== o.userId
              || !id(result.loginSessionId) || owners.some(v => v?.sessionId === result.loginSessionId)) deny();
            o.sessionId = result.loginSessionId;
          }, true);
        },
        verify: horizon => ledger.execute('verify', n => {
          const o = session(slot);
          if (o.invalidated || !Number.isSafeInteger(horizon) || horizon <= n || horizon > Math.min(n + 800, endAt)) deny();
        }, () => ports.exactSession({ ...selection(slot), loginSessionId: session(slot).sessionId, validThrough: horizon }),
        (result, receivedAt) => { if (receivedAt >= horizon) deny(); exact(result, slot, horizon); }),
        logout: () => ledger.execute('logout', () => {
          if (session(slot).invalidated) deny();
        }, () => ports.logout({ ...selection(slot), loginSessionId: session(slot).sessionId }), result => {
          if (result !== null) deny(); session(slot).invalidated = true;
        }, true),
      });
      return clients[slot];
    },
    revoke: slot => ledger.execute('revoke', () => { if (session(slot).invalidated) deny(); },
      // No except list. Adapter must bound all sessions for this exclusively run-owned user.
      () => ports.revoke(selection(slot)), result => {
        if (result !== null) deny(); session(slot).invalidated = true;
      }, true),
    verifyRevoked: (slot, horizon) => ledger.execute('verifyRevoked', n => {
      if (!session(slot).invalidated || !Number.isSafeInteger(horizon) || horizon <= n
        || horizon > Math.min(n + 800, endAt)) deny();
    }, () => ports.exactSession({ ...selection(slot), loginSessionId: session(slot).sessionId, validThrough: horizon }),
    (result, receivedAt) => { if (result !== null || receivedAt >= horizon) deny(); session(slot).denialVerified = true; }),
    inventory: slot => ledger.execute('inventory', () => {
      const o = owner(slot); if (!o.denialVerified) deny();
    }, () => ports.inventory(selection(slot)), result => {
      const o = owner(slot);
      if (!counts(result) || result.authSessions !== 0 || result.authRefreshTokens !== 0
        || tables.some(t => t.startsWith('cad') && result[t] !== 0)
        || (o.removed ? !zero(result) : result.users !== 1 || result.authAccounts !== 1)) deny();
      o.inventory = { ...result };
    }),
    remove: slot => ledger.execute('remove', () => {
      const o = owner(slot);
      if (o.removed || !o.denialVerified || !o.inventory) deny();
    }, () => ports.remove({ ...selection(slot), expectedCounts: { ...owner(slot).inventory } }), result => {
      if (result !== null) deny(); const o = owner(slot); o.removed = true; o.inventory = null;
    }, true),
    status: () => ({ ...ledger.status(), provisioned: owners.filter(Boolean).length,
      sessions: owners.filter(o => o?.sessionId).length,
      revocationVerified: owners.filter(o => o?.denialVerified).length,
      cleanupVerified: owners.filter(o => o?.removed && zero(o.inventory)).length,
      cadUploadAllowed: false }),
    close: ledger.close,
  });
}
module.exports = { createPositiveSyntheticSession, tables };
