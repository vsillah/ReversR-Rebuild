const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const {
  createDerivedDeploymentReference,
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  validCurrentDeploymentMetadata,
} = require('../server/cadLiveOpeningCredentialClosureMetadataPolicy');
const {
  REVIEWED_WINDOW,
  createCadLiveOpeningGateCredentialClosure,
  createProofPrivateSessionCredentialSupply,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const checker = require('./cad-auth-credential-metadata-source-repair-checker');

test('current production metadata derives source-owned reference without dpl id', () => {
  const metadata = readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV);
  assert.ok(metadata);
  assert.equal(metadata.deploymentReference, checker.SOURCE_OWNED_DEPLOYMENT_REFERENCE);
  assert.equal(metadata.deploymentReference,
    createDerivedDeploymentReference('reversr-a261m8i6x-vsillahs-projects.vercel.app',
      '56a29e337ceb459c66f83d7f5207b7ba74f65686'));
  assert.equal(validCurrentDeploymentMetadata(metadata), true);
});

test('numeric GitHub deployment ids remain provenance-only and cannot become deployment refs', () => {
  assert.equal(readCadProductionCurrentDeploymentMetadata({
    ...checker.PROOF_ENV,
    VERCEL_DEPLOYMENT_ID: checker.BOUND_INPUTS.githubProductionDeploymentId,
  }), null);
  assert.equal(validCurrentDeploymentMetadata({
    ...readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    deploymentReference: checker.BOUND_INPUTS.githubProductionDeploymentId,
  }), false);
});

test('request, alias, malformed commit, and private-looking metadata are rejected', () => {
  for (const env of [
    { ...checker.PROOF_ENV, VERCEL_URL: 'reversr.vercel.app' },
    { ...checker.PROOF_ENV, VERCEL_URL: 'https://attacker.invalid' },
    { ...checker.PROOF_ENV, VERCEL_GIT_COMMIT_SHA: 'not-a-sha' },
    { ...checker.PROOF_ENV, VERCEL_GIT_REPO_OWNER: 'someone-else' },
    { ...checker.PROOF_ENV, VERCEL_GIT_REPO_SLUG: 'OtherRepo' },
    { ...checker.PROOF_ENV, VERCEL_ENV: 'preview' },
  ]) {
    assert.equal(readCadProductionCurrentDeploymentMetadata(env), null);
  }
  const metadata = readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV);
  assert.equal(validCurrentDeploymentMetadata({ ...metadata, secretBearing: true }), false);
  assert.equal(validCurrentDeploymentMetadata({ ...metadata, token: 'PRIVATE_SENTINEL' }), false);
});

test('source-owned proof resolves executable gate but default path stays fail-closed', () => {
  const proof = checker.sourceOwnedMetadataProof();
  assert.equal(proof.metadataAccepted, true);
  assert.equal(proof.deploymentReferenceDerivedFromTargetAndCommit, true);
  assert.equal(proof.gateNonNull, true);
  assert.equal(proof.installationNonNull, true);
  assert.equal(proof.sessionServiceNonNull, true);
  assert.equal(proof.sourceExecutable, true);
  assert.equal(proof.privateCredentialValueIncluded, false);
  assert.equal(proof.effectsExecuted, 0);

  const closed = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
  });
  assert.equal(closed.gateNonNull, false);
  assert.equal(closed.sessionService, null);
  assert.equal(closed.executableRuntime.enabled, false);
});

test('exact supply proof never issues upload sessions or executes durable effects', async () => {
  const calls = [];
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    privateSessionCredentialSupply: createProofPrivateSessionCredentialSupply(),
    durableService: Object.fromEntries(METHODS.map(name => [name, async () => {
      calls.push(name);
      throw Error('UNEXPECTED_EFFECT');
    }])),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(closure.sourceExecutable, true);
  assert.equal(calls.length, 0);
  assert.deepEqual(await closure.sessionService.issueSession(),
    { ok: false, code: 'UPLOAD_SESSION_ISSUANCE_DISABLED' });
  assert.equal(calls.length, 0);
});

test('packet binds source-only artifacts and refuses live modes', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(packet.executableDefaultGateInstallationPathProven, true);
  assert.equal(packet.liveOpeningAuthorized, false);
  assert.equal(packet.uploadSessionIssued, false);
  assert.equal(packet.requestBodyAdmittedOrRead, false);
  assert.doesNotMatch(JSON.stringify(packet), /PRIVATE_SENTINEL|\/Users\/|\.local\//);
  for (const file of checker.SOURCES) {
    const result = checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ]));
    assert.equal(result.ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, [
      'scripts/cad-auth-credential-metadata-source-repair-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
