const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkBinding } = require('./cad-auth-receipt-custody-binding-checker');
const { MERGE_COMMIT, disabledBinding, checkDisabledBinding }
  = require('../offline/cad-auth-receipt-custody-binding/preparation');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  assert.equal(result.executable, false);
  for (const key of ['restrictedReceiptCreationAuthorized', 'restrictedReceiptCollectionAuthorized',
    'restrictedReceiptInstallationAuthorized', 'restrictedReceiptUseAuthorized']) assert.equal(result[key], false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.liveCollectorCommandLine, null);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}

test('source contract validates with eight missing bindings and zero execution authority', () => {
  const p = packet();
  assert.equal(p.parent.mergeCommit, MERGE_COMMIT);
  assert.equal(p.parent.consumedStopCode, 'MISSING_PREREQUISITE');
  assert.equal(p.parent.priorApprovalReusable, false);
  assert.equal(checkBinding(p).ok, true);
  assert.equal(checkDisabledBinding(p.preparation).ok, true);
  closed(checkBinding(p));
  assert.deepEqual(Object.keys(p.preparation.runtimeBindingReceipts), REQUIRED_LIVE_BINDINGS);
  for (const receipt of Object.values(p.preparation.runtimeBindingReceipts)) {
    assert.equal(receipt.boundMergeCommit, '8c69d2c845dd2dd5d733280ef983b6c4a9248213');
    assert.equal(receipt.status, 'MISSING_PREREQUISITE');
    assert.equal(receipt.accepted, false);
    assert.ok(Object.values(receipt.evidence).every(value => value === null));
  }
});

test('custody roles and independent review requirements stay unbound', () => {
  const binding = disabledBinding();
  assert.equal(binding.bindingStatus, 'UNBOUND_SOURCE_ONLY');
  for (const flag of ['restrictedReceiptCreationAuthorized', 'restrictedReceiptCollectionAuthorized',
    'restrictedReceiptInstallationAuthorized', 'restrictedReceiptUseAuthorized']) {
    assert.equal(binding[flag], false);
  }
  assert.deepEqual(Object.keys(binding.roles), ['custodian', 'preparer', 'independentReviewer', 'deletionOwner']);
  for (const role of Object.values(binding.roles)) {
    assert.equal(typeof role.responsibility, 'string');
    assert.equal(role.identityRef, null);
    assert.equal(role.assignmentReceiptRef, null);
  }
  assert.equal(binding.independentReview.reviewerDistinctFromCustodianRequired, true);
  assert.equal(binding.independentReview.reviewerDistinctFromPreparerRequired, true);
  assert.equal(binding.independentReview.selfAttestationSufficient, false);
  assert.equal(binding.independentReview.allEightCategoriesRequired, true);
  assert.equal(binding.independentReview.conflictsResolved, false);
  assert.equal(binding.independentReview.identitySeparationVerified, false);
});

test('retention, immutable target and digest review requirements are explicit but empty', () => {
  const binding = disabledBinding();
  assert.equal(binding.retentionDisposition.retentionDays, 7);
  assert.equal(binding.retentionDisposition.retentionStartsAt, 'FIRST_RESTRICTED_RECEIPT_CREATION');
  assert.equal(binding.retentionDisposition.separatelyAuthorizedDeletionRequired, true);
  assert.equal(binding.retentionDisposition.deletionAuthorized, false);
  assert.equal(binding.retentionDisposition.expiredEvidenceBlocksUse, true);
  assert.equal(binding.retentionDisposition.repositoryStorageAuthorized, false);
  assert.equal(binding.retentionDisposition.publicProjectionAuthorized, false);
  assert.equal(binding.immutableTargetRecheck.exactCommitAndDeploymentRequired, true);
  assert.equal(binding.immutableTargetRecheck.mutableAliasSufficient, false);
  assert.equal(binding.immutableTargetRecheck.recheckBeforeCommandCardProposalRequired, true);
  assert.equal(binding.immutableTargetRecheck.driftInvalidatesPriorReview, true);
  assert.equal(binding.immutableTargetRecheck.sourceHashProvesInstalledRuntime, false);
  assert.equal(binding.receiptDigestReview.algorithm, 'SHA-256');
  assert.equal(binding.receiptDigestReview.encoding, 'lowercase-hex-64');
  assert.equal(binding.receiptDigestReview.byteScope, 'EXACT_STORED_RECEIPT_BYTES');
  assert.equal(binding.receiptDigestReview.independentRecomputationRequired, true);
  assert.equal(binding.receiptDigestReview.sourceDigestSubstitutionAllowed, false);
  assert.equal(binding.receiptDigestReview.digestAloneProvesAuthenticity, false);
  assert.equal(binding.receiptDigestReview.missingMismatchUnknownBlocksReview, true);
  assert.equal(binding.receiptDigestReview.verified, false);
});

test('malformed, private, cyclic, accessor and proxy inputs fail without evaluation or disclosure', () => {
  let calls = 0;
  const getter = packet();
  Object.defineProperty(getter.preparation, 'executable', { enumerable: true, get() { calls++; return false; } });
  const hidden = packet();
  Object.defineProperty(hidden, 'private', { value: 'PRIVATE_SENTINEL' });
  const symbol = packet(); symbol[Symbol('private')] = 'PRIVATE_SENTINEL';
  const cycle = packet(); cycle.self = cycle;
  const proxy = new Proxy({}, { getPrototypeOf() { calls++; throw Error('PRIVATE_SENTINEL'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const nested = packet(); nested.preparation = proxy;
  const toJSON = packet(); toJSON.toJSON = () => { calls++; return 'PRIVATE_SENTINEL'; };
  for (const input of [null, [], 'PRIVATE_SENTINEL', undefined, NaN, new Date(),
    { ...packet(), private: 'PRIVATE_SENTINEL' }, getter, hidden, symbol, cycle, proxy, revoked.proxy, nested, toJSON]) {
    for (const check of [checkBinding, checkDisabledBinding]) {
      const result = check(input); assert.equal(result.ok, false); closed(result);
    }
  }
  assert.equal(calls, 0);
});

test('every receipt promotion and populated evidence slot fails closed', () => {
  for (const name of REQUIRED_LIVE_BINDINGS) {
    const receipt = disabledBinding().runtimeBindingReceipts[name];
    for (const field of Object.keys(receipt)) {
      const p = packet();
      p.preparation.runtimeBindingReceipts[name][field] = typeof receipt[field] === 'boolean' ? true : 'PRIVATE_SENTINEL';
      assert.equal(checkBinding(p).ok, false);
      assert.equal(checkDisabledBinding(p.preparation).ok, false);
    }
    for (const field of Object.keys(receipt.evidence)) {
      const p = packet(); p.preparation.runtimeBindingReceipts[name].evidence[field] = 'PRIVATE_SENTINEL';
      const result = checkBinding(p); assert.equal(result.ok, false); closed(result);
    }
  }
  const p = packet();
  for (const receipt of Object.values(p.preparation.runtimeBindingReceipts)) receipt.accepted = true;
  assert.equal(checkBinding(p).ok, false);
});

test('live commands, gates, counters, merge drift and extra fields cannot promote a card', () => {
  for (const [key, value] of Object.entries(disabledBinding())) {
    if (typeof value !== 'boolean' && value !== null && typeof value !== 'number') continue;
    const p = packet(); p.preparation[key] = typeof value === 'boolean' ? !value : value === null ? 'node live.js' : 1;
    const result = checkBinding(p); assert.equal(result.ok, false); closed(result);
  }
  for (const key of Object.keys(disabledBinding().futureHumanGate)) {
    const p = packet(); p.preparation.futureHumanGate[key] = 'PRIVATE_SENTINEL';
    assert.equal(checkBinding(p).ok, false);
  }
  for (const mutate of [p => { p.parent.mergeCommit = 'drift'; },
    p => { p.parent.priorApprovalReusable = true; }, p => { p.command = 'node live.js'; },
    p => { p.sourceOnly = false; }]) {
    const p = packet(); mutate(p); assert.equal(checkBinding(p).ok, false);
  }
});

test('direct and transitive source drift fails closed', () => {
  for (const file of [...SOURCES, 'offline/cad-auth-live-collector-binding/guardedCollector.js',
    'scripts/cad-auth-live-evidence-acceptance-checker.js']) {
    const result = checkBinding(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) });
    assert.equal(result.ok, false); closed(result);
  }
  const result = checkBinding(packet(), { readSource: () => { throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(result.ok, false); closed(result);
});

test('CLI rejects live, retry, collect, issuance and unknown modes without writing', () => {
  const before = read(PACKET);
  for (const args of [['--live'], ['--retry'], ['--collect'], ['live'], ['retry'], ['collect'],
    ['--issue'], ['--seal'], ['--write', '--live'], ['--write=PRIVATE_SENTINEL'], ['--unknown']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-receipt-custody-binding-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no I/O and no runtime source imports the preparation package', () => {
  assert.doesNotMatch(read('offline/cad-auth-receipt-custody-binding/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-receipt-custody-binding/, file);
  }
});

// Exercise every scalar and every object boundary, including custody and future gates.
test('every leaf alteration, deletion and unknown nested field fails closed', () => {
  function visit(value, keys = []) {
    if (value === null || typeof value !== 'object') return [{ keys, leaf: true, value }];
    return [{ keys, leaf: false }, ...Object.entries(value).flatMap(([key, child]) => visit(child, [...keys, key]))];
  }
  for (const entry of visit(packet())) {
    for (const mode of entry.leaf ? ['alter', 'delete'] : ['extra']) {
      const p = packet();
      let target = p;
      const route = mode === 'extra' ? entry.keys : entry.keys.slice(0, -1);
      for (const key of route) target = target[key];
      const key = entry.keys.at(-1);
      if (mode === 'extra') target.unknownPrivateField = 'PRIVATE_SENTINEL';
      else if (mode === 'delete') delete target[key];
      else target[key] = typeof entry.value === 'boolean' ? !entry.value
        : typeof entry.value === 'number' ? entry.value + 1 : 'PRIVATE_SENTINEL';
      const result = checkBinding(p);
      assert.equal(result.ok, false, entry.keys.join('.') + ':' + mode);
      closed(result);
    }
  }
});

test('nested hostile receipt data is rejected before hooks or source reads', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cyclic = {}; cyclic.self = cyclic;
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const hidden = {}; Object.defineProperty(hidden, 'private', { value: 'PRIVATE_SENTINEL' });
  for (const hostile of [accessor, proxy, cyclic, revoked.proxy, hidden, { toJSON: hook },
    Object.create({ private: 'PRIVATE_SENTINEL' }), { [Symbol('private')]: 'PRIVATE_SENTINEL' }]) {
    const p = packet();
    p.preparation.runtimeBindingReceipts.custodyReviewerReceipt.evidence = hostile;
    assert.equal(checkDisabledBinding(p.preparation).ok, false);
    const result = checkBinding(p, { readSource: hook });
    assert.equal(result.ok, false); closed(result);
  }
  assert.equal(calls, 0);
});

test('parent validation cannot be bypassed by rebinding a modified parent hash', () => {
  const { createHash } = require('node:crypto');
  const parentFile = 'docs/cad-auth-restricted-receipt-bundle.json';
  const modified = JSON.parse(read(parentFile));
  modified.preparation.executable = true;
  const bytes = Buffer.from(JSON.stringify(modified));
  const digest = createHash('sha256').update(bytes).digest('hex');
  const p = packet(); p.parent.sha256 = digest; p.sourceBindings[parentFile] = digest;
  const result = checkBinding(p, { readSource: file => file === parentFile ? bytes : read(file) });
  assert.equal(result.ok, false); closed(result);
});


test('plausible receipt refs, digests, identities and targets remain rejected', () => {
  const cases = [
    ['bundleReceiptRef', 'restricted://synthetic/bundle'],
    ['bundleReceiptSha256', 'a'.repeat(64)],
    ['roles.independentReviewer.identityRef', 'synthetic-reviewer'],
    ['independentReview.reviewReceiptSha256', 'b'.repeat(64)],
    ['retentionDisposition.startUtc', '2026-09-24T00:00:00Z'],
    ['retentionDisposition.dispositionReceiptRef', 'restricted://synthetic/disposition'],
    ['immutableTargetRecheck.candidateCommit', 'c'.repeat(40)],
    ['immutableTargetRecheck.immutableDeploymentRef', 'synthetic-deployment-id'],
    ['receiptDigestReview.validationReceiptSha256', 'd'.repeat(64)],
  ];
  for (const [route, value] of cases) {
    const p = packet();
    const keys = route.split('.');
    let target = p.preparation;
    for (const key of keys.slice(0, -1)) target = target[key];
    target[keys.at(-1)] = value;
    for (const result of [checkBinding(p), checkDisabledBinding(p.preparation)]) {
      assert.equal(result.ok, false); closed(result);
      assert.equal(JSON.stringify(result).includes(value), false);
    }
  }
});
