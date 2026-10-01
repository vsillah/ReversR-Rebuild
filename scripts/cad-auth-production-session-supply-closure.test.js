const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const {
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_WINDOW,
  createProductionSessionSupplyClosure,
  createRejectedCredentialDerivationProof,
  createSanitizedCredentialProof,
  sha256,
  validClosureSource,
  validSanitizedCredentialProof,
} = require('../server/cadProductionSessionSupplyClosure');
const checker = require('./cad-auth-production-session-supply-closure-checker');

test('default production session supply closure is source-owned and fail-closed', () => {
  assert.equal(validClosureSource(DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE), true);
  const closure = createProductionSessionSupplyClosure();

  assert.equal(closure.sourceAccepted, true);
  assert.equal(closure.defaultClosed, true);
  assert.equal(closure.credentialDerivationRejected, true);
  assert.equal(closure.existingDigestSupplyAccepted, false);
  assert.equal(closure.futurePrivateGenerationRebindRequired, true);
  assert.equal(closure.credentialValueIncluded, false);
  assert.equal(closure.credentialValueDisclosed, false);
  assert.equal(closure.credentialValueStoredInSource, false);
  assert.equal(closure.uploadSessionIssued, false);
  assert.equal(closure.productionUploadActivated, false);
  assert.equal(closure.requestBodyAdmittedOrRead, false);
  assert.equal(closure.runtimeActivated, false);
  assert.equal(closure.effectsExecuted, 0);
});

test('digest-only precondition is explicitly not recoverable as a credential', () => {
  const proof = createRejectedCredentialDerivationProof();
  assert.equal(proof.derivationAttempted, false);
  assert.equal(proof.credentialRecoverableFromDigest, false);
  assert.equal(proof.credentialGenerated, false);
  assert.equal(proof.credentialValueIncluded, false);
  assert.equal(proof.uploadSessionIssued, false);
  assert.equal(proof.code, 'CREDENTIAL_DIGEST_PREIMAGE_NOT_DERIVABLE');
});

test('sanitized proof can bind a supplied private value without exposing it', () => {
  const proof = createSanitizedCredentialProof({
    credentialSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
  });
  assert.equal(validSanitizedCredentialProof(proof), true);

  const closure = createProductionSessionSupplyClosure({ credentialProof: proof });
  assert.equal(closure.existingDigestSupplyAccepted, true);
  assert.equal(closure.futurePrivateGenerationRebindRequired, false);
  assert.equal(closure.credentialValueIncluded, false);
  assert.equal(closure.uploadSessionIssued, false);
  assert.equal(closure.requestBodyAdmittedOrRead, false);
  assert.equal(closure.effectsExecuted, 0);
});

test('credential values, wrong digests, and source private fields are rejected', () => {
  const leaked = createSanitizedCredentialProof({
    credentialSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
  });
  assert.equal(validSanitizedCredentialProof({ ...leaked, credential: 'PRIVATE_SENTINEL' }), false);
  assert.equal(validSanitizedCredentialProof({ ...leaked, token: 'PRIVATE_SENTINEL' }), false);
  assert.equal(validSanitizedCredentialProof({ ...leaked, credentialValueIncluded: true }), false);
  assert.equal(validSanitizedCredentialProof({ ...leaked, credentialSha256: '0'.repeat(64) }), false);

  assert.equal(validClosureSource({
    ...DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE,
    secret: 'PRIVATE_SENTINEL',
  }), false);
  assert.equal(validClosureSource({
    ...DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE,
    reviewedWindow: {
      ...REVIEWED_WINDOW,
      expiresUtc: REVIEWED_WINDOW.startUtc,
    },
  }), false);
});

test('fixture token hashing is allowed only as a non-secret local proof', () => {
  const fixtureToken = `us1.${'A'.repeat(43)}`;
  assert.match(fixtureToken, /^us1\.[A-Za-z0-9_-]{43}$/);
  assert.match(sha256(fixtureToken), /^[a-f0-9]{64}$/);
  assert.notEqual(sha256(fixtureToken), SESSION_CREDENTIAL_DIGEST_SHA256);

  const generatedProof = createSanitizedCredentialProof({
    credentialSha256: sha256(fixtureToken),
    supplyReceiptSha256: REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
    generatedForNewSourceRebind: true,
  });
  assert.equal(validSanitizedCredentialProof(generatedProof), false);
});

test('checker packet stays deterministic and default-closed', () => {
  const packet = checker.expectedPacket();
  assert.equal(packet.status, 'PRODUCTION_SESSION_SUPPLY_CLOSURE_PREPARED_DEFAULT_CLOSED');
  assert.equal(packet.productionSessionSupplyClosurePrepared, true);
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
    'scripts/cad-auth-production-session-supply-closure-checker.js',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.code, 'PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_VALID_DEFAULT_CLOSED');
  assert.match(parsed.packetSha256, /^[a-f0-9]{64}$/);
});
