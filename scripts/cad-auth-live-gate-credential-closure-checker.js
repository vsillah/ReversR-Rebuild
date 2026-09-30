const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  COMMAND_CARD_SHA256,
  DEFAULT_LIVE_GATE_CREDENTIAL_CLOSURE,
  DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  INSTALLATION_SHA256,
  MAIN_COMMIT,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  PRODUCTION_DEPLOYMENT_REFERENCE,
  PRODUCTION_TARGET,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadLiveOpeningGateCredentialClosure,
  createProofPrivateSessionCredentialSupply,
} = require('../server/cadLiveOpeningGateCredentialClosure');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-gate-credential-closure.json';
const PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256 =
  '9fbd55a035e59594a2c5770cd23d55d52a4fcac5341d8635631b7f897a0c58f4';
const SHA = /^[a-f0-9]{64}$/;
const PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_DEPLOYMENT_ID: PRODUCTION_DEPLOYMENT_REFERENCE,
  VERCEL_URL: PRODUCTION_TARGET.replace('https://', ''),
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: MAIN_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});
const SOURCES = Object.freeze([
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/index.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'scripts/cad-auth-live-gate-credential-closure-checker.js',
  'scripts/cad-auth-live-gate-credential-closure.test.js',
  'docs/cad-auth-live-gate-credential-closure.md',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function durableService(calls = []) {
  return Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_EFFECT');
  }]));
}

function defaultClosedProof() {
  const closure = createCadLiveOpeningGateCredentialClosure();
  return {
    defaultPrivateSupplyProvided: DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY.supplied === true,
    defaultClosureSourceExecutable: closure.sourceExecutable === true,
    defaultSessionServiceNonNull: closure.sessionServiceNonNull === true,
    defaultExecutableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    uploadSessionIssued: closure.uploadSessionIssued === true,
    requestBodyAdmittedOrRead: closure.requestBodyAdmittedOrRead === true,
    effectsExecuted: closure.effectsExecuted,
  };
}

function sourceOwnedClosureProof() {
  const calls = [];
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata(PROOF_ENV);
  const privateSessionCredentialSupply = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256,
  });
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata,
    privateSessionCredentialSupply,
    durableService: durableService(calls),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  return {
    proofNowUtc: REVIEWED_WINDOW.proofNowUtc,
    metadataAccepted: deploymentMetadata !== null,
    proofDeploymentReference: deploymentMetadata?.deploymentReference || null,
    proofDeploymentTarget: deploymentMetadata?.deploymentTarget || null,
    privateCredentialSupplyRef: privateSessionCredentialSupply.supplyRef,
    privateCredentialSupplyReceiptSha256:
      privateSessionCredentialSupply.supplyReceiptSha256,
    privateCredentialDigestSha256:
      privateSessionCredentialSupply.credentialDigestSha256,
    privateCredentialValueIncluded:
      privateSessionCredentialSupply.credentialValueIncluded === true,
    privateCredentialSupplyAccepted: closure.privateCredentialSupplyAccepted === true,
    gateNonNull: closure.gateNonNull === true,
    installationNonNull: closure.installationNonNull === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    sourceExecutable: closure.sourceExecutable === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    commandCardSha256:
      closure.runtime?.installation?.manifest?.commandCardSha256 || null,
    installationSha256:
      closure.runtime?.installation?.liveGate?.installationSha256 || null,
    effectsExecuted: calls.length,
  };
}

function indexWiringProof(readSource = read) {
  const index = readSource('server/index.js').toString('utf8');
  return {
    importsCredentialClosure:
      /createCadLiveOpeningGateCredentialClosure/.test(index),
    constructsCredentialClosure:
      /const cadLiveGateCredentialClosure = createCadLiveOpeningGateCredentialClosure\(\)/.test(index),
    selectsCredentialClosureSessionService:
      /cadLiveGateCredentialClosure\.sessionService/.test(index),
    passesCredentialClosureExecutableRuntime:
      /cadLiveGateCredentialClosure\.executableRuntime/.test(index),
  };
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosedProof();
  const closureProof = sourceOwnedClosureProof();
  const wiringProof = indexWiringProof(readSource);
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-live-opening-gate-credential-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'LIVE_GATE_CREDENTIAL_CLOSURE_PREPARED_DEFAULT_CLOSED',
    purpose:
      'close the executable gate and private digest-bound session credential precondition without activating production',
    boundInputs: {
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
      mainCommit: MAIN_COMMIT,
      productionDeploymentReference: PRODUCTION_DEPLOYMENT_REFERENCE,
      productionTarget: PRODUCTION_TARGET,
      commandCardSha256: COMMAND_CARD_SHA256,
      installationSha256: INSTALLATION_SHA256,
      sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
    },
    reviewedWindow: REVIEWED_WINDOW,
    defaultGate: DEFAULT_LIVE_GATE_CREDENTIAL_CLOSURE,
    defaultPrivateSessionCredentialSupply: DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
    defaultClosedProof: defaultProof,
    sourceOwnedClosureProof: closureProof,
    indexWiringProof: wiringProof,
    executableGateAndCredentialPreconditionProven:
      defaultProof.defaultPrivateSupplyProvided === false
      && defaultProof.defaultClosureSourceExecutable === false
      && defaultProof.defaultSessionServiceNonNull === false
      && defaultProof.defaultExecutableRuntimeEnabled === false
      && defaultProof.uploadSessionIssued === false
      && defaultProof.requestBodyAdmittedOrRead === false
      && defaultProof.effectsExecuted === 0
      && closureProof.metadataAccepted === true
      && closureProof.privateCredentialSupplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
      && closureProof.privateCredentialSupplyReceiptSha256
        === PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256
      && closureProof.privateCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
      && closureProof.privateCredentialValueIncluded === false
      && closureProof.privateCredentialSupplyAccepted === true
      && closureProof.gateNonNull === true
      && closureProof.installationNonNull === true
      && closureProof.sessionServiceNonNull === true
      && closureProof.sourceExecutable === true
      && closureProof.executableRuntimeEnabled === true
      && closureProof.commandCardSha256 === COMMAND_CARD_SHA256
      && closureProof.installationSha256 === INSTALLATION_SHA256
      && closureProof.effectsExecuted === 0
      && wiringProof.importsCredentialClosure === true
      && wiringProof.constructsCredentialClosure === true
      && wiringProof.selectsCredentialClosureSessionService === true
      && wiringProof.passesCredentialClosureExecutableRuntime === true,
    privateCredentialSupplyRequirement: {
      requiredSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
      requiredCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      requiredTransport: 'bearer',
      credentialValueMustRemainPrivate: true,
      credentialValueIncludedInSource: false,
      credentialValueDisclosedPublicly: false,
      uploadSessionIssuanceAuthorized: false,
      privateSupplyReceiptRequired: true,
      laterLiveRequestMustSupplyBearerCredentialWhoseDigestMatches: true,
    },
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    durableServiceLiveQualified: false,
    privateEvidenceRead: false,
    effectsExecuted: 0,
    nextGate: {
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebind: true,
      requiresPrivateCredentialSupplyApprovalBeforeLiveOpening: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge live-opening executable gate and credential-precondition closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to live-opening gate credential-closure packet SHA-256 <credentialClosurePacketSha256> at source commit <credentialClosureSourceCommit>, stopped live-opening disposition SHA-256 3b4263b5320b2e2de90f6b67eb19a11be0dae8c433b0074a9a3e690ee681a4ee, approved live-opening refresh SHA-256 62962bf4962099816f9d4ac8fcb49ae1641757ce825d0423e3fe9315fc83b450, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed server-owned default path can resolve the exact live-opening gate from reviewed current-production metadata and can enforce the exact private digest-bound session credential precondition from source/private supply controls while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the executable gate and credential precondition remain source-owned without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing executable default gate installation path, missing exact private credential supply requirement, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    },
    stopConditions: [
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'missingExecutableDefaultGateInstallationPath',
      'missingExactPrivateCredentialSupplyRequirement',
      'privateDataLeakageRisk',
      'runtimeCredentialsOrProviderConfigurationNeeded',
    ],
    sourceBindings: sourceBindings(readSource),
  };
}

function checkPacket(packet, readSource = read) {
  let ok = false;
  try {
    ok = isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch {
    ok = false;
  }
  return {
    ok,
    code: ok
      ? 'LIVE_GATE_CREDENTIAL_CLOSURE_PACKET_VALID_DEFAULT_CLOSED'
      : 'LIVE_GATE_CREDENTIAL_CLOSURE_PACKET_BLOCKED',
    effectsExecuted: 0,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
  };
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
  PROOF_ENV,
  PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256,
  SOURCES,
  checkPacket,
  defaultClosedProof,
  expectedPacket,
  indexWiringProof,
  sourceBindings,
  sourceOwnedClosureProof,
};
