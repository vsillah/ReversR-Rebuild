const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  DEFAULT_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
  REVIEWED_BOUNDED_SESSION_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
  REVIEWED_DEPLOYMENT_REFERENCE,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_DURABLE_SERVICE_REF,
  REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadDeployedRuntimeSupplyPathClosure,
} = require('../server/cadDeployedRuntimeSupplyPathClosure');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-deployed-runtime-supply-path-closure.json';
const PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_URL: REVIEWED_PRODUCTION_TARGET.replace('https://', ''),
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: REVIEWED_MAIN_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});
const SOURCES = Object.freeze([
  'server/cadDeployedRuntimeSupplyPathClosure.js',
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
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'scripts/cad-auth-deployed-runtime-supply-path-closure-checker.js',
  'scripts/cad-auth-deployed-runtime-supply-path-closure.test.js',
  'docs/cad-auth-deployed-runtime-supply-path-closure.md',
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
    throw Error('UNEXPECTED_EFFECT');
  }])));
}

function withProofEnv(callback) {
  const previous = {};
  for (const key of Object.keys(PROOF_ENV)) {
    previous[key] = Object.prototype.hasOwnProperty.call(process.env, key)
      ? process.env[key]
      : undefined;
    process.env[key] = PROOF_ENV[key];
  }
  delete process.env.VERCEL_DEPLOYMENT_ID;
  try {
    return callback();
  } finally {
    for (const key of Object.keys(PROOF_ENV)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

function defaultClosedProof() {
  const closure = createCadDeployedRuntimeSupplyPathClosure();
  return {
    defaultGateEnabled: DEFAULT_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE.enabled === true,
    sourceExecutable: closure.sourceExecutable === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    deployedRuntimeSupplyPathAccepted:
      closure.deployedRuntimeSupplyPathAccepted === true,
    uploadSessionIssued: closure.uploadSessionIssued === true,
    requestBodyAdmittedOrRead: closure.requestBodyAdmittedOrRead === true,
    effectsExecuted: closure.effectsExecuted,
  };
}

function deployedStartupSupplyPathProof() {
  const calls = [];
  const closure = withProofEnv(() => createCadDeployedRuntimeSupplyPathClosure({
    gate: REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
    durableService: durableService(calls),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  }));
  return {
    proofNowUtc: REVIEWED_WINDOW.proofNowUtc,
    metadataReadFromServerEnvironment: true,
    deployedRuntimeSupplyPathGateAccepted:
      closure.deployedRuntimeSupplyPathGateAccepted === true,
    deployedRuntimeSupplyPathMetadataAccepted:
      closure.deployedRuntimeSupplyPathMetadataAccepted === true,
    deployedRuntimeSupplyPathAccepted:
      closure.deployedRuntimeSupplyPathAccepted === true,
    privateCredentialSupplyAccepted: closure.privateCredentialSupplyAccepted === true,
    privateCredentialValueIncluded: closure.privateCredentialValueIncluded === true,
    gateNonNull: closure.gateNonNull === true,
    installationNonNull: closure.installationNonNull === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    sourceExecutable: closure.sourceExecutable === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    commandCardSha256:
      closure.runtime?.installation?.manifest?.commandCardSha256 || null,
    installationSha256:
      closure.runtime?.installation?.liveGate?.installationSha256 || null,
    currentDeploymentReference:
      closure.runtime?.installation?.manifest?.currentDeploymentReference || null,
    boundedSessionRef:
      closure.runtime?.installation?.manifest?.boundedSessionRef || null,
    sessionId: closure.runtime?.installation?.manifest?.sessionId || null,
    durableEvidenceSha256:
      closure.runtime?.installation?.manifest?.durableEvidenceSha256 || null,
    durableServiceRef:
      closure.runtime?.installation?.manifest?.durableServiceRef || null,
    effectsExecuted: calls.length,
  };
}

function indexWiringProof(readSource = read) {
  const index = readSource('server/index.js').toString('utf8');
  return {
    importsDeployedRuntimeSupplyPathClosure:
      /createCadDeployedRuntimeSupplyPathClosure/.test(index),
    constructsDeployedRuntimeSupplyPathClosure:
      /const cadLiveGateCredentialClosure = createCadDeployedRuntimeSupplyPathClosure\(\)/.test(index),
    directlyConstructsCredentialClosure:
      /const cadLiveGateCredentialClosure = createCadLiveOpeningGateCredentialClosure\(\)/.test(index),
    selectsCredentialClosureSessionService:
      /cadLiveGateCredentialClosure\.sessionService/.test(index),
    passesCredentialClosureExecutableRuntime:
      /cadLiveGateCredentialClosure\.executableRuntime/.test(index),
  };
}

function routeBodyGateIntegrationProof(readSource = read) {
  const router = readSource('server/cadUserUploadRouter.js').toString('utf8');
  return {
    requiresUploadSessionBeforeAdmissionSwitch:
      /const result = await verify\(req\);[\s\S]*USER_SESSION_REQUIRED/.test(router),
    acceptsServerProvidedExecutableRuntime:
      /liveOpeningExecutableRuntime/.test(router),
    mountsExecutableRuntimeBootstrap:
      /createCadLiveOpeningExecutableRuntimeBootstrap/.test(router),
    keepsBodyAdmissionLiteralClosed:
      /const BODY_ADMISSION_AUTHORIZED = false/.test(router),
    validatesBodyOnlyAfterRouteBodyGate:
      /routeBodyGate\.authorizeBodyRead[\s\S]*validateRequestBody\(req\)/.test(router),
  };
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosedProof();
  const startupProof = deployedStartupSupplyPathProof();
  const wiringProof = indexWiringProof(readSource);
  const routeProof = routeBodyGateIntegrationProof(readSource);
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-deployed-runtime-supply-path-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'DEPLOYED_RUNTIME_SUPPLY_PATH_INSTALLED_DEFAULT_CLOSED',
    purpose:
      'install the reviewed live-opening gate credential closure into the deployed server startup path while preserving default fail-closed production behavior',
    boundInputs: {
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
      mainCommit: REVIEWED_MAIN_COMMIT,
      githubProductionDeploymentReference: REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
      productionTarget: REVIEWED_PRODUCTION_TARGET,
      currentDeploymentReference: REVIEWED_DEPLOYMENT_REFERENCE,
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
    },
    reviewedWindow: REVIEWED_WINDOW,
    defaultGate: DEFAULT_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
    reviewedGate: REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
    defaultClosedProof: defaultProof,
    deployedStartupSupplyPathProof: startupProof,
    indexWiringProof: wiringProof,
    routeBodyGateIntegrationProof: routeProof,
    deployedStartupPathProvenExecutableWithoutRuntimeActivation:
      defaultProof.defaultGateEnabled === false
      && defaultProof.sourceExecutable === false
      && defaultProof.sessionServiceNonNull === false
      && defaultProof.executableRuntimeEnabled === false
      && defaultProof.deployedRuntimeSupplyPathAccepted === false
      && defaultProof.uploadSessionIssued === false
      && defaultProof.requestBodyAdmittedOrRead === false
      && defaultProof.effectsExecuted === 0
      && startupProof.metadataReadFromServerEnvironment === true
      && startupProof.deployedRuntimeSupplyPathGateAccepted === true
      && startupProof.deployedRuntimeSupplyPathMetadataAccepted === true
      && startupProof.deployedRuntimeSupplyPathAccepted === true
      && startupProof.privateCredentialSupplyAccepted === true
      && startupProof.privateCredentialValueIncluded === false
      && startupProof.gateNonNull === true
      && startupProof.installationNonNull === true
      && startupProof.sessionServiceNonNull === true
      && startupProof.sourceExecutable === true
      && startupProof.executableRuntimeEnabled === true
      && startupProof.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
      && startupProof.installationSha256 === REVIEWED_INSTALLATION_SHA256
      && startupProof.currentDeploymentReference === REVIEWED_DEPLOYMENT_REFERENCE
      && startupProof.boundedSessionRef === REVIEWED_BOUNDED_SESSION_REF
      && startupProof.sessionId === REVIEWED_BOUNDED_SESSION_REF
      && startupProof.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
      && startupProof.durableServiceRef === REVIEWED_DURABLE_SERVICE_REF
      && startupProof.effectsExecuted === 0
      && wiringProof.importsDeployedRuntimeSupplyPathClosure === true
      && wiringProof.constructsDeployedRuntimeSupplyPathClosure === true
      && wiringProof.directlyConstructsCredentialClosure === false
      && wiringProof.selectsCredentialClosureSessionService === true
      && wiringProof.passesCredentialClosureExecutableRuntime === true
      && Object.values(routeProof).every(Boolean),
    privateCredentialSupplyRequirement: {
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
    },
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
    nextGate: {
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebind: true,
      requiresPrivateCredentialSupplyApprovalBeforeLiveOpening: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge deployed runtime supply path closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to deployed runtime supply path closure packet SHA-256 <deployedRuntimeSupplyPathClosurePacketSha256> at source commit <closureSourceCommit>, stopped live-opening disposition SHA-256 49a3e56d788ebfc5195225e3a6a8874b07187403a7acbe4811652bcb17a0778f, approved live-opening refresh SHA-256 fb3b8e86e6334931840651ca044c81635e18922dfbae153a918aeecf31f6cb35, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed server startup path can resolve a non-null live-opening session service and executable runtime from reviewed current-production metadata and private credential supply controls while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the deployed startup path is proven executable without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved deployed startup supply path, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply requirement, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    },
    stopConditions: [
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'unresolvedDeployedStartupSupplyPath',
      'missingExactPrivateCredentialSupplyRequirement',
      'missingExecutableRuntimeBinding',
      'missingInstallationSha256',
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
      ? 'DEPLOYED_RUNTIME_SUPPLY_PATH_PACKET_VALID_DEFAULT_CLOSED'
      : 'DEPLOYED_RUNTIME_SUPPLY_PATH_PACKET_BLOCKED',
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
  SOURCES,
  checkPacket,
  defaultClosedProof,
  deployedStartupSupplyPathProof,
  expectedPacket,
  indexWiringProof,
  routeBodyGateIntegrationProof,
  sourceBindings,
  withProofEnv,
};
