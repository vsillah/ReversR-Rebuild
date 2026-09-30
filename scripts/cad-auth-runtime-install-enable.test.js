const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  APPROVED_RUNTIME_INSTALLATION_SOURCE,
  PRODUCTION_BINDING_INSTALLATION,
  createApprovedProductionBindingInstallation,
} = require('../server/cadProductionExecutionBindingInstallation');
const {
  resolveCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSourceInstall');
const {
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const {
  createCadProductionExecutionBinding,
} = require('../server/cadProductionExecutionBinding');

function insideWindow() {
  return Date.parse('2026-09-30T03:35:00Z');
}

function mutableApprovedInstallation() {
  const installed = createApprovedProductionBindingInstallation({
    enabled: true,
    explicitLiveOpeningApproved: true,
  });
  return {
    enabled: installed.enabled,
    manifest: { ...installed.manifest },
    liveGate: { ...installed.liveGate },
    durableAdapter: {
      serviceRef: installed.durableAdapter.serviceRef,
      evidenceSha256: installed.durableAdapter.evidenceSha256,
      service: { ...installed.durableAdapter.service },
    },
  };
}

test('default production path remains fail-closed', () => {
  assert.equal(PRODUCTION_BINDING_INSTALLATION.enabled, false);
  assert.equal(PRODUCTION_BINDING_INSTALLATION.liveGate.explicitLiveOpeningApproved, false);
  assert.equal(PRODUCTION_BINDING_INSTALLATION.manifest.currentDeploymentReference, '6749843604');
  assert.equal(PRODUCTION_BINDING_INSTALLATION.manifest.commandCardSha256,
    '0cb84438d6e69e4894585bd7bf0efc2ed9bc593639f67209a90462ebe807f848');
  assert.equal(PRODUCTION_BINDING_INSTALLATION.liveGate.installationSha256,
    'b1ef5eacd2b42fc26ead33746502da377856d80b0f05fc36f70fd9a84a1157af');
  assert.equal(resolveCadProductionExecutionBindingSource(), null);
  assert.equal(createCadProductionExecutionBindingSource(), null);
  assert.deepEqual(createCadProductionExecutionBinding(), { enabled: false });
});

test('explicit approved source-owned gate resolves non-null without invoking durable effects', () => {
  const calls = [];
  const durableService = Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_EFFECT');
  }]));
  const installation = createApprovedProductionBindingInstallation({
    enabled: true,
    explicitLiveOpeningApproved: true,
    durableService,
  });
  const resolved = resolveCadProductionExecutionBindingSource(installation, insideWindow);
  const source = createCadProductionExecutionBindingSource(resolved);
  const binding = createCadProductionExecutionBinding(source);
  assert.equal(resolved.enabled, true);
  assert.equal(resolved.commandCardSha256, APPROVED_RUNTIME_INSTALLATION_SOURCE.commandCardSha256);
  assert.equal(resolved.currentDeploymentReference,
    APPROVED_RUNTIME_INSTALLATION_SOURCE.productionDeploymentReference);
  assert.equal(resolved.sessionId, APPROVED_RUNTIME_INSTALLATION_SOURCE.sessionId);
  assert.equal(resolved.durableEvidenceSha256,
    APPROVED_RUNTIME_INSTALLATION_SOURCE.durableEvidenceSha256);
  assert.equal(source.enabled, true);
  assert.equal(binding.enabled, true);
  assert.equal(calls.length, 0);
});

test('approved gate rejects every missing approval, drifted exact field and adapter gap', () => {
  for (const mutate of [
    i => { i.enabled = false; },
    i => { i.liveGate.explicitLiveOpeningApproved = false; },
    i => { i.liveGate.installationSha256 = '0'.repeat(64); },
    i => { i.manifest.commandCardBytes += ' '; },
    i => { i.manifest.commandCardSha256 = '0'.repeat(64); },
    i => { i.manifest.currentDeploymentReference = '6748757459'; },
    i => { i.manifest.boundedSessionRef = 'wrong-session-ref'; },
    i => { i.manifest.sessionId = 'wrong-session'; },
    i => { i.manifest.durableEvidenceSha256 = '0'.repeat(64); },
    i => { i.manifest.durableServiceRef = 'rrb-ref:wrong-service'; },
    i => { i.durableAdapter.serviceRef = 'rrb-ref:wrong-service'; },
    i => { i.durableAdapter.evidenceSha256 = '0'.repeat(64); },
    i => { delete i.durableAdapter.service.verifyApproval; },
  ]) {
    const installation = mutableApprovedInstallation();
    mutate(installation);
    assert.equal(resolveCadProductionExecutionBindingSource(installation, insideWindow), null);
  }
});

test('runtime-install enablement checker validates packet and rejects source drift or live arguments', () => {
  const checker = require('./cad-auth-runtime-install-enable-checker');
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(checker.defaultClosedProof().defaultResolveIsNull, true);
  assert.equal(checker.approvedGateProof().executionBindingEnabled, true);
  for (const file of checker.SOURCES) {
    const result = checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ]));
    assert.equal(result.ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, [
      'scripts/cad-auth-runtime-install-enable-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
