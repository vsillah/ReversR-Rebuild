// Offline composition only. Trusted host ports model verification; no listener or SDK client.
const { createPositiveSyntheticSession } = require('./positiveSyntheticSession');
const { createSyntheticRunRegister, cohort, keys } = require('./syntheticRunRegister');
const { createSyntheticRemovalBoundary } = require('./syntheticRemovalBoundary');
const fail = () => { throw Error('TRANSPORT_UNAVAILABLE'); };
const id = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v);
function createVerifiedSyntheticTransport({ testOnly, record, expected, journalPath, now = Date.now,
  removalMode = 'pinned-sdk', sdkVersion = '0.0.95', policy, host, timeoutMs = 800 } = {}) {
  let register, removal;
  try {
    if (testOnly !== true || !host || !['verifyService', 'serverContext', 'readExactSession',
      'invoke', 'recordPending', 'recordOwnership'].every(k => typeof host[k] === 'function')) fail();
    register = createSyntheticRunRegister({ testOnly, record, expected, journalPath, now });
    removal = createSyntheticRemovalBoundary({ testOnly, mode: removalMode, sdkVersion });
    register.claim();
  } catch { fail(); }
  const endAt = register.options().endAt, serviceSubjectRef = record.serviceSubjectRef;
  const owners = [null, null];
  // Captured host methods are trusted installation dependencies, never client parameters.
  const ports = Object.fromEntries(['verifyService', 'serverContext', 'readExactSession', 'invoke', 'recordPending', 'recordOwnership']
    .map(k => [k, host[k].bind(host)]));
  let active = true;
  const check = () => { if (!active) fail(); return register.check(); };
  const wrapped = Object.fromEntries(['prepare', 'provision', 'signIn', 'exactSession', 'logout', 'revoke', 'inventory', 'remove']
    .map(operation => [operation, async (args, ticket) => {
      try {
        const n = check();
        const fresh = () => {
          const time = check();
          if (time >= Math.min(n + timeoutMs, endAt)) fail();
          return time;
        };
        const slot = operation === 'prepare' ? null : args.slot;
        const privateOperation = register.privateOperation(ticket.sequence, ticket.operation, slot);
        // This blocks even a malicious supportedRemoval:true prepare fixture before provisioning.
        if (operation === 'prepare' || operation === 'provision') removal.requireProvisioning();
        if (operation === 'remove') removal.requireRemoval();
        const service = await ports.verifyService(privateOperation);
        fresh();
        if (!keys(service, ['binding', 'verified', 'identityKind', 'subjectRef', 'revoked', 'expiresAt', 'origin'])
          || service.verified !== true || service.identityKind !== 'service' || service.subjectRef !== serviceSubjectRef
          || service.revoked !== false || service.origin !== 'http://localhost:5001'
          || !Number.isSafeInteger(service.expiresAt) || service.expiresAt <= fresh()
          || service.expiresAt > endAt) fail();
        register.check(service.binding);
        const owner = slot === null ? null : owners[slot];
        if (!['prepare', 'provision'].includes(operation) && (!owner || args.userId && args.userId !== owner.userId
          || args.accountId && args.accountId !== owner.accountId
          || args.loginSessionId && args.loginSessionId !== owner.loginSessionId)) fail();
        let context = null;
        if (operation === 'exactSession' || operation === 'logout') {
          const verifiedContext = await ports.serverContext(privateOperation);
          fresh();
          if (!keys(verifiedContext, ['context', 'binding', 'verified', 'identityKind', 'userId', 'loginSessionId'])
            || verifiedContext.verified !== true || verifiedContext.identityKind !== 'user'
            || verifiedContext.userId !== owner.userId || verifiedContext.loginSessionId !== owner.loginSessionId
            || !verifiedContext.context) fail();
          register.check(verifiedContext.binding);
          context = verifiedContext.context;
          // Only the server-owned context is passed to the actual exact-session reader and operation.
          // No principal, decoded JWT claims or deploy-key identity can be supplied by either client.
          const horizon = operation === 'exactSession' ? args.validThrough : Math.min(fresh() + timeoutMs, endAt);
          const proof = await ports.readExactSession(context, owner.loginSessionId, horizon);
          if (fresh() >= horizon) fail();
          if (ticket.operation === 'verifyRevoked') {
            if (proof !== null) fail();
          } else if (!keys(proof, ['userId', 'loginSessionId', 'authMethod', 'expiresAt', 'active'])
            || proof.userId !== owner.userId || proof.loginSessionId !== owner.loginSessionId
            || proof.authMethod !== 'password' || proof.active !== true
            || !Number.isSafeInteger(proof.expiresAt) || proof.expiresAt <= horizon
            || proof.expiresAt > endAt) fail();
          if (operation === 'exactSession') {
            if (service.expiresAt <= fresh()) fail();
            return proof;
          }
        }
        if (service.expiresAt <= fresh()) fail();
        if (await ports.recordPending(privateOperation, owner ? { ...owner } : { cohortSlot: slot }) !== null) fail();
        if (service.expiresAt <= fresh()) fail();
        const result = await ports.invoke(operation, args, context, privateOperation);
        if (service.expiresAt <= fresh()) fail();
        if (operation === 'prepare') {
          if (!keys(result, ['counts', 'passwordOnly', 'supportedRemoval', 'diagnosticsReviewed'])) fail();
          return { ...result, supportedRemoval: removal.inspect().supportedRemoval };
        }
        if (operation === 'provision' || operation === 'signIn') {
          if (operation === 'provision') {
            if (!keys(result, ['userId', 'accountId', 'created']) || result.created !== true
              || !id(result.userId) || !id(result.accountId) || owner
              || owners.some(o => o && (o.userId === result.userId || o.accountId === result.accountId))) fail();
          } else if (!keys(result, ['userId', 'loginSessionId']) || result.userId !== owner.userId
            || !id(result.loginSessionId) || owner.loginSessionId
            || owners.some(o => o?.loginSessionId === result.loginSessionId)) fail();
          // Private adapter must persist exact run/operation/cohort ownership before success.
          // A failed receipt after mutation is unknown in the shared ledger; never retry.
          const selection = { ...(owner || {}), ...result }; delete selection.created;
          if (await ports.recordOwnership(privateOperation, { ...selection }) !== null) fail();
          if (service.expiresAt <= fresh()) fail(); owners[slot] = Object.freeze(selection);
        }
        return result;
      } catch { fail(); }
    }]));
  const run = createPositiveSyntheticSession({ testOnly, cohort, policy, ports: wrapped,
    ledger: { ...register.options(), timeoutMs } });
  // A timeout may leave a host promise alive. Stop all subsequent adapter stages on settlement.
  const guard = fn => async (...args) => {
    try { return await fn(...args); }
    catch (error) { if (run.status().stopped) active = false; throw error; }
  };
  const clients = [0, 1].map(slot => Object.freeze(Object.fromEntries(
    Object.entries(run.client(slot)).map(([k, fn]) => [k, guard(fn)]))));
  return Object.freeze({
    ...Object.fromEntries(['prepare', 'provision', 'revoke', 'verifyRevoked', 'inventory', 'remove'].map(k => [k, guard(run[k])])),
    client(slot) { if (slot !== 0 && slot !== 1) throw Error('QUALIFICATION_UNAVAILABLE'); return clients[slot]; },
    status: () => ({ ...run.status(), removal: removal.inspect(), register: register.status() }),
    close() { run.close(); active = false; },
  });
}
module.exports = { createVerifiedSyntheticTransport };
