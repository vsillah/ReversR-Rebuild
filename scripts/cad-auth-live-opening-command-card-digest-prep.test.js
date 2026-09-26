const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  SOURCE_COMMIT,
  EVIDENCE_PACKET_SHA256,
  DURABLE_ADAPTER_PACKET_SHA256,
  PRODUCTION_DEPLOYMENT_REF,
  PROPOSED_START_UTC,
  PROPOSED_EXPIRES_UTC,
  proposedOpeningWindow,
  commandCardDigestDraft,
  commandCardSha256,
  exactLiveOpeningApprovalPhrase,
  liveOpeningCommandCardDigestPreparation,
  checkLiveOpeningCommandCardDigestPreparation,
} = require('../offline/cad-auth-live-opening-command-card-digest-prep/preparation');
const {
  PACKET,
  SOURCES,
  checkDigestPrepPacket,
} = require('./cad-auth-live-opening-command-card-digest-prep-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(liveOpeningCommandCardDigestPreparation().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('packet binds parent evidence, command-card digest and proposed window only', () => {
  const p = packet();
  const result = checkDigestPrepPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.parent.durableAdapterEvidenceCommandCardReview.sha256, EVIDENCE_PACKET_SHA256);
  assert.equal(p.preparation.parentPackets.durableAdapterPacketSha256, DURABLE_ADAPTER_PACKET_SHA256);
  assert.equal(p.preparation.commandCardDigest.sha256, commandCardSha256());
  assert.equal(p.preparation.commandCardDigest.digestResolved, true);
  assert.equal(p.preparation.commandCardDigest.liveCommandCardIssuedByThisGate, false);
  assert.equal(p.preparation.nextLiveOpeningGate.authorized, false);
  assert.equal(p.preparation.evidenceSummary.allControlsClosed, true);
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

test('digest draft has no executable command material or live authorization', () => {
  const draft = commandCardDigestDraft();
  assert.equal(draft.executable, false);
  assert.equal(draft.issued, false);
  assert.equal(draft.authorizedForLiveUse, false);
  assert.equal(draft.productionUploadAdmissionActivated, false);
  assert.equal(draft.uploadSessionIssuanceEnabled, false);
  assert.equal(draft.requestBodyAdmissionReadAuthorized, false);
  assert.equal(draft.commandMaterial.commandLine, null);
  assert.equal(draft.commandMaterial.executableCommandCard, null);
  assert.equal(draft.ceilings.concurrentSessions, 1);
  assert.equal(draft.ceilings.uploadAttempts, 1);
  assert.equal(draft.ceilings.retries, 0);
  assert.equal(draft.ceilings.secondLiveRuns, 0);
  assert.equal(draft.ceilings.cadPayloadBodyReadsAuthorizedByThisGate, 0);
});

test('exact live approval phrase is fully populated but not current authority', () => {
  const phrase = exactLiveOpeningApprovalPhrase();
  assert.match(phrase, /one bounded internal production upload-admission opening/);
  assert.match(phrase, new RegExp(EVIDENCE_PACKET_SHA256));
  assert.match(phrase, new RegExp(SOURCE_COMMIT));
  assert.match(phrase, new RegExp(commandCardSha256()));
  assert.match(phrase, new RegExp(PROPOSED_START_UTC));
  assert.match(phrase, new RegExp(PROPOSED_EXPIRES_UTC));
  assert.match(phrase, /one concurrent session/);
  assert.match(phrase, /one upload attempt/);
  assert.match(phrase, /atomic durable run and attempt claims/);
  assert.match(phrase, /post-rollback fail-closed smoke/);
  assert.doesNotMatch(phrase, /<[^>]+>/);
  assert.equal(liveOpeningCommandCardDigestPreparation().nextLiveOpeningGate.authorized, false);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = liveOpeningCommandCardDigestPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkLiveOpeningCommandCardDigestPreparation(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkLiveOpeningCommandCardDigestPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkDigestPrepPacket(packet(), { readSource: name => {
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
    const result = checkDigestPrepPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses live/issue modes', () => {
  const result = checkDigestPrepPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--live'], ['--activate'], ['--issue'],
    ['--session'], ['--body'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-live-opening-command-card-digest-prep-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-live-opening-command-card-digest-prep/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) {
      assert.doesNotMatch(read(file).toString(), /cad-auth-live-opening-command-card-digest-prep/, file);
    }
  }
});
