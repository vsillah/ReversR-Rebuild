const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  METHODS,
} = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  REVIEWED_BOUNDED_SESSION_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_DURABLE_SERVICE_REF,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadStartupLiveGateSourceInstallClosure,
} = require('../server/cadStartupLiveGateSourceInstallClosure');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-startup-live-gate-source-install-closure.json';
const PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_DEPLOYMENT_ID: REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE,
  VERCEL_URL: REVIEWED_PRODUCTION_TARGET.replace('https://', ''),
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: REVIEWED_MAIN_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});
const SOURCES = Object.freeze([
  'server/cadStartupLiveGateSourceInstallClosure.js',
  'server/index.js',
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/cadLiveOpeningCredentialClosureMetadataPolicy.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'scripts/cad-auth-startup-live-gate-source-install-closure-checker.js',
  'scripts/cad-auth-startup-live-gate-source-install-closure.test.js',
  'docs/cad-auth-startup-live-gate-source-install-closure.md',
  '.github/workflows/release-local-ci.yml',
]);
const SHA = /^[a-f0-9]{64}$/;
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function durableService(calls = []) {
  return Object.freeze(Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_SOURCE_ONLY_EFFECT');
  }])));
}

function defaultClosedProof() {
  const closure = createCadStartupLiveGateSourceInstallClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(PROOF_ENV),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  return Object.freeze({
    defaultSourceEnabled: DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE.enabled === true,
    startupLiveGateInstallSourceAccepted:
      closure.startupLiveGateInstallSourceAccepted === true,
    startupLiveGateInstallAccepted: closure.startupLiveGateInstallAccepted === true,
    sourceExecutable: closure.sourceExecutable === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    uploadSessionIssued: closure.uploadSessionIssued === true,
    requestBodyAdmittedOrRead: closure.requestBodyAdmittedOrRead === true,
    effectsExecuted: closure.effectsExecuted,
  });
}

function startupLiveGateInstallProof() {
  const calls = [];
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata(PROOF_ENV);
  const closure = createCadStartupLiveGateSourceInstallClosure({
    source: REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
    deploymentMetadata,
    durableService: durableService(calls),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  const installation = closure.runtime?.installation || null;
  const manifest = installation?.manifest || {};
  return Object.freeze({
    proofNowUtc: REVIEWED_WINDOW.proofNowUtc,
    metadataReadFromServerEnvironment: deploymentMetadata !== null,
    metadataVercelDeploymentReference: deploymentMetadata?.deploymentReference || null,
    sourceOwnedDeploymentReference: closure.sourceOwnedDeploymentReference || null,
    metadataDeploymentReferenceCanonicalized:
      closure.sourceOwnedDeploymentReference === REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
    deploymentMetadataAccepted: closure.deploymentMetadataAccepted === true,
    startupLiveGateInstallSourceAccepted:
      closure.startupLiveGateInstallSourceAccepted === true,
    startupLiveGateInstallAccepted: closure.startupLiveGateInstallAccepted === true,
    privateCredentialSupplyAccepted: closure.privateCredentialSupplyAccepted === true,
    privateCredentialValueIncluded: closure.privateCredentialValueIncluded === true,
    gateNonNull: closure.gateNonNull === true,
    installationNonNull: closure.installationNonNull === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    sourceExecutable: closure.sourceExecutable === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    commandCardSha256: manifest.commandCardSha256 || null,
    commandCardBytesSha256: manifest.commandCardBytes ? sha(manifest.commandCardBytes) : null,
    installationSha256: installation?.liveGate?.installationSha256 || null,
    currentDeploymentReference: manifest.currentDeploymentReference || null,
    boundedSessionRef: manifest.boundedSessionRef || null,
    sessionId: manifest.sessionId || null,
    durableEvidenceSha256: manifest.durableEvidenceSha256 || null,
    durableServiceRef: manifest.durableServiceRef || null,
    privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
    privateSupplyReceiptSha256: REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
    sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
    effectsExecuted: calls.length,
  });
}

function indexWiringProof(readSource = read) {
  const index = readSource('server/index.js').toString('utf8');
  return Object.freeze({
    importsStartupLiveGateSourceInstaller:
      /createCadStartupLiveGateSourceInstallClosure/.test(index),
    constructsStartupLiveGateSourceInstaller:
      /const cadLiveGateCredentialClosure = createCadStartupLiveGateSourceInstallClosure\(\)/.test(index),
    directlyConstructsCredentialClosure:
      /const cadLiveGateCredentialClosure = createCadLiveOpeningGateCredentialClosure\(\)/.test(index),
    usesProofOnlyDeployedRuntimeSupplyPath:
      /const cadLiveGateCredentialClosure = createCadDeployedRuntimeSupplyPathClosure\(\)/.test(index),
    selectsStartupSessionService:
      /cadLiveGateCredentialClosure\.sessionService/.test(index),
    passesStartupExecutableRuntime:
      /cadLiveGateCredentialClosure\.executableRuntime/.test(index),
    mountsBeforeGeneralBodyParser:
      index.indexOf('cadLiveGateCredentialClosure.executableRuntime')
        < index.indexOf('app.use(express.json'),
  });
}

function routeBodyGateIntegrationProof(readSource = read) {
  const router = readSource('server/cadUserUploadRouter.js').toString('utf8');
  const runtimeMount = readSource('server/cadLiveOpeningRuntimeMount.js').toString('utf8');
  return Object.freeze({
    requiresUploadSessionBeforeAdmissionSwitch:
      /const result = await verify\(req\);[\s\S]*USER_SESSION_REQUIRED/.test(router),
    keepsBodyAdmissionLiteralClosed:
      /const BODY_ADMISSION_AUTHORIZED = false/.test(router),
    validatesBodyOnlyAfterRouteBodyGate:
      /routeBodyGate\.authorizeBodyRead[\s\S]*validateRequestBody\(req\)/.test(router),
    runtimeMountDisabledInSource:
      /const LIVE_OPENING_RUNTIME_MOUNT_ENABLED = false/.test(runtimeMount),
    runtimeMountRejectsBodyAdmission:
      /return disabledDecision\('LIVE_OPENING_RUNTIME_MOUNT_DISABLED'\)/.test(runtimeMount),
  });
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosedProof();
  const startupProof = startupLiveGateInstallProof();
  const wiringProof = indexWiringProof(readSource);
  const routeProof = routeBodyGateIntegrationProof(readSource);
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-startup-live-gate-source-install-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'STARTUP_LIVE_GATE_SOURCE_INSTALL_PATH_PROVEN_DEFAULT_CLOSED',
    purpose:
      'make the deployed server startup path able to install the exact reviewed live-opening gate from server-owned source instead of proof-only injection while preserving fail-closed production behavior',
    boundInputs: Object.freeze({
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
      mainCommit: REVIEWED_MAIN_COMMIT,
      productionDeploymentReference: REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE,
      productionTarget: REVIEWED_PRODUCTION_TARGET,
      sourceOwnedDeploymentReference: REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
      commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
      installationSha256: REVIEWED_INSTALLATION_SHA256,
      durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
      durableServiceRef: REVIEWED_DURABLE_SERVICE_REF,
      boundedSessionRef: REVIEWED_BOUNDED_SESSION_REF,
      sessionId: REVIEWED_BOUNDED_SESSION_REF,
      privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
      privateSupplyReceiptSha256: REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
      sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      productionAlias: 'https://reversr.vercel.app',
    }),
    reviewedWindow: REVIEWED_WINDOW,
    defaultSource: DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
    reviewedSource: REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
    defaultClosedProof: defaultProof,
    startupLiveGateInstallProof: startupProof,
    indexWiringProof: wiringProof,
    routeBodyGateIntegrationProof: routeProof,
    deployedStartupPathProvenExecutableWithoutRuntimeActivation:
      defaultProof.defaultSourceEnabled === false
      && defaultProof.startupLiveGateInstallSourceAccepted === false
      && defaultProof.startupLiveGateInstallAccepted === false
      && defaultProof.sourceExecutable === false
      && defaultProof.sessionServiceNonNull === false
      && defaultProof.executableRuntimeEnabled === false
      && defaultProof.uploadSessionIssued === false
      && defaultProof.requestBodyAdmittedOrRead === false
      && defaultProof.effectsExecuted === 0
      && startupProof.metadataReadFromServerEnvironment === true
      && startupProof.metadataVercelDeploymentReference === REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE
      && startupProof.sourceOwnedDeploymentReference === REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE
      && startupProof.metadataDeploymentReferenceCanonicalized === true
      && startupProof.deploymentMetadataAccepted === true
      && startupProof.startupLiveGateInstallSourceAccepted === true
      && startupProof.startupLiveGateInstallAccepted === true
      && startupProof.privateCredentialSupplyAccepted === true
      && startupProof.privateCredentialValueIncluded === false
      && startupProof.gateNonNull === true
      && startupProof.installationNonNull === true
      && startupProof.sessionServiceNonNull === true
      && startupProof.sourceExecutable === true
      && startupProof.executableRuntimeEnabled === true
      && startupProof.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
      && startupProof.commandCardBytesSha256 === REVIEWED_COMMAND_CARD_SHA256
      && startupProof.installationSha256 === REVIEWED_INSTALLATION_SHA256
      && startupProof.currentDeploymentReference === REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE
      && startupProof.boundedSessionRef === REVIEWED_BOUNDED_SESSION_REF
      && startupProof.sessionId === REVIEWED_BOUNDED_SESSION_REF
      && startupProof.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
      && startupProof.durableServiceRef === REVIEWED_DURABLE_SERVICE_REF
      && startupProof.privateSessionCredentialSupplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
      && startupProof.privateSupplyReceiptSha256 === REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256
      && startupProof.sessionCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
      && startupProof.effectsExecuted === 0
      && wiringProof.importsStartupLiveGateSourceInstaller === true
      && wiringProof.constructsStartupLiveGateSourceInstaller === true
      && wiringProof.directlyConstructsCredentialClosure === false
      && wiringProof.usesProofOnlyDeployedRuntimeSupplyPath === false
      && wiringProof.selectsStartupSessionService === true
      && wiringProof.passesStartupExecutableRuntime === true
      && wiringProof.mountsBeforeGeneralBodyParser === true
      && Object.values(routeProof).every(Boolean),
    privateCredentialSupplyRequirement: Object.freeze({
      requiredSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
      requiredCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      requiredSupplyReceiptSha256: REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
      requiredTransport: 'bearer',
      credentialValueMustRemainPrivate: true,
      credentialValueIncludedInSource: false,
      credentialValueDisclosedPublicly: false,
      uploadSessionIssuanceAuthorized: false,
      privateSupplyReceiptRequired: true,
      laterLiveRequestMustSupplyBearerCredentialWhoseDigestMatches: true,
    }),
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    runtimeInstallationActivated: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    durableServiceLiveQualified: false,
    privateEvidenceRead: false,
    effectsExecuted: 0,
    nextGate: Object.freeze({
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebindRefresh: true,
      requiresPrivateCredentialSupplyApprovalBeforeLiveOpening: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge deployed startup live-gate source installation closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to deployed startup live-gate source installation closure packet SHA-256 <startupLiveGateSourceInstallClosurePacketSha256> at source commit <closureSourceCommit>, stopped live-opening disposition SHA-256 ae64570f5b101235fa1f2aa56a020d3d0a694e21f718267e8f4a2f1f5a5df40e, approved live-opening refresh SHA-256 c6373fa18ebc2d5d93e852aef50c721f17164b88bbca7d5e5b9f4e76e1d9ea2e, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed server startup default path can install the exact reviewed live-opening gate from server-owned current-production metadata and private credential supply controls while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the deployed startup path is proven executable without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved deployed startup gate installation path, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply requirement, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    }),
    stopConditions: Object.freeze([
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'unresolvedDeployedStartupGateInstallationPath',
      'missingExactPrivateCredentialSupplyRequirement',
      'missingExecutableRuntimeBinding',
      'missingInstallationSha256',
      'privateDataLeakageRisk',
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
      ? 'STARTUP_LIVE_GATE_SOURCE_INSTALL_PACKET_VALID_DEFAULT_CLOSED'
      : 'STARTUP_LIVE_GATE_SOURCE_INSTALL_PACKET_BLOCKED',
    effectsExecuted: 0,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
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
  PROOF_ENV,
  SOURCES,
  checkPacket,
  defaultClosedProof,
  expectedPacket,
  indexWiringProof,
  routeBodyGateIntegrationProof,
  sourceBindings,
  startupLiveGateInstallProof,
};
