const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  createCadProductionRuntimeInstallCurrentBinding,
} = require('../server/cadProductionRuntimeInstallCurrentBinding');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  resolveCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSourceInstall');
const {
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const {
  createCadProductionExecutionBinding,
} = require('../server/cadProductionExecutionBinding');
const checker = require('./cad-auth-runtime-install-current-binding-checker');

function service(calls = []) {
  return Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_EFFECT');
  }]));
}

test('allowlisted production deployment metadata accepts only non-secret current-production refs', () => {
  const metadata = readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV);
  assert.equal(metadata.deploymentReference, checker.PROOF_ENV.VERCEL_DEPLOYMENT_ID);
  assert.equal(metadata.deploymentTarget, `https://${checker.PROOF_ENV.VERCEL_URL}`);
  assert.equal(metadata.projectProductionTarget, 'https://reversr.vercel.app');
  assert.equal(metadata.gitCommitSha, checker.PROOF_ENV.VERCEL_GIT_COMMIT_SHA);
  assert.equal(metadata.secretBearing, false);
  for (const [key, value] of Object.entries({
    VERCEL_ENV: 'preview',
    VERCEL_DEPLOYMENT_ID: '6749843604',
    VERCEL_URL: 'https://bad host',
    VERCEL_PROJECT_PRODUCTION_URL: 'preview.example.com',
    VERCEL_GIT_COMMIT_SHA: 'not-a-sha',
    VERCEL_GIT_COMMIT_REF: 'feature',
    VERCEL_GIT_REPO_SLUG: 'OtherRepo',
    VERCEL_GIT_REPO_OWNER: 'other',
  })) {
    assert.equal(readCadProductionCurrentDeploymentMetadata({
      ...checker.PROOF_ENV,
      [key]: value,
    }), null, key);
  }
});

test('current-deployment install helper stays closed until explicit live gate inputs are supplied', () => {
  assert.equal(createCadProductionRuntimeInstallCurrentBinding({
    deploymentMetadata: null,
    startUtc: checker.PROOF_WINDOW.startUtc,
    expiresUtc: checker.PROOF_WINDOW.expiresUtc,
  }).ok, false);
  assert.equal(createCadProductionRuntimeInstallCurrentBinding({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    startUtc: checker.PROOF_WINDOW.expiresUtc,
    expiresUtc: checker.PROOF_WINDOW.startUtc,
  }).ok, false);
});

test('current deployment binding resolves non-null without touching production defaults or effects', () => {
  const calls = [];
  const prepared = createCadProductionRuntimeInstallCurrentBinding({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    startUtc: checker.PROOF_WINDOW.startUtc,
    expiresUtc: checker.PROOF_WINDOW.expiresUtc,
    enabled: true,
    explicitLiveOpeningApproved: true,
    durableService: service(calls),
  });
  const resolved = resolveCadProductionExecutionBindingSource(
    prepared.installation,
    () => Date.parse(checker.PROOF_WINDOW.proofNowUtc),
  );
  const source = createCadProductionExecutionBindingSource(resolved);
  const binding = createCadProductionExecutionBinding(source);
  assert.equal(prepared.ok, true);
  assert.equal(prepared.installation.manifest.currentDeploymentReference,
    checker.PROOF_ENV.VERCEL_DEPLOYMENT_ID);
  assert.equal(prepared.installation.enabled, true);
  assert.equal(resolved.enabled, true);
  assert.equal(source.enabled, true);
  assert.equal(binding.enabled, true);
  assert.equal(calls.length, 0);
});

test('default production proof remains closed while current-binding proof is installable', () => {
  assert.deepEqual(checker.defaultClosedProof(), {
    productionBindingInstallationEnabled: false,
    defaultResolveIsNull: true,
    defaultSourceIsNull: true,
    defaultExecutionBindingEnabled: false,
  });
  const proof = checker.installableCurrentBindingProof();
  assert.equal(proof.metadataAccepted, true);
  assert.equal(proof.preparedOk, true);
  assert.equal(proof.executionBindingEnabled, true);
  assert.equal(proof.effectsExecuted, 0);
});

test('checker validates packet, rejects source drift and live/path arguments', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  for (const file of checker.SOURCES) {
    assert.equal(checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ])).ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, [
      'scripts/cad-auth-runtime-install-current-binding-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
