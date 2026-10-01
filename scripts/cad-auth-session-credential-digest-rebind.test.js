const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  createCadStartupLiveGateSourceInstallClosure,
  createStartupLiveGateInstallSourceFromMetadata,
  exactStartupLiveGateInstallSource,
} = require('../server/cadStartupLiveGateSourceInstallClosure');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  GENERATED_PRIVATE_CREDENTIAL_BYTES,
  GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES,
  GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
  PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  createGeneratedCredentialProof,
  createSessionCredentialDigestRebind,
  noPrivateFields,
  proofDeploymentEnvironment,
} = require('../server/cadAuthSessionCredentialDigestRebind');
const checker = require('./cad-auth-session-credential-digest-rebind-checker');

test('generated credential digest proof is sanitized and rebound', () => {
  const proof = createGeneratedCredentialProof();
  assert.equal(proof.credentialSha256, SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.equal(proof.previousCredentialSha256, PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.notEqual(proof.credentialSha256, proof.previousCredentialSha256);
  assert.equal(proof.privateCredentialFileSha256, GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256);
  assert.equal(proof.credentialBytes, GENERATED_PRIVATE_CREDENTIAL_BYTES);
  assert.equal(proof.fileBytes, GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES);
  assert.equal(proof.credentialValueIncluded, false);
  assert.equal(proof.credentialValueDisclosed, false);
  assert.equal(proof.credentialValueStoredInSource, false);
  assert.equal(noPrivateFields(proof), true);
  assert.equal(noPrivateFields({ ...proof, credential: 'PRIVATE_SENTINEL' }), false);
  assert.equal(noPrivateFields({ ...proof, token: 'PRIVATE_SENTINEL' }), false);
});

test('rebind proof installs generated digest into source-owned startup path without live effects', () => {
  const proof = createSessionCredentialDigestRebind();
  assert.equal(proof.accepted, true);
  assert.equal(
    proof.status,
    'SESSION_CREDENTIAL_DIGEST_REBOUND_PRIVATE_VALUE_GENERATED_DEFAULT_CLOSED',
  );
  assert.equal(proof.startupSourceAccepted, true);
  assert.equal(proof.deploymentMetadataAccepted, true);
  assert.equal(proof.privateCredentialSupplyAccepted, true);
  assert.equal(proof.sourceExecutable, true);
  assert.equal(proof.commandCardSha256, REVIEWED_COMMAND_CARD_SHA256);
  assert.equal(proof.installationSha256, REVIEWED_INSTALLATION_SHA256);
  assert.equal(proof.sessionCredentialDigestSha256, SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.equal(proof.privateSupplyReceiptSha256, GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256);
  assert.equal(proof.sourceOwnedDeploymentReference, REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE);
  assert.equal(proof.uploadSessionIssued, false);
  assert.equal(proof.productionUploadActivated, false);
  assert.equal(proof.requestBodyAdmittedOrRead, false);
  assert.equal(proof.runtimeActivated, false);
  assert.equal(proof.effectsExecuted, 0);
});

test('startup session service accepts generated digest and rejects previous digest', async () => {
  const deploymentMetadata =
    readCadProductionCurrentDeploymentMetadata(proofDeploymentEnvironment());
  const source = createStartupLiveGateInstallSourceFromMetadata({
    deploymentMetadata,
    openingWindow: REVIEWED_WINDOW,
    privateSupplyReceiptSha256: GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
  });
  assert.equal(exactStartupLiveGateInstallSource(source), true);
  const closure = createCadStartupLiveGateSourceInstallClosure({
    source,
    deploymentMetadata,
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(closure.startupLiveGateInstallAccepted, true);
  assert.equal(closure.sessionServiceNonNull, true);
  const generatedRecord =
    await closure.sessionService.lookupSession(SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.equal(generatedRecord.sessionId, 'rrb-ref:cad-upload-internal-mark-test-session-v1');
  assert.equal(generatedRecord.transport, 'bearer');
  assert.equal(generatedRecord.cadUploadAllowed, true);
  assert.equal(
    await closure.sessionService.lookupSession(PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256),
    null,
  );
});

test('private local credential custody stays git-ignored', () => {
  const ignore = fs.readFileSync('.gitignore', 'utf8');
  assert.match(ignore, /^\.local\/$/m);
});

test('checker packet stays deterministic and default-closed', () => {
  const packet = checker.expectedPacket();
  assert.equal(packet.sessionCredentialDigestRebound, true);
  assert.equal(packet.defaultProductionBehaviorClosed, true);
  assert.equal(packet.liveOpeningAuthorized, false);
  assert.equal(packet.uploadSessionIssued, false);
  assert.equal(packet.requestBodyAdmittedOrRead, false);
  assert.equal(packet.runtimeActivated, false);
  assert.equal(packet.effectsExecuted, 0);
  assert.equal(checker.checkPacket(packet).ok, true);
});

test('checker CLI validates the committed packet', () => {
  const result = spawnSync(process.execPath, [
    'scripts/cad-auth-session-credential-digest-rebind-checker.js',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.code, 'SESSION_CREDENTIAL_DIGEST_REBIND_PACKET_VALID_DEFAULT_CLOSED');
  assert.match(parsed.packetSha256, /^[a-f0-9]{64}$/);
});
