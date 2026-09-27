const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const prep = require('../offline/cad-auth-live-opening-current-deployment-rebind-prep/preparation');
const { PACKET, SOURCES, checkPacket } = require('./cad-auth-live-opening-current-deployment-rebind-prep-checker');
const { reviewRuntimeMountBinding, createCadLiveOpeningRuntimeMount } = require('../server/cadLiveOpeningRuntimeMount');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  for (const [key, value] of Object.entries(prep.preparation().controls)) assert.equal(result[key], value, key);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|\/Users\/|\.local\//);
}

test('binds approved parents, base, fresh proposed UTC window and non-executable digest', () => {
  const p = packet().preparation;
  assert.equal(checkPacket(packet()).ok, true);
  closed(checkPacket(packet()));
  assert.equal(p.sourceCommit, 'e5e23453852720532b09fcfc1b5c603a1265c816');
  assert.equal(p.parentPackets.runtimeMountPrepSha256, '24d3a96fc431f2a23e14724f4b8c061e8fefaa3cbbb97c4832b6a8d570f10346');
  assert.equal(p.parentPackets.priorDigestPrepSha256, '53aab3bab61f99b8d995236096440ae838f706c25e5e9cf4bb30639faf5bad81');
  assert.equal(p.commandCardDigest.sha256, prep.sha(p.commandCardDigest.draft));
  assert.equal(p.commandCardDigest.executableBytesDigest, null);
  assert.equal(p.commandCardDigest.draft.executable, false);
  assert.equal(p.commandCardDigest.draft.issued, false);
  assert.equal(p.deploymentBinding.productionAliasFreshnessProven, false);
  assert.equal(Date.parse(prep.EXPIRES) - Date.parse(prep.START), 1800000);
  assert.ok(Date.parse(prep.START) > Date.parse('2026-09-27T13:22:56Z'));
  assert.equal(p.proposedOpeningWindow.startInclusiveExpiryExclusive, true);
  for (const value of Object.values(p.commandCardDigest.draft.commandMaterial)) assert.equal(value, null);
});

test('current binding passes source review but never grants admission even with unsafe adapter', async () => {
  const binding = { commandCardDraft: prep.draft(), commandCardSha256: prep.sha(prep.draft()), currentDeploymentReference: prep.DEPLOYMENT };
  assert.equal(reviewRuntimeMountBinding(binding).bindingAccepted, true);
  for (const currentDeploymentReference of [undefined, 'https://vercel.com/stale/deployment']) {
    const result = reviewRuntimeMountBinding({ ...binding, currentDeploymentReference });
    assert.equal(result.bindingAccepted, false);
    assert.equal(result.admissionAuthorized, false);
  }
  assert.equal(reviewRuntimeMountBinding({ ...binding, commandCardSha256: '0'.repeat(64) }).bindingAccepted, false);
  const mount = createCadLiveOpeningRuntimeMount({ ...binding, admissionSwitch: { decide: async () => ({ admissionAuthorized: true, bodyReadAuthorized: true }) } });
  assert.equal(mount.enabled, false);
  const result = await mount.admissionSwitch.decide({ bodyAdmissionAuthorized: true });
  assert.equal(result.admissionAuthorized, false);
  assert.equal(result.bodyReadAuthorized, false);
});

test('every proposal leaf is required and immutable; sanitized errors stay closed', () => {
  const original = prep.preparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      if (item && typeof item === 'object') visit(item, [...trail, key]);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const part of trail) target = target[part];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = prep.checkPreparation(changed);
        assert.equal(result.ok, false, [...trail, key].join('.'));
        closed(result);
        delete target[key];
        assert.equal(prep.checkPreparation(changed).ok, false);
      }
    }
  }
  visit(original);
});

test('source drift and missing parent evidence reject without reflecting source data', () => {
  for (const file of [...SOURCES, 'server/cadLiveOpeningRuntimeMount.js', 'server/cadUserUploadRouter.js']) {
    for (const missing of [false, true]) {
      const result = checkPacket(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('hostile objects are rejected without invoking hooks or source reads', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const cycle = {}; cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, cycle, { toJSON: hook }, new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook })]) {
    const result = checkPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('later approval text binds proposal and mandatory stops without claiming executable digest', () => {
  const phrase = prep.exactApprovalPhrase();
  for (const value of [prep.SOURCE_COMMIT, prep.MOUNT_SHA256, prep.PRIOR_SHA256, prep.DEPLOYMENT, prep.START, prep.EXPIRES, prep.sha(prep.draft())]) assert.ok(phrase.includes(value));
  for (const value of ['one session and one upload attempt', 'across restarts', 'consume the attempt before body read', 'before every effect', 'post-rollback fail-closed smoke', 'separate approval before issuance or use', 'missing durable adapter evidence']) assert.ok(phrase.includes(value), value);
  assert.doesNotMatch(phrase, /<[^>]+>/);
  assert.equal(prep.preparation().nextLiveOpeningGate.authorized, false);
});

test('checker accepts fixed public source reads only and rejects execution modes', () => {
  assert.equal(checkPacket(packet(), { readSource: file => {
    assert.match(file, /^(docs|offline|scripts|server)\//);
    assert.ok(!file.includes('..'));
    assert.doesNotMatch(file, /\.env|\.local/);
    return read(file);
  } }).ok, true);
  for (const args of [['--live'], ['--execute'], ['--issue'], ['--activate'], ['--session'], ['--body'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-live-opening-current-deployment-rebind-prep-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    closed(JSON.parse(run.stdout));
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
  }
});

test('proposal module has no IO and is absent from runtime imports', () => {
  assert.doesNotMatch(read('offline/cad-auth-live-opening-current-deployment-rebind-prep/preparation.js').toString(), /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-live-opening-current-deployment-rebind-prep/, file);
  }
});
