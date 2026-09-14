const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { generateCommandCards, inspectCommandCards, inspectOutcome, MAX_BYTES } = require('../offline/cad-convex/runnerCommandCards');
const check = p => inspectCommandCards(JSON.stringify(p));
function complete() {
  const p = generateCommandCards();
  for (const fields of [p.fields, ...p.cards.map(c => c.fields)])
    for (const k of Object.keys(fields)) fields[k] = k === 'timeoutMs' ? 5000 : k.endsWith('Ref') ? 'rrb-ref:synthetic-command' : 'a'.repeat(k.endsWith('Commit') ? 40 : 64);
  p.cards[2].allocation.forEach((r, i) => {
    r.logicalCommands = p.operationMatrix[i].maxLogicalCommands;
    r.transactionAttempts = p.operationMatrix[i].maxTransactionAttempts;
  });
  return p;
}
test('generated template is independent and incomplete, complete syntax never grants authority', () => {
  const p = generateCommandCards(); p.cards[0].executable = true;
  assert.equal(check(generateCommandCards()).structureValid, true);
  assert.equal(check(generateCommandCards()).fieldsComplete, false);
  const r = check(complete());
  assert.equal(r.fieldsComplete, true);
  for (const k of ['executable', 'liveRunAuthorized', 'uploadsEnabled', 'liveQualified', 'publicationAuthorized']) assert.equal(r[k], false);
  assert.equal(r.decision, 'LIVE_RUN_BLOCKED');
});
test('malformed, oversized and unexpected sensitive fields fail without echo', () => {
  for (const bytes of ['null', '[]', '{', 'x'.repeat(MAX_BYTES + 1)]) assert.equal(inspectCommandCards(bytes).structureValid, false);
  const p = complete(); p.privatePath = 'SYNTHETIC_PRIVATE_SENTINEL';
  const r = check(p); assert.equal(r.structureValid, false);
  assert.ok(!JSON.stringify(r).includes(p.privatePath));
  assert.equal(r.packetSha256, null);
});
test('all fixed gates, limits, requirements, ordering and stop rules are immutable', () => {
  for (const mutate of [p => p.uploadsEnabled = true, p => p.liveRunAuthorized = true,
    p => p.limits.maxStoreRestarts = 1, p => p.operationMatrix[0].authorized = true,
    p => p.requirements[0].liveQualified = true, p => p.cards.reverse(),
    p => p.cards[0].executable = true, p => p.stopPolicy.releaseHolds = true,
    p => p.cards[1].allocation.push({}), p => p.cards[0].fields.extra = 'x']) {
    const p = complete(); mutate(p); assert.equal(check(p).structureValid, false);
  }
});
test('every required field rejects invalid values and detects missing values', () => {
  const base = complete();
  for (const index of [-1, 0, 1, 2, 3, 4]) {
    const keys = Object.keys(index < 0 ? base.fields : base.cards[index].fields);
    for (const key of keys) {
      for (const value of [true, {}, '', -1, 'SYNTHETIC_PRIVATE_SENTINEL']) {
        const p = complete(); (index < 0 ? p.fields : p.cards[index].fields)[key] = value;
        const r = check(p); assert.equal(r.structureValid, false); assert.ok(!JSON.stringify(r).includes('SYNTHETIC_PRIVATE_SENTINEL'));
      }
      const p = complete(); (index < 0 ? p.fields : p.cards[index].fields)[key] = null;
      assert.equal(check(p).fieldsComplete, false);
    }
  }
});
test('shared allocations cannot double-spend, invent rows or evade attempts', () => {
  for (const mutate of [p => p.cards[3].allocation[0].logicalCommands = 1,
    p => p.cards[2].allocation[0].transactionAttempts = 0,
    p => p.cards[2].allocation[0].logicalCommands = 0.5,
    p => p.cards[2].allocation[0].operation = 'delete-resource',
    p => p.cards[2].allocation[11].transactionAttempts = 1]) {
    const p = complete(); mutate(p); assert.equal(check(p).structureValid, false);
  }
  const p = complete();
  for (const key of ['logicalCommands', 'transactionAttempts']) {
    p.cards[3].allocation[0][key] = p.cards[2].allocation[0][key] / 2;
    p.cards[2].allocation[0][key] /= 2;
  }
  assert.equal(check(p).fieldsComplete, true);
});
test('digest binds exact input bytes', () => {
  const bytes = JSON.stringify(complete());
  assert.notEqual(inspectCommandCards(bytes).packetSha256, inspectCommandCards(bytes + '\n').packetSha256);
});
const observation = { outcome: 'UNKNOWN', attempt: 1, remainingMs: 5000, windowOpen: true, bindingMatches: true, budgetAvailable: true };
test('unknown keeps leases/holds and never permits redispatch; expiry stops reconciliation', () => {
  const r = inspectOutcome(observation);
  assert.equal(r.action, 'STOP_NEW_WORK_REVIEW_BOUNDED_ORIGINAL_SELECTOR_LOOKUP');
  assert.equal(r.retainHolds, true); assert.equal(r.retainLeases, true); assert.equal(r.redispatch, false);
  for (const k of ['windowOpen', 'bindingMatches', 'budgetAvailable']) assert.equal(inspectOutcome({ ...observation, [k]: false }).action, 'STOP_ALL_REMOTE_PRESERVE_CUSTODY');
});
test('only bounded explicit conflicts suggest retry review; terminal reports need receipts', () => {
  for (const [attempt, ms] of [[1, 100], [2, 250]]) {
    const r = inspectOutcome({ ...observation, outcome: 'CONFLICT', attempt }); assert.equal(r.backoffMs, ms);
    assert.equal(inspectOutcome({ ...observation, outcome: 'CONFLICT', attempt, remainingMs: ms }).action, 'STOP_ALL_REMOTE_PRESERVE_CUSTODY');
  }
  for (const value of [{ ...observation, outcome: 'CONFLICT', attempt: 3 }, { ...observation, attempt: NaN }, null]) assert.equal(inspectOutcome(value).action, 'STOP_ALL_REMOTE_PRESERVE_CUSTODY');
  for (const outcome of ['COMMITTED', 'ABORTED']) assert.equal(inspectOutcome({ ...observation, outcome }).action, 'REQUIRE_INDEPENDENT_TERMINAL_RECEIPT');
});
test('offline CLI exit codes and redacted failures, without running cards', () => {
  const run = (args, input) => spawnSync(process.execPath, ['scripts/cad-runner-command-cards.js', ...args], { input, encoding: 'utf8' });
  assert.equal(run(['--template']).status, 0);
  assert.equal(run(['--check'], JSON.stringify(generateCommandCards())).status, 2);
  assert.equal(run(['--check'], JSON.stringify(complete())).status, 0);
  for (const input of ['SYNTHETIC_PRIVATE_SENTINEL', 'x'.repeat(MAX_BYTES + 1)]) {
    const r = run(['--check'], input); assert.equal(r.status, 1); assert.ok(!r.stdout.includes('SYNTHETIC_PRIVATE_SENTINEL'));
  }
  assert.equal(run(['--execute']).status, 1);
});

test('C3 cannot take new-work allocations after an unknown outcome', () => {
  for (const n of [2, 3, 4, 5, 10, 11]) {
    const p = complete();
    for (const key of ['logicalCommands', 'transactionAttempts']) {
      p.cards[3].allocation[n][key] = p.cards[2].allocation[n][key];
      p.cards[2].allocation[n][key] = 0;
    }
    assert.ok(check(p).errors.includes('RECONCILIATION_EFFECT_FORBIDDEN'));
  }
});
