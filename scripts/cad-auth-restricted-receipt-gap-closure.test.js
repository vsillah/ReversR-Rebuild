const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET, SOURCES, checkGapClosurePacket } =
  require('./cad-auth-restricted-receipt-gap-closure-checker');
const { checkGapClosurePlan } =
  require('../offline/cad-auth-restricted-receipt-gap-closure/preparation');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  assert.equal(result.executable, false);
  assert.equal(result.executableCommandCardIssued, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.bodyAdmissionAuthorized, false);
  assert.equal(result.uploadSessionIssuanceEnabled, false);
  assert.equal(result.requestBodyAdmissionRead, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.retryOrSecondRunAuthorized, false);
  assert.equal(result.commercialReadinessClaimed, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\//);
}

test('public gap-closure packet validates and remains source-only', () => {
  const p = packet();
  const result = checkGapClosurePacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.status, 'SOURCE_ONLY_GAP_CLOSURE_PLAN_NO_PRIVATE_RECEIPTS_LOADED');
  assert.equal(p.preparation.sourceOnly, true);
  assert.equal(p.preparation.observedGap.fullCategoryMatches, 0);
  assert.equal(p.preparation.observedGap.parsedJsonFiles, 98);
  assert.equal(p.preparation.observedGap.concreteProviderRuntimeBindingPartial.filesWithAnyRequiredField, 4);
  assert.deepEqual(p.preparation.observedGap.concreteProviderRuntimeBindingPartial.presentFields,
    { adapterSourceSha256: true });
});

test('all eight categories preserve public required field contracts', () => {
  const categories = packet().preparation.requiredCategories;
  assert.deepEqual(Object.keys(categories), REQUIRED_LIVE_BINDINGS);
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const entry = categories[category];
    assert.equal(entry.requiredReceiptFile, `${category}.json`);
    assert.deepEqual(Object.keys(entry.requiredFields), RECEIPT_FIELDS[category]);
    assert.ok(Object.values(entry.requiredFields).every(Boolean));
    assert.equal(entry.requiredArtifactContract.privateValueDisclosureAllowed, false);
    assert.equal(entry.requiredArtifactContract.localPathDisclosureAllowed, false);
    assert.equal(entry.requiredArtifactContract.topLevelKeyListingAllowed, false);
  }
});

test('source and provenance boundary blocks private and live promotion', () => {
  const prep = packet().preparation;
  assert.equal(prep.sourceAndProvenanceBoundary.disallowedSourceActions.automaticPrivateSearch, true);
  assert.equal(prep.sourceAndProvenanceBoundary.disallowedSourceActions.localPathPublication, true);
  assert.equal(prep.sourceAndProvenanceBoundary.disallowedSourceActions.privateReceiptValuePublication, true);
  assert.equal(prep.sourceAndProvenanceBoundary.publicCommitBoundary.docsTestsCheckersManifestsOnly, true);
  assert.equal(prep.stopConditions.providerOrRuntimeCredentialNeeded, true);
  assert.equal(prep.stopConditions.liveCollectionNeeded, true);
  assert.equal(prep.stopConditions.requestBodyReadNeeded, true);
  assert.equal(prep.futureApprovalGates.privateSourceSetGeneration.mustName.exactSourceFolder, true);
  assert.equal(prep.futureApprovalGates.liveEvidenceCollection.mustName.sealedCommandCardDigest, true);
});

test('mutations, source drift and hostile inputs fail closed', () => {
  assert.equal(checkGapClosurePlan(packet().preparation).ok, true);
  for (const file of SOURCES) {
    const result = checkGapClosurePacket(packet(), { readSource: name => {
      if (name !== file) return read(name);
      return Buffer.concat([read(name), Buffer.from('\n')]);
    } });
    assert.equal(result.ok, false, file);
    closed(result);
  }
  const mutated = packet();
  mutated.preparation.controls.liveCollectionAuthorized = true;
  let result = checkGapClosurePacket(mutated);
  assert.equal(result.ok, false);
  closed(result);

  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = packet(); cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle]) {
    result = checkGapClosurePacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('gap-closure source is isolated from runtime imports', () => {
  assert.doesNotMatch(read('offline/cad-auth-restricted-receipt-gap-closure/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-restricted-receipt-gap-closure/, file);
  }
});
