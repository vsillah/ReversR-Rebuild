const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createPositiveSyntheticSession } = require('../offline/cad-convex/positiveSyntheticSession');
const { createPositiveSyntheticLedger } = require('../offline/cad-convex/positiveSyntheticLedger');
const { fixture, enrolled, cohort, password } = require('./helpers/cad-positive-synthetic-fixture');
function location(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-synthetic-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return path.join(directory, 'journal.jsonl');
}
function setup(t, overrides) {
  const journal = location(t), f = fixture(journal, overrides);
  t.after(() => f.run.close()); return { ...f, journal };
}
const denied = promise => assert.rejects(promise, /^(Error: )?(FLOW_DENIED|RUN_STOPPED|OUTCOME_UNKNOWN)$/);

test('two existing synthetic Password identities qualify through actual source and finish logout/revoke/removal', async t => {
  const f = await enrolled(setup(t));
  for (const slot of [0, 1]) assert.equal((await f.run.client(slot).verify(1500)).cadUploadAllowed, false);
  await f.run.client(0).logout(); await f.run.revoke(1);
  for (const slot of [0, 1]) {
    await f.run.verifyRevoked(slot, 1500); await f.run.inventory(slot);
    await f.run.remove(slot); await f.run.inventory(slot);
  }
  assert.equal(f.rows.size, 0);
  assert.equal(f.run.status().attempted, 17);
  assert.equal(f.run.status().cleanupVerified, 2);
  assert.equal(f.run.status().revocationVerified, 2);
  assert.equal(f.run.status().liveReady, false);
  assert.equal(f.configuration.developmentAuthReviewed, false);
  assert.equal(f.configuration.developmentConfiguration({}), null);
  const journal = fs.readFileSync(f.journal, 'utf8');
  assert.doesNotMatch(journal, /owner-|login-|account-|auth-test|password|secret|token/i);
  assert.equal(fs.statSync(f.journal).mode & 0o777, 0o600);
});
test('cohort must be exactly two unique reserved synthetic addresses and explicitly offline', t => {
  for (const entries of [[], [cohort[0]], [...cohort, 'cad-test-three@auth-test.invalid'], [cohort[0], cohort[0]],
    ['real@example.com', cohort[1]], ['CAD-test-one@auth-test.invalid', cohort[1]], [null, cohort[1]]])
    assert.throws(() => createPositiveSyntheticSession({ testOnly: true, cohort: entries }), /^Error: QUALIFICATION_UNAVAILABLE$/);
  assert.throws(() => createPositiveSyntheticSession({ cohort }), /QUALIFICATION_UNAVAILABLE/);
  const f = setup(t); assert.throws(() => f.run.client(2), /QUALIFICATION_UNAVAILABLE/);
  assert.equal(f.run.client(0), f.run.client(0));
  assert.notEqual(f.run.client(0), f.run.client(1));
});
test('unsupported removal, diagnostics, mixed method or nonempty history blocks every provision', async t => {
  for (const patch of [{ supportedRemoval: false }, { diagnosticsReviewed: false }, { passwordOnly: false },
    { counts: {} }, { counts: null }]) {
    const base = setup(t);
    const f = setup(t, { prepare: async () => ({ counts: base.counts(), passwordOnly: true,
      supportedRemoval: true, diagnosticsReviewed: true, ...patch }) });
    await denied(f.run.prepare()); await assert.rejects(f.run.provision(0, password), /RUN_STOPPED/);
    assert.deepEqual(f.calls, ['prepare']);
  }
  const f = setup(t, { prepare: async () => ({ counts: { ...f.counts(), authSessions: 1 },
    passwordOnly: true, supportedRemoval: true, diagnosticsReviewed: true }) });
  await denied(f.run.prepare());
});
test('provision is run-owned, collision-denying, linking-disabled and single-use per slot', async t => {
  let f = setup(t); await denied(f.run.provision(0, password)); assert.equal(f.calls.length, 0);
  f = setup(t); await f.run.prepare(); await f.run.provision(0, password);
  await denied(f.run.provision(0, password)); assert.equal(f.calls.filter(c => c === 'provision').length, 1);
  for (const result of [null, { userId: 'owner-0', accountId: 'account-0', created: false },
    { userId: 'owner-0', accountId: 'account-0', created: true, private: 'fixture-sentinel' }]) {
    f = setup(t, { provision: async () => result }); await f.run.prepare();
    await assert.rejects(f.run.provision(0, password), /OUTCOME_UNKNOWN/);
    assert.equal(f.run.status().unknown, true);
  }
  f = setup(t, { provision: async () => ({ userId: 'same', accountId: 'same-account', created: true }) });
  await f.run.prepare(); await f.run.provision(0, password); await denied(f.run.provision(1, password));
});
test('signup/reset/verification, extra params, out-of-slot/cohort and invalid password deny before Auth dispatch', async t => {
  const patches = ['signUp', 'reset', 'reset-verification', 'email-verification', undefined].map(flow => ({ flow }));
  patches.push({ redirectTo: '/' }, { email: cohort[1] }, { email: 'cad-test-other@auth-test.invalid' },
    { password: 'short' }, { password: 'x'.repeat(129) });
  for (const patch of patches) {
    const f = setup(t); await f.run.prepare(); await f.run.provision(0, password); await f.run.provision(1, password);
    await denied(f.run.client(0).signIn({ ...f.params(0), ...patch }));
    assert.ok(!f.calls.includes('signIn'));
  }
  const f = setup(t); await f.run.prepare(); await f.run.provision(0, password);
  await denied(f.run.client(0).signIn(f.params(0))); // exact two-person cohort before either login
});
test('wrong owner, wrong/replaced session, expiry and missing owner/session fail the actual reader', async t => {
  const cases = [f => { f.contexts[0].userId = 'owner-1'; },
    f => { f.contexts[0].loginSessionId = 'login-1'; },
    f => { f.rows.get('login-0').userId = 'owner-1'; },
    f => { f.rows.get('login-0').expirationTime = 1500; },
    f => { f.rows.delete('owner-0'); }, f => { f.rows.delete('login-0'); }];
  for (const mutate of cases) {
    const f = await enrolled(setup(t)); mutate(f); await denied(f.run.client(0).verify(1500));
    assert.equal(f.run.status().stopped, true);
  }
});
test('session proof rejects mixed methods, extra diagnostics, invalid horizons and overlong sessions', async t => {
  for (const patch of [{ authMethod: 'oidc' }, { expiresAt: 10001 }, { active: false },
    { userId: 'other' }, { loginSessionId: 'other' }, { rawToken: 'fixture-sentinel' }]) {
    const f = await enrolled(setup(t, { exactSession: async () => ({ userId: 'owner-0', loginSessionId: 'login-0',
      authMethod: 'password', expiresAt: 5000, active: true, ...patch }) }));
    await denied(f.run.client(0).verify(1500));
  }
  for (const horizon of [NaN, Infinity, 1000, 1801, 1500.5]) {
    const f = await enrolled(setup(t)); await denied(f.run.client(0).verify(horizon));
    assert.ok(!f.calls.includes('exactSession'));
  }
});
test('logout/revoke acknowledgments do not substitute for deletion proof or complete cleanup inventory', async t => {
  let f = await enrolled(setup(t, { logout: async () => null }));
  await f.run.client(0).logout(); await denied(f.run.verifyRevoked(0, 1500));
  assert.equal(f.run.status().revocationVerified, 0);
  f = await enrolled(setup(t)); await denied(f.run.remove(0)); assert.ok(!f.calls.includes('remove'));
  f = await enrolled(setup(t, { inventory: async () => ({ ...f.counts(), users: 1, authAccounts: 1, authRefreshTokens: 1 }) }));
  await f.run.revoke(0); await f.run.verifyRevoked(0, 1500); await denied(f.run.inventory(0));
  f = await enrolled(setup(t, { remove: async () => null }));
  await f.run.revoke(0); await f.run.verifyRevoked(0, 1500); await f.run.inventory(0); await f.run.remove(0);
  await denied(f.run.inventory(0)); assert.equal(f.run.status().cleanupVerified, 0);
});
test('two clients share single-flight accounting; concurrent denial is counted before dispatch', async t => {
  let release;
  const f = await enrolled(setup(t, { exactSession: () => new Promise(resolve => { release = resolve; }) }));
  const first = f.run.client(0).verify(1500);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(f.run.client(1).verify(1500), /RUN_BUSY/);
  assert.equal(f.run.status().attempted, 7); assert.equal(f.calls.filter(c => c === 'exactSession').length, 1);
  release({ userId: 'owner-0', loginSessionId: 'login-0', authMethod: 'password', expiresAt: 5000, active: true });
  await first;
});
test('journal exists before dispatch, refuses process restart and leaves no path or raw error diagnostics', async t => {
  const journal = location(t);
  const f = fixture(journal, { prepare: async () => {
    const records = fs.readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(records.at(-1).phase, 'pending'); return { counts: f.counts(), passwordOnly: true,
      supportedRemoval: true, diagnosticsReviewed: true };
  } });
  await f.run.prepare(); f.run.close();
  assert.throws(() => fixture(journal), /^Error: RUN_UNAVAILABLE$/);
  const script = 'try { require(process.argv[1]).createPositiveSyntheticLedger({testOnly:true,journalPath:process.argv[2],now:()=>1000,endAt:10000}); } catch(e) { process.stdout.write(e.message); }';
  const child = spawnSync(process.execPath, ['-e', script, require.resolve('../offline/cad-convex/positiveSyntheticLedger'), journal], { encoding: 'utf8' });
  assert.equal(child.status, 0); assert.equal(child.stdout, 'RUN_UNAVAILABLE'); assert.equal(child.stderr, '');
});
test('100 logical attempts include twenty reserved cleanup calls and no per-client budget bypass', async t => {
  const ledger = createPositiveSyntheticLedger({ testOnly: true, journalPath: location(t), now: () => 1000, endAt: 10000 });
  t.after(() => ledger.close());
  for (let i = 0; i < 80; i++) await ledger.execute('verify', () => {}, async () => null, () => {});
  for (let i = 0; i < 20; i++) await ledger.execute('inventory', () => {}, async () => null, () => {});
  await assert.rejects(ledger.execute('inventory', () => {}, async () => null, () => {}), /RUN_STOPPED/);
  assert.equal(ledger.status().attempted, 100); assert.equal(ledger.status().dispatched, 100);
  const other = createPositiveSyntheticLedger({ testOnly: true, journalPath: location(t), now: () => 1000, endAt: 10000 });
  t.after(() => other.close());
  for (let i = 0; i < 80; i++) await other.execute('verify', () => {}, async () => null, () => {});
  await assert.rejects(other.execute('verify', () => {}, async () => null, () => {}), /RUN_STOPPED/);
  assert.equal(other.status().dispatched, 80);
});
test('write timeout remains unknown even after late completion; no cleanup, retry or second dispatch', async t => {
  let release;
  const f = setup(t, { provision: () => new Promise(resolve => { release = resolve; }) });
  await f.run.prepare(); await assert.rejects(f.run.provision(0, password), /OUTCOME_UNKNOWN/);
  release({ userId: 'late', accountId: 'late', created: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.run.status().provisioned, 0);
  await assert.rejects(f.run.provision(0, password), /RUN_STOPPED/);
  await assert.rejects(f.run.revoke(0), /RUN_STOPPED/);
  assert.equal(f.run.status().unknown, true); assert.equal(f.run.status().automaticRetries, 0);
});
test('clock rollback, run expiry, UTC reset and stale responses cannot grant session qualification', async t => {
  for (const n of [999, 10000, NaN]) {
    const f = await enrolled(setup(t)); f.setTime(n); await denied(f.run.client(0).verify(1500));
    assert.ok(!f.calls.includes('exactSession'));
  }
  const f = await enrolled(setup(t, { exactSession: async () => {
    f.setTime(10000); return { userId: 'owner-0', loginSessionId: 'login-0', authMethod: 'password', expiresAt: 5000, active: true };
  } }));
  await denied(f.run.client(0).verify(1500));
  for (const endAt of [1000, 901001, 86400000]) assert.throws(() => createPositiveSyntheticLedger({ testOnly: true,
    journalPath: location(t), now: () => 1000, endAt }), /RUN_UNAVAILABLE/);
});
test('sentinel exceptions and noisy success payloads never reach status, journal or caller errors', async t => {
  const sentinel = 'fixture-private-password-token-email-path';
  for (const op of ['prepare', 'provision', 'signIn', 'exactSession', 'logout', 'revoke', 'inventory', 'remove']) {
    const f = setup(t), original = f.ports[op];
    // Fixture port wrappers dispatch the captured function, so inject through a fresh fixture.
    const g = setup(t, { [op]: async () => { throw Error(sentinel); } });
    let error;
    try {
      await enrolled(g); await g.run.client(0).verify(1500); await g.run.client(0).logout(); await g.run.revoke(1);
      await g.run.verifyRevoked(0, 1500); await g.run.inventory(0); await g.run.remove(0);
    } catch (caught) { error = caught; }
    assert.ok(error); assert.doesNotMatch(error.message + JSON.stringify(g.run.status()) + fs.readFileSync(g.journal, 'utf8'), /fixture-private/);
    assert.ok(original);
  }
});

test('response arriving exactly at its horizon fails while the overall run remains open', async t => {
  const f = await enrolled(setup(t, { exactSession: async () => {
    f.setTime(1500); return { userId: 'owner-0', loginSessionId: 'login-0', authMethod: 'password', expiresAt: 5000, active: true };
  } }));
  await denied(f.run.client(0).verify(1500)); assert.equal(f.run.status().stopped, true);
});
test('journal failure before dispatch prevents calls; receipt failure after mutation stays unknown and sanitized', async () => {
  const vm = require('node:vm');
  for (const failAt of [2, 4]) {
    let writes = 0, dispatched = 0;
    const module = { exports: {} }, rows = [];
    const fakeFs = { openSync: () => 9, closeSync: () => {}, fsyncSync: () => {},
      writeSync: (_fd, bytes) => {
        if (++writes === failAt) throw Error('fixture-private-filesystem-error');
        rows.push(bytes.toString()); return bytes.length;
      } };
    vm.runInNewContext(fs.readFileSync(require.resolve('../offline/cad-convex/positiveSyntheticLedger'), 'utf8'),
      { module, Buffer, setTimeout, clearTimeout, require: key => {
        if (key === 'node:fs') return fakeFs;
        if (key === 'node:path') return path;
        throw Error('FORBIDDEN_DEPENDENCY');
      } });
    const ledger = module.exports.createPositiveSyntheticLedger({ testOnly: true, journalPath: 'fixture', now: () => 1000, endAt: 10000 });
    await assert.rejects(ledger.execute('provision', () => {}, async () => { dispatched++; return null; }, () => {}, true),
      failAt === 2 ? /^Error: JOURNAL_UNAVAILABLE$/ : /^Error: OUTCOME_UNKNOWN$/);
    assert.equal(dispatched, failAt === 2 ? 0 : 1);
    assert.equal(ledger.status().unknown, failAt !== 2);
    assert.doesNotMatch(JSON.stringify(ledger.status()) + rows.join(''), /fixture-private/);
    ledger.close();
  }
});
test('qualified synthetic session still hits actual upload-disabled response without body access', async t => {
  const f = await enrolled(setup(t));
  const express = require('express'), { once } = require('node:events');
  const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
  const app = express(); let bodyReads = 0, fallthrough = 0;
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'body', { get() { bodyReads++; throw Error('FIXTURE_BODY'); } });
    const original = req.on;
    req.on = function(event, ...args) {
      if (event === 'data' || event === 'readable') { bodyReads++; throw Error('FIXTURE_BODY'); }
      return original.call(this, event, ...args);
    };
    next();
  });
  app.use('/api/cad', createCadUserUploadRouter({ sessionService: { lookupSession: async () => {
    await f.run.client(0).verify(1500);
    // Deliberately over-permissive upload fixture tests the independent route guard.
    return { schemaVersion: 1, userId: 'owner-0', shopId: 'fixture-shop', sessionId: 'fixture-upload',
      authMethod: 'password', status: 'active', transport: 'bearer', cadUploadAllowed: true,
      expiresAt: Date.now() + 10000 };
  } } }));
  app.use((_req, res) => { fallthrough++; res.sendStatus(500); });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const result = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, {
    method: 'POST', headers: { authorization: 'Bearer us1.' + Buffer.alloc(32, 7).toString('base64url') },
  });
  assert.equal(result.status, 503); assert.equal((await result.json()).code, 'USER_UPLOADS_DISABLED');
  assert.equal(bodyReads, 0); assert.equal(fallthrough, 0); assert.equal(f.run.status().cadUploadAllowed, false);
});
test('child-process diagnostic capture contains no raw sentinel in stdout/stderr, receipts or client results', t => {
  const journal = location(t);
  const code = `
    const fs = require('node:fs');
    const {fixture,password} = require(process.argv[1]);
    const f = fixture(process.argv[2], {provision:async()=>{throw Error('fixture-private-provider-sentinel')}});
    (async()=>{await f.run.prepare();try{await f.run.provision(0,password)}catch(e){
      process.stdout.write(JSON.stringify({code:e.message,status:f.run.status(),journal:fs.readFileSync(process.argv[2],'utf8')}));
    }finally{f.run.close()}})().catch(()=>{process.exitCode=1});`;
  const child = spawnSync(process.execPath, ['-e', code, require.resolve('./helpers/cad-positive-synthetic-fixture'), journal], { encoding: 'utf8' });
  assert.equal(child.status, 0); assert.equal(child.stderr, '');
  assert.doesNotMatch(child.stdout, /fixture-private|owner-|auth-test\.invalid|fixture-only-password/);
  assert.equal(JSON.parse(child.stdout).code, 'OUTCOME_UNKNOWN');
});
