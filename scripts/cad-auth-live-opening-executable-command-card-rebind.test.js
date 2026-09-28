const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const {
  CURRENT_PRODUCTION_DEPLOYMENT_REF,
  PROPOSED_START_UTC,
  PROPOSED_EXPIRES_UTC,
  BOUNDED_SESSION_REF,
  proposedOpeningWindow,
  durableEvidenceDigest,
  executableCommandCardDraft,
  executableCommandCardBytes,
  executableCommandCardSha256,
  exactLiveOpeningApprovalPhrase,
  executableCommandCardRebindPreparation,
  checkExecutableCommandCardRebindPreparation,
} = require('../offline/cad-auth-live-opening-executable-command-card-rebind/preparation');
const {
  EXECUTABLE_COMMAND_CARD_ARTIFACT,
  reviewExecutableCommandCardBinding,
} = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  PACKET,
  SOURCES,
  checkPacket,
} = require('./cad-auth-live-opening-executable-command-card-rebind-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(executableCommandCardRebindPreparation().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('packet binds PR 433 production deployment and preserves closed controls', () => {
  const p = packet();
  const result = checkPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.preparation.productionDeploymentReference, CURRENT_PRODUCTION_DEPLOYMENT_REF);
  assert.equal(p.preparation.executableCommandCardDigest.sha256, executableCommandCardSha256());
  assert.equal(p.preparation.executableCommandCardDigest.byteSha256, executableCommandCardSha256());
  assert.equal(p.preparation.executableCommandCardDigest.canonicalJsonSha256, executableCommandCardSha256());
  assert.equal(p.preparation.executableCommandCardDigest.executableCommandCardIssuedByThisGate, false);
  assert.equal(p.preparation.executableCommandCardDigest.runtimeActivationAuthorizedByThisGate, false);
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

test('executable command-card draft is exact runtime-accepted shape but not issued by this gate', () => {
  const card = executableCommandCardDraft();
  assert.equal(card.artifact, EXECUTABLE_COMMAND_CARD_ARTIFACT);
  assert.equal(card.sourceOnly, false);
  assert.equal(card.executable, true);
  assert.equal(card.issued, true);
  assert.equal(card.productionDeploymentReference, CURRENT_PRODUCTION_DEPLOYMENT_REF);
  assert.equal(card.sessionId, BOUNDED_SESSION_REF);
  assert.equal(card.durableEvidenceSha256, durableEvidenceDigest());
  assert.equal(card.requestBodyAdmissionReadAuthorized, true);
  assert.equal(executableCommandCardBytes(), JSON.stringify(card));

  const binding = reviewExecutableCommandCardBinding({
    commandCardBytes: executableCommandCardBytes(),
    commandCardSha256: executableCommandCardSha256(),
    currentDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
  });
  assert.equal(binding.bindingAccepted, true);
  assert.equal(binding.ok, false);
  assert.equal(binding.code, 'EXECUTABLE_RUNTIME_WIRING_READY_DISABLED_BY_DEFAULT');
  assert.equal(binding.currentDeploymentRechecked, true);
});

test('stale deployment, changed bytes or non-executable card fail runtime binding', () => {
  assert.equal(reviewExecutableCommandCardBinding({
    commandCardBytes: executableCommandCardBytes(),
    commandCardSha256: executableCommandCardSha256(),
    currentDeploymentReference: 'https://vercel.com/vsillahs-projects/reversr/stale',
  }).bindingAccepted, false);
  assert.equal(reviewExecutableCommandCardBinding({
    commandCardBytes: `${executableCommandCardBytes()}\n`,
    commandCardSha256: executableCommandCardSha256(),
    currentDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
  }).bindingAccepted, false);
  const draft = { ...executableCommandCardDraft(), executable: false, issued: false };
  assert.equal(reviewExecutableCommandCardBinding({
    commandCardBytes: JSON.stringify(draft),
    commandCardSha256: executableCommandCardSha256(),
    currentDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
  }).bindingAccepted, false);
});

test('exact live approval phrase is populated except source packet fields and grants no authority now', () => {
  const phrase = exactLiveOpeningApprovalPhrase();
  assert.match(phrase, /one bounded internal production upload-admission opening/);
  assert.match(phrase, new RegExp(CURRENT_PRODUCTION_DEPLOYMENT_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(phrase, new RegExp(executableCommandCardSha256()));
  assert.match(phrase, new RegExp(durableEvidenceDigest()));
  assert.match(phrase, new RegExp(BOUNDED_SESSION_REF));
  assert.match(phrase, new RegExp(PROPOSED_START_UTC));
  assert.match(phrase, new RegExp(PROPOSED_EXPIRES_UTC));
  assert.match(phrase, /one concurrent session/);
  assert.match(phrase, /one upload attempt/);
  assert.match(phrase, /atomic durable run and attempt claims/);
  assert.match(phrase, /post-rollback fail-closed smoke/);
  assert.deepEqual(executableCommandCardRebindPreparation().nextLiveOpeningGate.unresolvedFields, [
    'executableCommandCardRebindPacketSha256',
    'executableCommandCardRebindSourceCommit',
  ]);
  assert.equal(executableCommandCardRebindPreparation().nextLiveOpeningGate.authorized, false);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = executableCommandCardRebindPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkExecutableCommandCardRebindPreparation(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkExecutableCommandCardRebindPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and hostile inputs fail closed', () => {
  const p = packet();
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPacket(p, { readSource(file) {
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
    const result = checkPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker refuses live execution, command-card issuance and arbitrary paths', () => {
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'],
    ['--approval', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-live-opening-executable-command-card-rebind-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline packet has no IO capability and runtime surface does not import it', () => {
  assert.doesNotMatch(read('offline/cad-auth-live-opening-executable-command-card-rebind/preparation.js').toString(),
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
      assert.doesNotMatch(read(file).toString(), /cad-auth-live-opening-executable-command-card-rebind/, file);
    }
  }
});
