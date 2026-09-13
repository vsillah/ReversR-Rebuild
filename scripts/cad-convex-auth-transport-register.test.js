const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createVerifiedSyntheticTransport } = require('../offline/cad-convex/verifiedSyntheticTransport');
const { createSyntheticRunRegister } = require('../offline/cad-convex/syntheticRunRegister');
const { createSyntheticRemovalBoundary } = require('../offline/cad-convex/syntheticRemovalBoundary');
const { fixture, cohort, password } = require('./helpers/cad-positive-synthetic-fixture');
const sourceCommit = '11a37f917de1121cf96672ff3163780800af1def';
function setup(t, options = {}) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cad-register-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const f = fixture(path.join(directory, 'unused-fixture-journal')); f.run.close();
  let tick = 1000;
  const journalPath = path.join(directory, 'journal');
  const record = { version: 1, mode: 'synthetic-offline', runId: 'run-fixture', sourceCommit,
    destination: { projectId: 'fixture-project', deploymentId: 'fixture-deployment', releaseRef: 'ref:fixture-release', kind: 'development' },
    journalPath, serviceSubjectRef: 'ref:fixture-service', operatorRef: 'ref:fixture-operator', hostRef: 'ref:fixture-host',
    custodyRef: 'ref:fixture-custody', reconciliationRef: 'ref:fixture-reconciliation', cohort: [...cohort],
    startAt: 1000, endAt: 10000, observedAt: 1000, approvalExpiresAt: 10000 };
  const expected = { runId: record.runId, sourceCommit, destination: { ...record.destination } };
  const binding = () => structuredClone(expected);
  const calls = [], ownership = [], pending = [];
  const host = {
    verifyService: async () => ({ binding: binding(), verified: true, identityKind: 'service', subjectRef: record.serviceSubjectRef,
      revoked: false, expiresAt: 9000, origin: 'http://localhost:5001' }),
    serverContext: async op => ({ context: { auth: f.contexts[op.slot], db: { get: async key => f.rows.get(key) ?? null } },
      binding: binding(), verified: true, identityKind: 'user', userId: 'owner-' + op.slot, loginSessionId: 'login-' + op.slot }),
    readExactSession: f.reader,
    invoke: async (op, args, context, selector) => {
      calls.push({ op, context, selector });
      const rows = fs.readFileSync(journalPath, 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(rows.at(-1).phase, 'pending');
      assert.equal(rows.at(-1).sequence, selector.sequence);
      if (op === 'logout') assert.equal(context.auth.loginSessionId, args.loginSessionId);
      return f.ports[op](args);
    },
    recordPending: async (op, selectors) => { pending.push({ op, selectors }); return null; },
    recordOwnership: async (op, selectors) => { ownership.push({ op, selectors }); return null; },
  };
  const input = { testOnly: true, record, expected, journalPath, now: () => tick,
    removalMode: 'offline-fixture', policy: f.policy, host, timeoutMs: 50, ...options };
  const run = options.noRun ? null : createVerifiedSyntheticTransport(input);
  if (run) t.after(() => run.close());
  return { ...f, run, input, record, expected, host, calls, ownership, pending, journalPath,
    setTime: n => { tick = n; } };
}
async function enrolled(f) {
  await f.run.prepare(); for (const slot of [0, 1]) await f.run.provision(slot, password);
  for (const slot of [0, 1]) await f.run.client(slot).signIn(f.params(slot)); return f;
}
const denied = p => assert.rejects(p, /^Error: (FLOW_DENIED|RUN_STOPPED|OUTCOME_UNKNOWN)$/);

test('pinned SDK export review is exact and no invented removal or retention fallback is accepted', () => {
  const packagePath = path.resolve(__dirname, '../node_modules/@convex-dev/auth/package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8')); assert.equal(pkg.version, '0.0.95');
  const file = path.join(path.dirname(packagePath), 'src/server/index.ts');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /createAccount,/); assert.match(text, /invalidateSessions,/);
  assert.doesNotMatch(text, /(?:remove|delete)(?:Account|User)/);
  assert.equal(crypto.createHash('sha256').update(text).digest('hex'), '09033c75d6501e35d51be1c18e2fbb5ae73a6305fdec8c381860d8cc73b46ddb');
  for (const opts of [{}, { mode: 'supported' }, { mode: 'retention-approved' }, { sdkVersion: '0.0.96' }]) {
    const b = createSyntheticRemovalBoundary({ testOnly: true, ...opts });
    assert.equal(b.inspect().supportedRemoval, false); assert.equal(b.inspect().retentionOverride, false);
    assert.throws(() => b.requireProvisioning(), /REMOVAL_UNAVAILABLE/);
    assert.throws(() => b.requireRemoval(), /REMOVAL_UNAVAILABLE/);
  }
});
test('default SDK mode blocks before any host call even if fixture prepare would claim supported removal', async t => {
  const f = setup(t, { removalMode: 'pinned-sdk' });
  await denied(f.run.prepare()); await assert.rejects(f.run.provision(0, password), /RUN_STOPPED/);
  assert.equal(f.calls.length, 0); assert.equal(f.rows.size, 0);
  assert.equal(f.run.status().removal.state, 'SUPPORTED_REMOVAL_MISSING');
});
test('both synthetic clients use one journal and exact source reader; private selectors stay out of receipts', async t => {
  const f = await enrolled(setup(t));
  for (const slot of [0, 1]) await f.run.client(slot).verify(1500);
  await f.run.client(0).logout(); await f.run.revoke(1);
  for (const slot of [0, 1]) {
    await f.run.verifyRevoked(slot, 1500); await f.run.inventory(slot); await f.run.remove(slot); await f.run.inventory(slot);
  }
  assert.equal(f.run.status().attempted, 17); assert.equal(f.run.status().cleanupVerified, 2);
  assert.equal(f.rows.size, 0); assert.equal(f.ownership.length, 4);
  assert.deepEqual(f.ownership.map(r => r.op.sequence), [2, 3, 4, 5]);
  assert.equal(f.ownership[3].selectors.loginSessionId, 'login-1');
  for (const call of f.calls) {
    assert.equal(call.selector.sourceCommit, sourceCommit); assert.equal(call.selector.runId, 'run-fixture');
    assert.equal(call.selector.reconciliationRef, 'ref:fixture-reconciliation');
  }
  assert.doesNotMatch(JSON.stringify(f.run.status()) + fs.readFileSync(f.journalPath, 'utf8'), /owner-|login-|account-|ref:|fixture-project|auth-test|run-fixture/);
  assert.equal(f.run.status().liveReady, false);
});
test('private register rejects missing, extra, stale, mismatched and unsafe bindings before journal creation', t => {
  const changes = [r => { delete r.custodyRef; }, r => { r.rawToken = 'fixture-noisy'; },
    r => { r.sourceCommit = 'b'.repeat(40); }, r => { r.runId = 'run-other'; },
    r => { r.destination.deploymentId = 'other'; }, r => { r.destination.kind = 'production'; },
    r => { r.destination.releaseRef = 'ref:other'; }, r => { r.cohort.reverse(); },
    r => { r.operatorRef = 'private account data'; }, r => { r.observedAt = 1001; },
    r => { r.approvalExpiresAt = 9999; }, r => { r.endAt = 901001; },
    r => { r.journalPath += '-other'; }, r => { r.mode = 'live'; }, r => { r.serviceSubjectRef = null; }];
  for (const change of changes) {
    const f = setup(t, { noRun: true }); change(f.record);
    assert.throws(() => createVerifiedSyntheticTransport(f.input), /^Error: TRANSPORT_UNAVAILABLE$/);
    assert.equal(fs.existsSync(f.journalPath), false);
  }
  const f = setup(t, { noRun: true, testOnly: false });
  assert.throws(() => createVerifiedSyntheticTransport(f.input), /TRANSPORT_UNAVAILABLE/);
});
test('register snapshots inputs, rejects duplicate claim, clock rollback, expiry and source observation drift', t => {
  const f = setup(t, { noRun: true }); const reg = createSyntheticRunRegister(f.input);
  f.record.destination.deploymentId = 'mutated'; f.record.cohort[0] = 'other';
  assert.equal(reg.binding().destination.deploymentId, 'fixture-deployment');
  reg.claim(); assert.throws(() => reg.claim(), /REGISTER_UNAVAILABLE/);
  assert.throws(() => reg.check({ ...f.expected, runId: 'run-other' }), /REGISTER_UNAVAILABLE/);
  f.setTime(999); assert.throws(() => reg.check(), /REGISTER_UNAVAILABLE/);
  f.setTime(10000); assert.throws(() => reg.check(), /REGISTER_UNAVAILABLE/);
});
test('symlink journal parent and second coordinator on the same journal deny', t => {
  const f = setup(t); assert.throws(() => createVerifiedSyntheticTransport(f.input), /RUN_UNAVAILABLE/);
  const g = setup(t, { noRun: true });
  const link = path.join(path.dirname(g.journalPath), 'alias'); fs.symlinkSync(path.dirname(g.journalPath), link);
  g.record.journalPath = g.input.journalPath = path.join(link, 'new-journal');
  assert.throws(() => createVerifiedSyntheticTransport(g.input), /TRANSPORT_UNAVAILABLE/);
});
test('service verification rejects deploy keys, wrong subject/origin, revocation, expiry and binding drift', async t => {
  for (const patch of [{ identityKind: 'deploy-key' }, { verified: false }, { subjectRef: 'ref:other' },
    { origin: 'http://127.0.0.1:5001' }, { revoked: true }, { expiresAt: 1000 }, { expiresAt: 10001 },
    { binding: {} }, { raw: 'fixture-noisy' }]) {
    const f = setup(t, { noRun: true }), original = f.host.verifyService;
    f.host.verifyService = async () => ({ ...await original(), ...patch });
    f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close());
    await denied(f.run.prepare()); assert.equal(f.calls.length, 0);
  }
});
test('server context rejects caller claims, wrong owner/session and service-only identity', async t => {
  for (const patch of [{ verified: false }, { identityKind: 'service' }, { userId: 'owner-1' },
    { loginSessionId: 'login-1' }, { binding: {} }, { raw: 'fixture-noisy' }]) {
    const f = setup(t, { noRun: true }), original = f.host.serverContext;
    f.host.serverContext = async op => ({ ...await original(op), ...patch });
    f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close()); await enrolled(f);
    await denied(f.run.client(0).verify(1500)); assert.equal(f.run.status().stopped, true);
  }
});
test('actual reader rejects missing owner/session and expiration at horizon', async t => {
  for (const mutate of [f => f.rows.delete('owner-0'), f => f.rows.delete('login-0'),
    f => { f.rows.get('login-0').expirationTime = 1500; },
    f => { f.contexts[0].loginSessionId = 'login-1'; }]) {
    const f = await enrolled(setup(t)); mutate(f); await denied(f.run.client(0).verify(1500));
  }
});
test('shared two-client accounting admits only one verification and counts concurrent denial', async t => {
  let release;
  const f = setup(t, { noRun: true }), original = f.host.readExactSession;
  f.host.readExactSession = (...args) => new Promise(resolve => { release = async () => resolve(await original(...args)); });
  f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close()); await enrolled(f);
  const first = f.run.client(0).verify(1500); await new Promise(r => setImmediate(r));
  await assert.rejects(f.run.client(1).verify(1500), /RUN_BUSY/); await release(); await first;
  assert.equal(f.run.status().attempted, 7); assert.equal(f.run.status().dispatched, 6);
});
test('private ownership persistence failure makes provisioning unknown and forbids replay', async t => {
  const f = setup(t, { noRun: true }); f.host.recordOwnership = async () => { throw Error('fixture-private-sentinel'); };
  f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close()); await f.run.prepare();
  await assert.rejects(f.run.provision(0, password), /^Error: OUTCOME_UNKNOWN$/);
  assert.equal(f.run.status().unknown, true); assert.equal(f.rows.size, 2);
  await assert.rejects(f.run.provision(0, password), /RUN_STOPPED/);
  assert.doesNotMatch(fs.readFileSync(f.journalPath, 'utf8'), /fixture-private-sentinel|owner-/);
});
test('late service verification after timeout cannot dispatch any lifecycle operation', async t => {
  let release;
  const f = setup(t, { noRun: true }), original = f.host.verifyService;
  f.host.verifyService = () => new Promise(resolve => { release = async () => resolve(await original()); });
  f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close());
  await denied(f.run.prepare()); await release(); await new Promise(r => setImmediate(r));
  assert.equal(f.calls.length, 0); assert.equal(f.run.status().stopped, true);
});
test('transport expiry, stale observation and response horizon are rechecked after asynchronous steps', async t => {
  for (const n of [1500, 10000, 999]) {
    const f = setup(t, { noRun: true }), original = f.host.readExactSession;
    f.host.readExactSession = async (...args) => { const proof = await original(...args); f.setTime(n); return proof; };
    f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close()); await enrolled(f);
    await denied(f.run.client(0).verify(1500));
  }
  const f = setup(t, { noRun: true }); f.record.endAt = f.record.approvalExpiresAt = 500000;
  const reg = createSyntheticRunRegister(f.input); f.setTime(301001); assert.throws(() => reg.check(), /REGISTER_UNAVAILABLE/);
});
test('private pending receipt fails before dispatch and unknown write retains exact reconciliation selector', async t => {
  let f = setup(t, { noRun: true });
  f.host.recordPending = async () => { throw Error('fixture-private-sentinel'); };
  f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close());
  await denied(f.run.prepare()); assert.equal(f.calls.length, 0);
  const g = setup(t, { noRun: true }), original = g.host.invoke;
  g.host.invoke = async (...args) => {
    const result = await original(...args);
    if (args[0] === 'provision') throw Error('fixture-lost-reply');
    return result;
  };
  g.run = createVerifiedSyntheticTransport(g.input); t.after(() => g.run.close()); await g.run.prepare();
  await assert.rejects(g.run.provision(0, password), /OUTCOME_UNKNOWN/);
  assert.deepEqual(g.pending.at(-1).selectors, { cohortSlot: 0 });
  assert.equal(g.pending.at(-1).op.sequence, 2);
  assert.equal(g.pending.at(-1).op.journalPath, g.journalPath);
  assert.equal(g.pending.at(-1).op.sourceCommit, sourceCommit);
  assert.equal(g.ownership.length, 0); assert.equal(g.rows.size, 2);
});
test('sanitized errors cover every trusted transport port and noisy context/session responses', async t => {
  for (const method of ['verifyService', 'serverContext', 'readExactSession', 'invoke', 'recordPending', 'recordOwnership']) {
    const f = setup(t, { noRun: true }), original = f.host[method]; let fault = false;
    f.host[method] = async (...args) => { if (fault) throw Error('fixture-private-sentinel'); return original(...args); };
    f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close());
    if (method === 'serverContext' || method === 'readExactSession') {
      await enrolled(f); fault = true; await denied(f.run.client(0).verify(1500));
    } else if (method === 'recordOwnership') {
      await f.run.prepare(); fault = true; await denied(f.run.provision(0, password));
    } else { fault = true; await denied(f.run.prepare()); }
    assert.doesNotMatch(JSON.stringify(f.run.status()) + fs.readFileSync(f.journalPath, 'utf8'), /fixture-private-sentinel/);
  }
  const f = setup(t, { noRun: true }), original = f.host.readExactSession;
  f.host.readExactSession = async (...args) => ({ ...await original(...args), rawToken: 'fixture-private-sentinel' });
  f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close()); await enrolled(f);
  await denied(f.run.client(0).verify(1500));
});
test('revocation denial proof requires verified exact user context and cannot accept an anonymous null', async t => {
  const f = setup(t, { noRun: true }), original = f.host.serverContext;
  let anonymous = false;
  f.host.serverContext = async (...args) => anonymous ? null : original(...args);
  f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close()); await enrolled(f);
  await f.run.revoke(0); anonymous = true; await denied(f.run.verifyRevoked(0, 1500));
  assert.equal(f.run.status().revocationVerified, 0);
});
test('slow private receipt cannot dispatch logout after the verified session horizon', async t => {
  const f = setup(t, { noRun: true }), original = f.host.recordPending;
  f.host.recordPending = async (...args) => {
    const receipt = await original(...args);
    if (args[0].operation === 'logout') f.setTime(1050);
    return receipt;
  };
  f.run = createVerifiedSyntheticTransport(f.input); t.after(() => f.run.close()); await enrolled(f);
  await denied(f.run.client(0).logout());
  assert.equal(f.calls.some(c => c.op === 'logout'), false);
  assert.equal(f.rows.has('login-0'), true);
});
