const { createDurableEngine, AUTHORITY_KINDS } = require('../../offline/cad-convex/durableEngine');
const clone = value => structuredClone(value);

function createFixture({ verifyIndependentEvidence = () => false, failAuthorityInsertAt = null } = {}) {
  let tick = 100, serial = 0;
  let state = { ledgers: [], authority: [] };
  function transaction(operation, input) {
    const snapshot = clone(state);
    let authorityInserts = 0;
    const store = {
      async readLedger(scope) {
        const rows = snapshot.ledgers.filter(row => ['resourceBindingDigest', 'namespaceDigest', 'runDigest',
          'ledgerDigest', 'windowDigest', 'fenceDigest'].every(key => row[key] === scope[key]));
        if (rows.length > 1) throw Error('duplicate');
        return clone(rows[0] ?? null);
      },
      async insertLedger(value) {
        const row = { _id: `ledger-${++serial}`, ...clone(value) };
        snapshot.ledgers.push(row); return clone(row);
      },
      async writeLedger(id, value) {
        const index = snapshot.ledgers.findIndex(row => row._id === id);
        if (index < 0) throw Error('missing');
        snapshot.ledgers[index] = clone(value);
      },
      async readAuthority(ledgerId, binding) {
        return clone(snapshot.authority.filter(row => row.ledgerId === ledgerId
          && ['userId', 'shopId', 'sessionId', 'loginSessionId'].every(key => row.binding[key] === binding[key])));
      },
      async insertAuthority(ledgerId, value) {
        authorityInserts++;
        if (authorityInserts === failAuthorityInsertAt) throw Error('forced');
        snapshot.authority.push({ _id: `authority-${++serial}`, ledgerId, ...clone(value) });
      },
      async writeAuthority(id, patch) {
        const row = snapshot.authority.find(value => value._id === id);
        if (!row) throw Error('missing');
        Object.assign(row, clone(patch));
      },
    };
    const engine = createDurableEngine({ store, now: () => tick, verifyIndependentEvidence });
    return engine[operation](clone(input)).then(result => { state = snapshot; return result; });
  }
  return { invoke: transaction, setTime: value => { tick = value; }, now: () => tick,
    snapshot: () => clone(state), restart: () => clone(state) };
}
const hex = label => Buffer.from(label).toString('hex').padEnd(64, '0').slice(0, 64);
const scope = Object.freeze({ resourceBindingDigest: hex('resource'), namespaceDigest: hex('namespace'),
  runDigest: hex('run'), ledgerDigest: hex('ledger'), windowDigest: hex('window'), fenceDigest: hex('fence') });
const binding = Object.freeze({ userId: 'synthetic-user', shopId: 'synthetic-shop',
  sessionId: 'synthetic-session', loginSessionId: 'synthetic-login' });
const policy = Object.freeze({ schemaVersion: 1, windowId: 'synthetic-window', windowStart: 100,
  windowEnd: 10000, userConcurrency: 64, shopConcurrency: 64, userAttempts: 64,
  shopAttempts: 64, leaseMs: 1000, maxReservationMicros: 100, budgetMicros: 6400, currency: 'USD' });
const initialize = () => ({ scope, policy, binding, authority: AUTHORITY_KINDS.map(kind => ({
  kind, generation: 1, active: true, expiresAt: 9000 })), deadlineAt: 500 });
const reserve = (key, expectedRevision, reservationMicros = 100) => ({ scope, expectedRevision,
  selectorDigest: hex('selector-' + key), commandDigest: hex('command-' + key),
  proposalDigest: hex('proposal-' + key), command: { type: 'reserve', binding, key, reservationMicros },
  deadlineAt: 500 });
const selector = (key, fence) => ({ scope, binding, key, fence, selectorDigest: hex('selector-' + key) });

module.exports = { createFixture, hex, scope, binding, policy, initialize, reserve, selector };
