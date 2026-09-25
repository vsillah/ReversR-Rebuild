const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET, SOURCES, checkSupplyPacket } =
  require('./cad-auth-eight-artifact-supply-gate-checker');
const { checkBundlePreparation } =
  require('../offline/cad-auth-eight-artifact-supply-gate/preparation');

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

test('public artifact preparation packet validates and remains source-only', () => {
  const p = packet();
  const result = checkSupplyPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.status, 'SOURCE_ONLY_BUNDLED_SUPPLY_GATE_NO_PRIVATE_RECEIPTS_LOADED');
  assert.equal(p.preparation.sourceOnly, true);

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
  assert.equal(prep.futureApprovalGates.privateRead.phraseFields.exactSourceFolder, null);
  assert.equal(prep.futureApprovalGates.liveEvidenceCollection.mustName.sealedCommandCardDigest, true);
});

test('mutations, source drift and hostile inputs fail closed', () => {
  assert.equal(checkBundlePreparation(packet().preparation).ok, true);
  for (const file of SOURCES) {
    const result = checkSupplyPacket(packet(), { readSource: name => {
      if (name !== file) return read(name);
      return Buffer.concat([read(name), Buffer.from('\n')]);
    } });
    assert.equal(result.ok, false, file);
    closed(result);
  }
  const mutated = packet();
  mutated.preparation.controls.liveCollectionAuthorized = true;
  let result = checkSupplyPacket(mutated);
  assert.equal(result.ok, false);
  closed(result);

  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = packet(); cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle]) {
    result = checkSupplyPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('artifact preparation source is isolated from runtime imports', () => {
  assert.doesNotMatch(read('offline/cad-auth-eight-artifact-supply-gate/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-eight-artifact-supply-gate/, file);
  }
});


test('every category supply field and approval boundary is mandatory and immutable', () => {
  const prep = packet().preparation;
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const entry = prep.requiredCategories[category];
    for (const field of ['sourceSystem', 'custodian', 'reviewer', 'category', 'allowedEvidenceSource', 'retentionBoundary', 'creationOrSupplyPlan', 'supplyMethod', 'futurePrivateReadApprovalPhrase']) {
      assert.equal(typeof entry[field], 'string');
      assert.ok(entry[field].length > 0);
      const altered = structuredClone(prep);
      delete altered.requiredCategories[category][field];
      assert.equal(checkBundlePreparation(altered).ok, false);
    }
    assert.match(entry.futurePrivateReadApprovalPhrase, new RegExp(`category ${category}`));
    assert.match(entry.futurePrivateReadApprovalPhrase, /<exactPrivateReceiptSource>/);
    assert.match(entry.futurePrivateReadApprovalPhrase, /No provider\/env\/resource\/billing changes/);
    assert.equal(entry.categoryStopConditions.missingNamedPrivateReceiptSource, true);
    assert.equal(entry.categoryStopConditions.liveEvidenceCollectionNeeded, true);
    assert.equal(entry.categoryStopConditions.executableCommandCardNeeded, true);
    assert.equal(entry.categoryStopConditions.requestBodyAdmissionOrReadNeeded, true);
    assert.equal(entry.accepted, false);
    assert.equal(entry.status, 'MISSING_NOT_CREATED_OR_SUPPLIED');
  }
  for (const field of Object.keys(prep.controls)) {
    const altered = structuredClone(prep);
    altered.controls[field] = true;
    assert.equal(checkBundlePreparation(altered).ok, false, field);
  }
  for (const field of Object.keys(prep.stopConditions)) {
    const altered = structuredClone(prep);
    altered.stopConditions[field] = false;
    assert.equal(checkBundlePreparation(altered).ok, false, field);
  }
  for (const gate of ['bundledArtifactSupply', 'privateRead']) {
    for (const field of ['authorized', 'exactPhraseTemplate']) {
      const altered = structuredClone(prep);
      altered.futureApprovalGates[gate][field] = true;
      assert.equal(checkBundlePreparation(altered).ok, false);
    }
  }
  assert.ok(Object.values(prep.futureApprovalGates.privateRead.phraseFields).every(v => v === null));
});

test('public checker reads only bound public sources and rejects private CLI inputs', () => {
  const seen = new Set();
  const result = checkSupplyPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    seen.add(file);
    return read(file);
  } });
  assert.equal(result.ok, true);
  assert.ok(seen.size > SOURCES.length);
  const { spawnSync } = require('node:child_process');
  const run = spawnSync(process.execPath, ['scripts/cad-auth-eight-artifact-supply-gate-checker.js', 'PRIVATE_SENTINEL'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL/);
});


test('single bundle phrase requires every schedule field without granting any execution authority', () => {
  const prep = packet().preparation;
  const gate = prep.futureApprovalGates.bundledArtifactSupply;
  assert.equal(gate.exactReceiptCount, 8);
  assert.deepEqual(Object.keys(gate.categorySet), REQUIRED_LIVE_BINDINGS);
  assert.deepEqual(Object.keys(gate.requiredSchedule.categoryAssignments), REQUIRED_LIVE_BINDINGS);
  const placeholders = [...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]);
  assert.deepEqual(placeholders, Object.keys(gate.phraseFields));
  assert.ok(Object.values(gate.phraseFields).every(value => value === null));
  for (const category of REQUIRED_LIVE_BINDINGS) {
    assert.ok(gate.exactPhraseTemplate.includes(category));
    const assignment = gate.requiredSchedule.categoryAssignments[category];
    assert.equal(assignment.receiptFile, `${category}.json`);
    for (const field of Object.keys(assignment)) {
      const altered = structuredClone(prep);
      delete altered.futureApprovalGates.bundledArtifactSupply.requiredSchedule.categoryAssignments[category][field];
      assert.equal(checkBundlePreparation(altered).ok, false, `${category}.${field}`);
    }
  }
  function mutateLeaves(value, keys = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...keys, key];
      if (item && typeof item === 'object') mutateLeaves(item, next);
      else {
        const altered = structuredClone(prep);
        let target = altered.futureApprovalGates.bundledArtifactSupply;
        for (const k of keys) target = target[k];
        target[key] = item === true ? false : 'PRIVATE_SENTINEL';
        const result = checkBundlePreparation(altered);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
      }
    }
  }
  mutateLeaves(gate);
  for (const mutation of [
    p => delete p.futureApprovalGates.bundledArtifactSupply.requiredSchedule.categoryAssignments.lateGrantObserver,
    p => { p.futureApprovalGates.bundledArtifactSupply.requiredSchedule.categoryAssignments.extra = {}; },
    p => { p.futureApprovalGates.bundledArtifactSupply.requiredSchedule.categoryAssignments.lateGrantObserver = p.futureApprovalGates.bundledArtifactSupply.requiredSchedule.categoryAssignments.installedRouteBodyObserver; },
  ]) {
    const altered = structuredClone(prep); mutation(altered);
    assert.equal(checkBundlePreparation(altered).ok, false);
  }
});

test('bundle keeps source-set private read and publication gates separate', () => {
  const parent = require('../offline/cad-auth-missing-receipt-artifact-prep/preparation').artifactPreparation();
  const prep = packet().preparation;
  for (const key of ['privateRead', 'sanitizedProjectionReview', 'liveEvidenceCollection']) {
    assert.deepEqual(prep.futureApprovalGates[key], parent.futureApprovalGates[key]);
  }
  assert.deepEqual(prep.requiredCategories, parent.requiredCategories);
  assert.equal(prep.controls.privateReadAuthorized, false);
  assert.equal(prep.controls.privateDiscoveryAuthorized, false);
  assert.equal(prep.controls.privateReviewAuthorized, false);
  assert.equal(prep.controls.productionUploadActivationAuthorized, false);
  assert.equal(prep.controls.providerEnvResourceBillingChangesAuthorized, false);
  assert.equal(prep.controls.externalMessagesAuthorized, false);
  assert.equal(prep.controls.publicProjectionReleaseAuthorized, false);
});
