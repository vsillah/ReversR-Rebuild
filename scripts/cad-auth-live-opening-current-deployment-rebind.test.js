const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  CURRENT_PRODUCTION_DEPLOYMENT_REF,
  PROPOSED_START_UTC,
  PROPOSED_EXPIRES_UTC,
  proposedOpeningWindow,
  currentDeploymentCommandCardDraft,
  currentDeploymentCommandCardSha256,
  exactLiveOpeningApprovalPhrase,
  currentDeploymentRebindPreparation,
  checkCurrentDeploymentRebindPreparation,
} = require('../offline/cad-auth-live-opening-current-deployment-rebind/preparation');
const {
  reviewRuntimeMountBinding,
} = require('../server/cadLiveOpeningRuntimeMount');
const { PACKET, SOURCES, checkCurrentDeploymentRebindPacket } =
  require('./cad-auth-live-opening-current-deployment-rebind-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(currentDeploymentRebindPreparation().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('packet binds current deployment rebind while preserving closed controls', () => {
  const p = packet();
  const result = checkCurrentDeploymentRebindPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.preparation.currentDeploymentBinding.currentProductionDeploymentReference,
    CURRENT_PRODUCTION_DEPLOYMENT_REF);
  assert.equal(p.preparation.commandCardDigest.sha256, currentDeploymentCommandCardSha256());
  assert.equal(p.preparation.commandCardDigest.liveCommandCardIssuedByThisGate, false);
  assert.equal(p.preparation.commandCardDigest.executableCommandCardPreparedForLiveExecution, false);
  assert.equal(p.preparation.nextLiveOpeningGate.authorized, false);
  assert.equal(p.preparation.evidenceSummary.allControlsClosed, true);
  assert.equal(p.preparation.evidenceSummary.effectsExecuted, 0);
});

test('proposed UTC window is exact, finite and requires later approval', () => {
  const window = proposedOpeningWindow();
  assert.equal(window.startUtc, PROPOSED_START_UTC);
  assert.equal(window.expiresUtc, PROPOSED_EXPIRES_UTC);
  assert.equal(Date.parse(window.expiresUtc) - Date.parse(window.startUtc), 30 * 60 * 1000);
  assert.equal(window.startInclusiveExpiryExclusive, true);
  assert.equal(window.currentGateDoesNotOpenWindow, true);
  assert.equal(window.laterApprovalMustRepeatWindow, true);
});

test('current deployment draft satisfies runtime binding but runtime stays disabled', () => {
  const draft = currentDeploymentCommandCardDraft();
  assert.equal(draft.productionDeploymentReference, CURRENT_PRODUCTION_DEPLOYMENT_REF);
  assert.equal(draft.openingWindow.startUtc, PROPOSED_START_UTC);
  assert.equal(draft.openingWindow.expiresUtc, PROPOSED_EXPIRES_UTC);
  assert.equal(draft.executable, false);
  assert.equal(draft.issued, false);
  assert.equal(draft.authorizedForLiveUse, false);
  assert.equal(draft.productionUploadAdmissionActivated, false);
  assert.equal(draft.uploadSessionIssuanceEnabled, false);
  assert.equal(draft.requestBodyAdmissionReadAuthorized, false);
  assert.equal(draft.commandMaterial.commandLine, null);
  assert.equal(draft.commandMaterial.executableCommandCard, null);

  const binding = reviewRuntimeMountBinding({
    commandCardDraft: draft,
    commandCardSha256: currentDeploymentCommandCardSha256(),
    currentDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
  });
  assert.equal(binding.bindingAccepted, true);
  assert.equal(binding.ok, false);
  assert.equal(binding.code, 'LIVE_OPENING_RUNTIME_MOUNT_DISABLED');
  assert.equal(binding.currentDeploymentRechecked, true);
});

test('exact live approval phrase is populated except source packet fields and grants no authority now', () => {
  const phrase = exactLiveOpeningApprovalPhrase();
  assert.match(phrase, /one bounded internal production upload-admission opening/);
  assert.match(phrase, new RegExp(CURRENT_PRODUCTION_DEPLOYMENT_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(phrase, new RegExp(currentDeploymentCommandCardSha256()));
  assert.match(phrase, new RegExp(PROPOSED_START_UTC));
  assert.match(phrase, new RegExp(PROPOSED_EXPIRES_UTC));
  assert.match(phrase, /one concurrent session/);
  assert.match(phrase, /one upload attempt/);
  assert.match(phrase, /atomic durable run and attempt claims/);
  assert.match(phrase, /post-rollback fail-closed smoke/);
  assert.deepEqual(currentDeploymentRebindPreparation().nextLiveOpeningGate.unresolvedFields, [
    'currentDeploymentRebindPacketSha256',
    'currentDeploymentRebindSourceCommit',
  ]);
  assert.equal(currentDeploymentRebindPreparation().nextLiveOpeningGate.authorized, false);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = currentDeploymentRebindPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkCurrentDeploymentRebindPreparation(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkCurrentDeploymentRebindPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and hostile inputs fail closed', () => {
  const p = packet();
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkCurrentDeploymentRebindPacket(p, { readSource(file) {
        if (file !== source) return read(file);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(file), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, source);
      closed(result);
    }
  }
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {};
  cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, { toJSON: hook }]) {
    const result = checkCurrentDeploymentRebindPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('CLI refuses live activation, command-card issuance and arbitrary paths', () => {
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'],
    ['--approval', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-live-opening-current-deployment-rebind-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline packet has no IO capability and runtime surface does not import it', () => {
  assert.doesNotMatch(read('offline/cad-auth-live-opening-current-deployment-rebind/preparation.js').toString(),
    /process\.env|fetch\s*\(|node:fs|child_process|https?\.request|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) {
      assert.doesNotMatch(read(file).toString(), /cad-auth-live-opening-current-deployment-rebind/, file);
    }
  }
});
