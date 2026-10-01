const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  GENERATED_PRIVATE_CREDENTIAL_BYTES,
  GENERATED_PRIVATE_CREDENTIAL_CREATED_AT_UTC,
  GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES,
  GENERATED_PRIVATE_CREDENTIAL_FILE_REF,
  GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
  POST_MERGE_REBIND_REFRESH_SHA256,
  PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256,
  PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_SHA256,
  PRODUCTION_SESSION_SUPPLY_CLOSURE_SOURCE_COMMIT,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_FAIL_CLOSED_SMOKE,
  REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRODUCTION_ALIAS,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  createGeneratedCredentialProof,
  createSessionCredentialDigestRebind,
  proofDeploymentEnvironment,
} = require('../server/cadAuthSessionCredentialDigestRebind');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-session-credential-digest-rebind.json';
const SOURCES = Object.freeze([
  'server/cadAuthSessionCredentialDigestRebind.js',
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/cadStartupLiveGateSourceInstallClosure.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'scripts/cad-auth-session-credential-digest-rebind-checker.js',
  'scripts/cad-auth-session-credential-digest-rebind.test.js',
  'docs/cad-auth-session-credential-digest-rebind.md',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function expectedPacket(readSource = read) {
  const generatedCredentialProof = createGeneratedCredentialProof();
  const rebindProof = createSessionCredentialDigestRebind();
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-session-credential-digest-rebind-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'SESSION_CREDENTIAL_DIGEST_REBOUND_PRIVATE_VALUE_GENERATED_DEFAULT_CLOSED',
    purpose:
      'generate one private local us1 bearer credential, commit only its digest/custody metadata, and rebind the server-owned CAD Auth live-gate session digest while preserving fail-closed production behavior',
    boundInputs: Object.freeze({
      postMergeRebindRefreshSha256: POST_MERGE_REBIND_REFRESH_SHA256,
      productionSessionSupplyClosurePacketSha256:
        PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_SHA256,
      productionSessionSupplyClosureSourceCommit:
        PRODUCTION_SESSION_SUPPLY_CLOSURE_SOURCE_COMMIT,
      mainCommit: REVIEWED_MAIN_COMMIT,
      githubProductionDeploymentReference:
        REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
      vercelDeploymentReference: REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
      sourceOwnedDeploymentReference: REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
      productionTarget: REVIEWED_PRODUCTION_TARGET,
      productionAlias: REVIEWED_PRODUCTION_ALIAS,
      failClosedSmoke: REVIEWED_FAIL_CLOSED_SMOKE,
      previousSessionCredentialDigestSha256:
        PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256,
      generatedSessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      generatedPrivateCredentialFileRef: GENERATED_PRIVATE_CREDENTIAL_FILE_REF,
      generatedPrivateCredentialFileSha256:
        GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
      generatedPrivateCredentialBytes: GENERATED_PRIVATE_CREDENTIAL_BYTES,
      generatedPrivateCredentialFileBytes: GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES,
      generatedPrivateCredentialCreatedAtUtc:
        GENERATED_PRIVATE_CREDENTIAL_CREATED_AT_UTC,
      commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
      installationSha256: REVIEWED_INSTALLATION_SHA256,
      boundedSessionRef: BOUNDED_SESSION_REF,
      sessionId: BOUNDED_SESSION_REF,
      durableEvidenceSha256:
        '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7',
      durableServiceRef: DURABLE_SERVICE_REF,
      privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
      privateSupplyReceiptSha256: GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
      reviewedWindow: REVIEWED_WINDOW,
    }),
    privateCustodyPolicy: Object.freeze({
      privateCredentialGeneratedExactlyOnce: true,
      privateCredentialValueCommitted: false,
      privateCredentialValuePrinted: false,
      privateCredentialValueDisclosed: false,
      publicSourceCredentialEmbeddingPermitted: false,
      digestPreimageDerivationPermitted: false,
      uploadSessionIssuanceAuthorized: false,
      productionUploadActivationAuthorized: false,
      requestBodyAdmissionAuthorized: false,
      runtimeActivationAuthorized: false,
      privateCredentialFileIgnored: true,
    }),
    proofDeploymentEnvironment: proofDeploymentEnvironment(),
    generatedCredentialProof,
    rebindProof,
    sessionCredentialDigestRebound:
      rebindProof.accepted === true
      && rebindProof.status
        === 'SESSION_CREDENTIAL_DIGEST_REBOUND_PRIVATE_VALUE_GENERATED_DEFAULT_CLOSED'
      && rebindProof.sessionCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
      && generatedCredentialProof.credentialSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
      && generatedCredentialProof.previousCredentialSha256
        === PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256
      && generatedCredentialProof.credentialSha256
        !== generatedCredentialProof.previousCredentialSha256
      && generatedCredentialProof.credentialValueIncluded === false
      && generatedCredentialProof.credentialValueDisclosed === false
      && generatedCredentialProof.credentialValueStoredInSource === false
      && rebindProof.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
      && rebindProof.installationSha256 === REVIEWED_INSTALLATION_SHA256
      && rebindProof.privateSupplyReceiptSha256 === GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256
      && rebindProof.sourceOwnedDeploymentReference
        === REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE
      && rebindProof.uploadSessionIssued === false
      && rebindProof.requestBodyAdmittedOrRead === false
      && rebindProof.runtimeActivated === false
      && rebindProof.effectsExecuted === 0,
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    runtimeInstallationActivated: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    effectsExecuted: 0,
    nextGate: Object.freeze({
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebindRefresh: true,
      requiresPrivateCredentialValueReadOnlyInLaterLiveGate: true,
      approvalPhraseTemplate:
        'I approve public branch push and draft PR creation only for ReversR-Rebuild branch codex/cad-auth-session-credential-digest-rebind at commit <sourceCommit>, containing source-only CAD Auth session credential digest rebind packet SHA-256 <packetSha256> and generated private credential digest SHA-256 76c7cb47f616bc2e6a1ca99ad35d534d5c0cdaaba460f26717d79e100d90d87e. Publish only the committed source-only files. I understand the private credential value stays in ignored local custody and is not authorized for live use, upload-session issuance, runtime activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. I understand Git/Vercel may create an automatic non-production preview deployment/check for the draft PR. Stop on failing checks, unknown outcome, production deployment trigger, stale commit binding, private credential leakage risk, unresolved source digest rebind, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    }),
    stopConditions: Object.freeze([
      'failingChecks',
      'unknownOutcome',
      'privateCredentialLeakageRisk',
      'staleDeploymentBinding',
      'unresolvedSourceDigestRebind',
      'missingInstallationSha256',
      'runtimeCredentialsOrProviderConfigurationNeeded',
    ]),
    sourceBindings: sourceBindings(readSource),
  });
}

function checkPacket(packet, readSource = read) {
  let ok = false;
  try {
    ok = isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch {
    ok = false;
  }
  return Object.freeze({
    ok,
    code: ok
      ? 'SESSION_CREDENTIAL_DIGEST_REBIND_PACKET_VALID_DEFAULT_CLOSED'
      : 'SESSION_CREDENTIAL_DIGEST_REBIND_PACKET_BLOCKED',
    effectsExecuted: 0,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
  });
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) {
      throw Error('INVALID_MODE');
    }
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), `${JSON.stringify(expectedPacket(), null, 2)}\n`);
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  checkPacket,
  expectedPacket,
  sourceBindings,
};
