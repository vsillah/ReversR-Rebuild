const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  DURABLE_ADAPTER_PACKET_SHA256,
  PRODUCTION_DEPLOYMENT_REF,
  NEXT_PHRASE_FIELDS,
  productionFailClosedSmokeEvidence,
  commandCardDigestRequirements,
  nextLiveOpeningApprovalPhraseTemplate,
  durableEvidenceCommandCardReview,
  checkDurableEvidenceCommandCardReview,
} = require('../offline/cad-auth-durable-adapter-evidence-command-card-review/preparation');
const {
  PACKET,
  SOURCES,
  checkReviewPacket,
} = require('./cad-auth-durable-adapter-evidence-command-card-review-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(durableEvidenceCommandCardReview().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('packet binds durable adapter, production target and fail-closed evidence only', () => {
  const p = packet();
  const result = checkReviewPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.preparation.parentPackets.durableAdapterPacketSha256, DURABLE_ADAPTER_PACKET_SHA256);
  assert.equal(p.preparation.evidenceBindings.immutableProductionDeploymentEvidence.deploymentReference,
    PRODUCTION_DEPLOYMENT_REF);
  assert.equal(p.preparation.evidenceBindings.freshAdapterPacketEvidence.defaultFailClosed, true);
  assert.equal(p.preparation.evidenceSummary.allControlsClosed, true);
  assert.equal(p.preparation.evidenceSummary.privateValuesProjected, false);
  assert.equal(p.preparation.evidenceSummary.privatePathsProjected, false);
});

test('production fail-closed smoke evidence records closed routes and zero effects', () => {
  const smoke = productionFailClosedSmokeEvidence();
  assert.equal(smoke.routeCases.length, 5);
  assert.equal(smoke.routeCases.filter(routeCase => routeCase.expectedClosed).length, 3);
  assert.equal(smoke.routeCases.find(routeCase => routeCase.path === '/api/cad/user-import').expectedCode,
    'USER_SESSION_REQUIRED');
  assert.equal(smoke.routeCases.find(routeCase => routeCase.path === '/api/cad/import').expectedCode,
    'UNAUTHORIZED');
  assert.equal(smoke.postRollbackLiveOpeningOccurred, false);
  assert.equal(smoke.rollbackExecutedByThisGate, false);
  assert.ok(Object.values(smoke.observerDeltas).every(count => count === 0));
  assert.equal(smoke.uploadSessionIssued, false);
  assert.equal(smoke.bodyAdmissionReadAuthorized, false);
});

test('independent expiry and durable ledger evidence remain source-only and blocking', () => {
  const review = durableEvidenceCommandCardReview();
  const expiry = review.evidenceBindings.independentExpiryEvidence;
  const ledger = review.evidenceBindings.durableLedgerEvidence;
  assert.equal(expiry.trustedClockRequired, true);
  assert.equal(expiry.admissionAllowedByThisGate, false);
  assert.equal(expiry.liveIndependentExpiryReceiptRequiredLater, true);
  assert.equal(expiry.missingExpiryEvidenceStops, true);
  assert.equal(ledger.runClaimMaxWinners, 1);
  assert.equal(ledger.sessionClaimMaxWinners, 1);
  assert.equal(ledger.attemptClaimMaxWinners, 1);
  assert.equal(ledger.unknownMutationOutcome, 'close fence, revoke, no retry');
  assert.equal(ledger.liveAtomicLedgerReceiptRequiredLater, true);
});

test('command-card requirements are review-only and require later approval', () => {
  const requirements = commandCardDigestRequirements();
  assert.ok(requirements.digestKeys.includes('deployment'));
  assert.ok(requirements.durableReceiptKeys.includes('rollbackSmokeReceipt'));
  assert.ok(requirements.requiredFutureBindingKeys.includes('commandCardSha256'));
  assert.equal(requirements.commandCardIssuedByThisGate, false);
  assert.equal(requirements.executableCommandCardPreparedForLiveExecution, false);
  const gate = durableEvidenceCommandCardReview().nextLiveOpeningGate;
  assert.equal(gate.authorized, false);
  assert.equal(gate.liveOpeningRequiresSeparateApproval, true);
  assert.equal(gate.executableCommandCardIssuanceRequiresSeparateApproval, true);
  assert.deepEqual([...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(match => match[1]),
    NEXT_PHRASE_FIELDS);
  assert.ok(Object.values(gate.phraseFields).every(value => value === null));
});

test('next live approval phrase is exact but unresolved placeholders are not authority', () => {
  const phrase = nextLiveOpeningApprovalPhraseTemplate();
  assert.match(phrase, /one bounded internal production upload-admission opening/);
  assert.match(phrase, /one bounded executable command-card/);
  assert.match(phrase, /one concurrent session/);
  assert.match(phrase, /one upload attempt/);
  assert.match(phrase, /independent expiry checks before every effect/);
  assert.match(phrase, /atomic durable run and attempt claims/);
  assert.match(phrase, /post-rollback fail-closed smoke/);
  assert.match(phrase, new RegExp(DURABLE_ADAPTER_PACKET_SHA256));
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = durableEvidenceCommandCardReview();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkDurableEvidenceCommandCardReview(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkDurableEvidenceCommandCardReview(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkReviewPacket(packet(), { readSource: name => {
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
    const result = checkReviewPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses private paths and execution flags', () => {
  const result = checkReviewPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--live'], ['--activate'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-durable-adapter-evidence-command-card-review-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-durable-adapter-evidence-command-card-review/preparation.js').toString(),
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
      assert.doesNotMatch(read(file).toString(), /cad-auth-durable-adapter-evidence-command-card-review/, file);
    }
  }
});
