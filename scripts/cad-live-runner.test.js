const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { METHODS, createDurableAdapter } = require('../offline/cad-convex/durableAdapter');
const { preflight, runCard, MAX_BYTES } = require('../offline/cad-convex/liveRunner');
const { generateCommandCards } = require('../offline/cad-convex/runnerCommandCards');
const adapter = fs.readFileSync('offline/cad-convex/durableAdapter.d.ts', 'utf8');
const output = fs.readFileSync('offline/cad-convex/liveRunnerOutput.json', 'utf8');
const hash = x => createHash('sha256').update(x).digest('hex');
function complete() {
  const p = generateCommandCards();
  for (const fields of [p.fields, ...p.cards.map(c => c.fields)])
    for (const k of Object.keys(fields)) fields[k] = k === 'timeoutMs' ? 5000 : k.endsWith('Ref') ? 'rrb-ref:synthetic-command' : 'a'.repeat(k.endsWith('Commit') ? 40 : 64);
  p.fields.adapterContractDigest = hash(adapter);
  for (const card of p.cards) card.fields.outputContractDigest = hash(output);
  p.cards[2].allocation.forEach((r, i) => {
    r.logicalCommands = p.operationMatrix[i].maxLogicalCommands;
    r.transactionAttempts = p.operationMatrix[i].maxTransactionAttempts;
  });
  return JSON.stringify(p);
}
function closed(r) {
  for (const [k, v] of Object.entries(JSON.parse(output))) if (k !== 'schemaVersion') assert.equal(r[k], v);
}
test('adapter cannot invoke injected drivers or inspect private arguments', () => {
  const trap = new Proxy({}, { get() { throw Error('PRIVATE_SENTINEL'); } });
  const a = createDurableAdapter(trap);
  assert.ok(Object.isFrozen(a));
  for (const method of METHODS) {
    const r = a[method](trap, () => { throw Error('PRIVATE_SENTINEL'); });
    closed(r); assert.ok(Object.isFrozen(r));
    assert.ok(!JSON.stringify(r).includes('PRIVATE_SENTINEL'));
  }
});
test('complete syntax and matching source contracts remain blocked', () => {
  const r = preflight(complete(), adapter, output);
  assert.equal(r.fieldsComplete, true); assert.equal(r.sourceBindingsMatch, true); closed(r);
  for (const [a, o] of [[adapter + '\n', output], [adapter, output + '\n']]) {
    const drift = preflight(complete(), a, o);
    assert.equal(drift.sourceBindingsMatch, false); closed(drift);
  }
});
test('invalid gates, unknown fields, malformed and oversized inputs stay sanitized', () => {
  const p = JSON.parse(complete()); p.liveRunAuthorized = true;
  const q = JSON.parse(complete()); q.approval = 'PRIVATE_SENTINEL';
  for (const bytes of ['null', '{', 'PRIVATE_SENTINEL', 'x'.repeat(MAX_BYTES + 1), JSON.stringify(p), JSON.stringify(q)]) {
    const r = preflight(bytes, adapter, output);
    assert.equal(r.structureValid, false); closed(r);
    assert.ok(!JSON.stringify(r).includes('PRIVATE_SENTINEL'));
  }
});
test('all card dispatch is blocked including recovery and unknown commands', () => {
  for (const c of ['C0', 'C1', 'C2', 'C3', 'C4', 'R', '--execute', null]) closed(runCard(c));
});
test('CLI never returns execution success and refuses arbitrary command arguments', () => {
  const run = (args, input) => spawnSync(process.execPath, ['scripts/cad-live-runner.js', ...args], { input, encoding: 'utf8', timeout: 5000 });
  for (const input of [complete(), JSON.stringify(generateCommandCards())]) {
    const r = run(['--preflight'], input); assert.equal(r.status, 2); closed(JSON.parse(r.stdout));
  }
  for (const input of ['PRIVATE_SENTINEL', 'x'.repeat(MAX_BYTES + 1)]) {
    const r = run(['--preflight'], input); assert.equal(r.status, 1); closed(JSON.parse(r.stdout));
    assert.ok(!r.stdout.includes('PRIVATE_SENTINEL'));
  }
  for (const card of ['C1', 'C2', 'C3', 'C4']) {
    const r = run([card]); assert.equal(r.status, 2); closed(JSON.parse(r.stdout));
  }
  for (const args of [[], ['--execute'], ['R'], ['C2', 'PRIVATE_SENTINEL']]) {
    const r = run(args); assert.equal(r.status, 1); closed(JSON.parse(r.stdout));
    assert.ok(!r.stdout.includes('PRIVATE_SENTINEL'));
  }
});
