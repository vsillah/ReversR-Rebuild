const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { projectionPreparation, checkProjectionPreparation } = require('../offline/cad-auth-accepted-provenance-projection/preparation');
const { PACKET, SOURCES, checkProjectionPacket } = require('./cad-auth-accepted-provenance-projection-checker');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  for (const field of Object.keys(projectionPreparation().controls)) assert.equal(result[field], false, field);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\//);
}
test('supplied accepted review is projected without authorizing receipts or runtime', () => {
  const p = packet();
  const result = checkProjectionPacket(p);
  assert.equal(result.ok, true); closed(result);
  assert.equal(p.sourceMergeCommit, '5690e016163d916096a40a9a09204c57c5a541c5');
  assert.equal(p.preparation.disposition.acceptedFields, 22);
  assert.equal(p.preparation.disposition.totalFields, 22);
  assert.equal(p.preparation.disposition.verifiedRepairedMappings, 2);
  assert.equal(p.preparation.disposition.totalRepairedMappings, 2);
  assert.equal(p.preparation.acceptedReview.sha256, 'b82710710dad2560c098e9e207af3b5beff5c9bb0223020ebf371b169abe2088');
  assert.equal(p.preparation.acceptedReview.receiptSha256, 'e3687b11ea4d55f64d21b183c3abf46f88d8c56291b5ce93e4905ffec6d29fbd');
  assert.equal(p.preparation.acceptedReview.scheduleSha256, 'fc8611568aaf7eaf48a132b274d748d931ebba81acf05ee2b7088376701f7bcb');
  assert.equal(p.preparation.retentionDeletion.status, 'PRIVATE_DISPOSITION_DETAILS_NOT_SUPPLIED');
  assert.equal(p.preparation.retentionDeletion.mustBindBeforeReceiptSupply, true);
  assert.equal(p.preparation.futureApprovalGate.authorized, false);
  for (const binding of Object.values(p.preparation.acceptedReview)) assert.ok(p.preparation.futureApprovalGate.exactApprovalPhrase.includes(binding));
  assert.match(p.preparation.futureApprovalGate.exactApprovalPhrase, /No private reads or discovery/);
  assert.match(p.preparation.futureApprovalGate.exactApprovalPhrase, /receipt creation or supply/);
});
test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = projectionPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkProjectionPreparation(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkProjectionPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkProjectionPacket(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('hostile inputs reject without invoking getters, proxies, serializers or source reads', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {};
  cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, { toJSON: hook }]) {
    const result = checkProjectionPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses private paths and execution flags', () => {
  const result = checkProjectionPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-accepted-provenance-projection-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-accepted-provenance-projection/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-accepted-provenance-projection/, file);
  }
});
