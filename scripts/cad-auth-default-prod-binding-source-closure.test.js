const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  DEFAULT_PRODUCTION_BINDING_SOURCE_GATE,
  createSourceOwnedDefaultProductionBindingInstallation,
} = require('../server/cadProductionDefaultBindingSourceClosure');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  resolveCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSourceInstall');
const {
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const {
  createCadProductionExecutionBinding,
} = require('../server/cadProductionExecutionBinding');
const checker = require('./cad-auth-default-prod-binding-source-closure-checker');

function mutableProofGate() {
  return { ...checker.PROOF_GATE };
}

test('default production execution-binding source remains closed', () => {
  assert.equal(DEFAULT_PRODUCTION_BINDING_SOURCE_GATE.enabled, false);
  assert.equal(DEFAULT_PRODUCTION_BINDING_SOURCE_GATE.explicitLiveOpeningApproved, false);
  assert.equal(createSourceOwnedDefaultProductionBindingInstallation(), null);
  assert.equal(resolveCadProductionExecutionBindingSource(), null);
  assert.equal(createCadProductionExecutionBindingSource(), null);
  assert.deepEqual(createCadProductionExecutionBinding(), { enabled: false });
});

test('exact source-owned gate resolves non-null without durable effects', () => {
  const proof = checker.sourceOwnedGateProof();
  assert.equal(proof.metadataAccepted, true);
  assert.equal(proof.proofDeploymentReference, checker.PROOF_ENV.VERCEL_DEPLOYMENT_ID);
  assert.equal(proof.sourceOwnedInstallationNonNull, true);
  assert.equal(proof.commandCardSha256, checker.PROOF_GATE.commandCardSha256);
  assert.equal(proof.installationSha256, checker.PROOF_GATE.installationSha256);
  assert.equal(proof.resolvedSourceNonNull, true);
  assert.equal(proof.executionSourceNonNull, true);
  assert.equal(proof.executionBindingEnabled, true);
  assert.equal(proof.effectsExecuted, 0);
});

test('source-owned gate rejects missing or drifted exact fields', () => {
  const metadata = readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV);
  for (const mutate of [
    gate => { gate.enabled = false; },
    gate => { gate.explicitLiveOpeningApproved = false; },
    gate => { gate.stoppedLiveOpeningDispositionSha256 = '0'.repeat(64); },
    gate => { gate.currentDeploymentRuntimeInstallRefreshSha256 = '0'.repeat(64); },
    gate => { gate.mainCommit = '0'.repeat(40); },
    gate => { gate.commandCardSha256 = '0'.repeat(64); },
    gate => { gate.installationSha256 = '0'.repeat(64); },
    gate => { gate.startUtc = checker.PROOF_WINDOW.expiresUtc; },
    gate => { gate.expiresUtc = checker.PROOF_WINDOW.startUtc; },
  ]) {
    const gate = mutableProofGate();
    mutate(gate);
    assert.equal(createSourceOwnedDefaultProductionBindingInstallation({
      gate,
      deploymentMetadata: metadata,
    }), null);
  }
  assert.equal(createSourceOwnedDefaultProductionBindingInstallation({
    gate: checker.PROOF_GATE,
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata({
      ...checker.PROOF_ENV,
      VERCEL_DEPLOYMENT_ID: 'not-a-deployment-id',
    }),
  }), null);
});

test('checker validates packet and refuses live modes or arbitrary input', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(checker.defaultClosedProof().defaultResolveIsNull, true);
  assert.equal(checker.sourceOwnedGateProof().executionBindingEnabled, true);
  for (const file of checker.SOURCES) {
    const result = checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ]));
    assert.equal(result.ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, [
      'scripts/cad-auth-default-prod-binding-source-closure-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
