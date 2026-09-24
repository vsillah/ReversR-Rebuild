const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, MERGE_COMMIT, checkRebind } = require('./cad-auth-sealed-card-custody-rebind-checker');
const { disabledBinding } = require('../offline/cad-auth-receipt-custody-binding/preparation');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  for (const [key, value] of Object.entries(result)) {
    if (key.endsWith('Authorized') || key.endsWith('Enabled') || ['executable', 'executableCommandCardIssued', 'evidenceAccepted', 'commercialReadinessClaimed'].includes(key)) assert.equal(value, false, key);
  }
  assert.equal(result.authorizedRuns, 0);
  assert.equal(result.liveCollectorCommandLine, null);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}
test('successor binds custody requirements and historical provenance without inheriting authority', () => {
  const p = packet();
  assert.equal(checkRebind(p).ok, true); closed(checkRebind(p));
  assert.equal(p.payload.parent.mergeCommit, MERGE_COMMIT);
  assert.equal(p.payload.parent.packet, 'cad-auth-receipt-custody-binding-v1');
  assert.equal(p.payload.parent.consumedStopCode, 'MISSING_PREREQUISITE');
  assert.deepEqual(p.payload.preparation, disabledBinding());
  assert.equal(Object.keys(p.payload.preparation.runtimeBindingReceipts).length, 8);
  assert.equal(p.payload.historicalPreparation.approvalPhraseReusable, false);
  assert.equal(p.futureApproval.exactPhrase, null);
  for (const value of Object.values(p.payload.sealedCard)) assert.ok(value === null || value === false);
});
test('every scalar mutation, missing field and extra nested field fails closed', () => {
  function visit(value, keys = []) {
    if (value === null || typeof value !== 'object') return [{ keys, value, leaf: true }];
    return [{ keys, leaf: false }, ...Object.entries(value).flatMap(([k,v]) => visit(v, [...keys,k]))];
  }
  for (const entry of visit(packet())) for (const mode of entry.leaf ? ['alter','delete'] : ['extra']) {
    const p = packet(); let target = p;
    for (const k of mode === 'extra' ? entry.keys : entry.keys.slice(0,-1)) target = target[k];
    const key = entry.keys.at(-1);
    if (mode === 'extra') target.unknown = 'PRIVATE_SENTINEL';
    else if (mode === 'delete') delete target[key];
    else target[key] = typeof entry.value === 'boolean' ? !entry.value : typeof entry.value === 'number' ? entry.value + 1 : 'PRIVATE_SENTINEL';
    const result = checkRebind(p); assert.equal(result.ok, false, entry.keys.join('.')); closed(result);
  }
});
test('hostile data rejected without hooks, source reads or disclosure', () => {
  let calls = 0; const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const getter = {}; Object.defineProperty(getter, 'value', { enumerable:true, get:hook });
  const proxy = new Proxy({}, { get:hook, ownKeys:hook, getPrototypeOf:hook });
  const cycle = {}; cycle.self = cycle;
  const hidden = {}; Object.defineProperty(hidden, 'private', { value:'PRIVATE_SENTINEL' });
  for (const value of [getter,proxy,cycle,hidden,{toJSON:hook},[],undefined]) {
    const p = packet(); p.payload.preparation = value;
    const result = checkRebind(p, { readSource:hook }); assert.equal(result.ok,false); closed(result);
  }
  assert.equal(calls,0);
});
test('direct and transitive drift or missing source rejects the packet', () => {
  for (const file of [...SOURCES, 'offline/cad-auth-command-card-source/preparation.js',
    'docs/cad-auth-restricted-receipt-bundle.json', 'scripts/cad-auth-live-evidence-acceptance-checker.js']) {
    const result = checkRebind(packet(), { readSource:name => name === file ? Buffer.concat([read(name),Buffer.from('\n')]) : read(name) });
    assert.equal(result.ok,false,file); closed(result);
  }
  const result = checkRebind(packet(), { readSource:() => { throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(result.ok,false); closed(result);
});
test('CLI rejects collection, issuance, receipt input and activation modes without writes', () => {
  const before = read(PACKET);
  for (const args of [['--live'],['--collect'],['--issue'],['--activate'],['--retry'],['--seal'],['--receipt','PRIVATE_SENTINEL'],['--write','--live']]) {
    const r = spawnSync(process.execPath,['scripts/cad-auth-sealed-card-custody-rebind-checker.js',...args],{cwd:root,encoding:'utf8'});
    assert.equal(r.status,1); assert.equal(r.stderr,''); closed(JSON.parse(r.stdout));
    assert.deepEqual(read(PACKET),before);
  }
});
test('preparation is absent from runtime imports and checker has no execution/provider path', () => {
  const source = read('scripts/cad-auth-sealed-card-custody-rebind-checker.js').toString();
  assert.doesNotMatch(source,/process\.env|fetch\s*\(|child_process|https?\.request|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e => {
      const f = path.posix.join(dir,e.name); return e.isDirectory() ? walk(f) : /\.[cm]?[jt]sx?$/.test(f) ? [f] : [];
    });
  }
  for (const dir of ['server','api','app','convex','components','hooks','utils','constants'])
    for (const f of walk(dir)) assert.doesNotMatch(read(f).toString(),/cad-auth-sealed-card-custody-rebind/,f);
});
