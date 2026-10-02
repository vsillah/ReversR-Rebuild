#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256,
  createProductionSessionCredentialAcceptanceRepair,
} = require('../server/cadProductionSessionCredentialAcceptanceRepair');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-production-session-credential-acceptance-repair.json';
const SOURCES = Object.freeze([
  'server/uploadSession.js',
  'server/cadProductionSessionCredentialAcceptanceRepair.js',
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/cadStartupLiveGateSourceInstallClosure.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadUserUploadRouter.js',
  'scripts/cad-upload-session.test.js',
  'scripts/cad-auth-production-session-credential-acceptance-repair-checker.js',
  'scripts/cad-auth-production-session-credential-acceptance-repair.test.js',
  'docs/cad-upload-session-foundation.md',
  'docs/cad-auth-production-session-credential-acceptance-repair.md',
  '.github/workflows/release-local-ci.yml',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function expectedPacket(readSource = read) {
  const repair = createProductionSessionCredentialAcceptanceRepair();
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-production-session-credential-acceptance-repair-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: repair.status,
    purpose:
      'repair the source-only verifier/session-service mismatch that caused the digest-bound private bearer credential to stop at USER_SESSION_REQUIRED before reaching the live-opening body gate',
    repair,
    acceptanceResolved:
      repair.accepted === true
      && repair.verifierRepair.acceptsOpaqueUrlSafeBearerShape === true
      && repair.verifierRepair.intentionallyNonCanonicalFixture === true
      && repair.verifierRepair.verifierCanonicalBase64RequirementRemoved === true
      && repair.boundInputs.generatedPrivateCredentialDigestSha256
        === GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256
      && repair.defaultProductionBehaviorClosed === true
      && repair.liveOpeningAuthorized === false
      && repair.uploadSessionIssued === false
      && repair.productionUploadActivated === false
      && repair.requestBodyAdmittedOrRead === false
      && repair.runtimeActivated === false
      && repair.effectsExecuted === 0,
    privateValueIncluded: false,
    privateValueDisclosed: false,
    uploadSessionIssuanceAuthorized: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    sourceBindings: sourceBindings(readSource),
  });
}

function checkPacket(packet, readSource = read) {
  const expected = expectedPacket(readSource);
  if (!isDeepStrictEqual(packet, expected)) {
    return { ok: false, code: 'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_PACKET_DRIFT' };
  }
  if (packet.acceptanceResolved !== true) {
    return { ok: false, code: 'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_UNRESOLVED' };
  }
  if (packet.privateValueIncluded !== false || packet.privateValueDisclosed !== false) {
    return { ok: false, code: 'PRIVATE_CREDENTIAL_LEAKAGE_RISK' };
  }
  return {
    ok: true,
    code: 'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_REPAIR_PACKET_VALID_DEFAULT_CLOSED',
    packetSha256: sha(JSON.stringify(packet, null, 2) + '\n'),
  };
}

if (require.main === module) {
  try {
    const packet = JSON.parse(read(PACKET));
    const result = checkPacket(packet);
    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.log(JSON.stringify({
      ok: false,
      code: 'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_CHECKER_ERROR',
    }));
    process.exit(1);
  }
}

module.exports = {
  PACKET,
  SOURCES,
  checkPacket,
  expectedPacket,
  sourceBindings,
};
