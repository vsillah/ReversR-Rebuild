const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { PACKET, SOURCES, checkRebind } = require('./cad-auth-sealed-card-custody-rebind-checker');
const { SOURCE_MERGE_COMMIT, disabledRebind, checkDisabledRebind }
  = require('../offline/cad-auth-sealed-card-custody-rebind/preparation');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  assert.equal(result.executable, false);
  assert.equal(result.executableCommandCardIssued, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.restrictedReceiptCreationAuthorized, false);
  assert.equal(result.restrictedReceiptCollectionAuthorized, false);
  assert.equal(result.restrictedReceiptInstallationAuthorized, false);
  assert.equal(result.restrictedReceiptUseAuthorized, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}

function entries(value, keys = []) {
  if (value === null || typeof value !== 'object') return [{ keys, leaf: true, value }];
  return [{ keys, leaf: false }, ...Object.entries(value).flatMap(([key, child]) => entries(child, [...keys, key]))];
}

test('custody rebind validates but cannot become an executable sealed card', () => {
  const p = packet();
  const result = checkRebind(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.parents.receiptCustodyBinding.sourceMergeCommit, SOURCE_MERGE_COMMIT);
  assert.equal(p.parents.receiptCustodyBinding.restrictedValuesLoaded, false);
  assert.equal(p.parents.receiptCustodyBinding.exactPhrase, null);
  assert.equal(p.preparation.sourceMergeCommit, SOURCE_MERGE_COMMIT);
  assert.equal(checkDisabledRebind(p.preparation).ok, true);
  assert.equal(p.guardrails.priorSealedCardCanBeReused, false);
  assert.equal(p.guardrails.exactApprovalPhrasePopulated, false);
  assert.equal(p.preparation.futureHumanGate.exactPhrase, null);
  assert.equal(p.preparation.freshCommandCardPrerequisites.executableCommandCardRef, null);
});

test('old sealed-card phrase and window are explicitly historical only', () => {
  const p = packet();
  assert.equal(p.parents.historicalSealedCard.packet, 'cad-auth-live-evidence-sealed-card-prep-v1');
  assert.equal(p.parents.historicalSealedCard.startsAtUtc, '2026-09-24T13:00:00Z');
  assert.equal(p.parents.historicalSealedCard.expiresAtUtc, '2026-09-24T13:30:00Z');
  assert.equal(p.parents.historicalSealedCard.reusableForExecution, false);
  assert.equal(p.parents.historicalSealedCard.futureApprovalPhraseWasActionable, false);
  assert.equal(p.preparation.historicalSealedCardDisposition.priorExactPhraseReusable, false);
  assert.equal(p.preparation.historicalSealedCardDisposition.priorWindowReusable, false);
  assert.equal(p.preparation.historicalSealedCardDisposition.oldApprovalTextMustNotBeCopied, true);
});

test('all future card slots remain empty and unreviewed', () => {
  const prereq = disabledRebind().freshCommandCardPrerequisites;
  for (const [key, value] of Object.entries(prereq)) {
    if (typeof value === 'boolean') assert.equal(value, false, key);
    else assert.equal(value, null, key);
  }
  const p = packet();
  assert.deepEqual(p.preparation.freshCommandCardPrerequisites, prereq);
  assert.equal(p.preparation.independentReview.reviewReceiptRef, null);
  assert.equal(p.preparation.receiptDigestReview.validationReceiptSha256, null);
  assert.equal(p.preparation.immutableTargetRecheck.immutableDeploymentRef, null);
});

test('every packet leaf alteration, deletion and nested addition fails closed', () => {
  for (const entry of entries(packet())) {
    for (const mode of entry.leaf ? ['alter', 'delete'] : ['extra']) {
      const p = packet();
      const route = mode === 'extra' ? entry.keys : entry.keys.slice(0, -1);
      let target = p;
      for (const key of route) target = target[key];
      const key = entry.keys.at(-1);
      if (mode === 'extra') target.unknownPrivateField = 'PRIVATE_SENTINEL';
      else if (mode === 'delete') delete target[key];
      else target[key] = typeof entry.value === 'boolean' ? !entry.value
        : typeof entry.value === 'number' ? entry.value + 1 : 'PRIVATE_SENTINEL';
      const result = checkRebind(p);
      assert.equal(result.ok, false, entry.keys.join('.') + ':' + mode);
      closed(result);
    }
  }
});

test('plausible receipt refs, digests, window, target and phrase stay rejected', () => {
  const cases = [
    ['preparation.freshCommandCardPrerequisites.restrictedReceiptBundleRef', 'restricted://bundle'],
    ['preparation.freshCommandCardPrerequisites.restrictedReceiptBundleSha256', 'a'.repeat(64)],
    ['preparation.freshCommandCardPrerequisites.custodyAcceptanceReceiptRef', 'restricted://custody'],
    ['preparation.freshCommandCardPrerequisites.proposedStartsAtUtc', '2026-09-24T20:00:00Z'],
    ['preparation.freshCommandCardPrerequisites.proposedExpiresAtUtc', '2026-09-24T20:30:00Z'],
    ['preparation.freshCommandCardPrerequisites.scheduleSha256', 'b'.repeat(64)],
    ['preparation.freshCommandCardPrerequisites.limitsSha256', 'c'.repeat(64)],
    ['preparation.freshCommandCardPrerequisites.exactApprovalPhrase', 'Approve one read-only synthetic CAD Auth evidence collection'],
    ['preparation.immutableTargetRecheck.candidateCommit', SOURCE_MERGE_COMMIT],
    ['preparation.immutableTargetRecheck.immutableDeploymentRef', 'dpl_future'],
    ['preparation.futureHumanGate.exactPhrase', 'Approve this now'],
  ];
  for (const [route, value] of cases) {
    const p = packet();
    const keys = route.split('.');
    let target = p;
    for (const key of keys.slice(0, -1)) target = target[key];
    target[keys.at(-1)] = value;
    for (const result of [checkRebind(p), checkDisabledRebind(p.preparation)]) {
      assert.equal(result.ok, false, route);
      closed(result);
      assert.equal(JSON.stringify(result).includes(value), false);
    }
  }
});

test('hostile private objects fail without getter, proxy, toJSON or source evaluation', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = packet(); cycle.self = cycle;
  const hidden = packet(); Object.defineProperty(hidden, 'private', { value: 'PRIVATE_SENTINEL' });
  const symbol = packet(); symbol[Symbol('private')] = 'PRIVATE_SENTINEL';
  const toJSON = packet(); toJSON.toJSON = hook;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', NaN, new Date(),
    accessor, proxy, revoked.proxy, cycle, hidden, symbol, toJSON]) {
    const result = checkRebind(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  const nested = packet();
  nested.preparation.freshCommandCardPrerequisites = accessor;
  assert.equal(checkRebind(nested, { readSource: hook }).ok, false);
  assert.equal(calls, 0);
});

test('source drift across both parents and this packet fails closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkRebind(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('parent checks cannot be bypassed by rebinding modified parent hashes', () => {
  const { createHash } = require('node:crypto');
  for (const file of ['docs/cad-auth-live-evidence-sealed-card-prep.json',
    'docs/cad-auth-receipt-custody-binding.json']) {
    const modified = JSON.parse(read(file));
    if (file.includes('sealed-card')) modified.seal.executable = true;
    else modified.preparation.restrictedValuesLoaded = true;
    const bytes = Buffer.from(JSON.stringify(modified));
    const digest = createHash('sha256').update(bytes).digest('hex');
    const p = packet();
    p.sourceBindings[file] = digest;
    if (file.includes('sealed-card')) p.parents.historicalSealedCard.sourceSha256 = digest;
    else p.parents.receiptCustodyBinding.sourceSha256 = digest;
    const result = checkRebind(p, { readSource: name => name === file ? bytes : read(name) });
    assert.equal(result.ok, false);
    closed(result);
  }
});

test('CLI rejects live, collection, issuance, retry and arbitrary path modes', () => {
  const before = read(PACKET);
  for (const args of [['--live'], ['--collect'], ['--issue'], ['--seal'], ['--approve'],
    ['--retry'], ['--write', '--live'], ['--write=PRIVATE_SENTINEL'], ['/tmp/PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-sealed-card-custody-rebind-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no I/O and runtime code does not import the rebind packet', () => {
  assert.doesNotMatch(read('offline/cad-auth-sealed-card-custody-rebind/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-sealed-card-custody-rebind/, file);
  }
});
