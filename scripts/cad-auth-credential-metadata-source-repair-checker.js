// Source-only metadata-source repair packet. No provider calls or live runtime.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  CURRENT_DEPLOYMENT_METADATA_POLICY,
  createCadLiveOpeningGateCredentialClosure,
  createProofPrivateSessionCredentialSupply,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  createDerivedDeploymentReference,
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-credential-metadata-source-repair.json';
const CURRENT_MAIN_COMMIT = '56a29e337ceb459c66f83d7f5207b7ba74f65686';
const CURRENT_PRODUCTION_HOST = 'reversr-a261m8i6x-vsillahs-projects.vercel.app';
const CURRENT_PRODUCTION_TARGET = `https://${CURRENT_PRODUCTION_HOST}`;
const SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  createDerivedDeploymentReference(CURRENT_PRODUCTION_HOST, CURRENT_MAIN_COMMIT);
const PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256 =
  '4b9f24d35e62d96269fd7f61f4ea989d395d8292c3ae26d3f1c52c23791fb7f3';

const BOUND_INPUTS = Object.freeze({
  stoppedPostMergeRebindRefreshDispositionSha256:
    '2b47414dda01f46bea2a83d9b5b9b332393f0f53f657ee2db9986af728c092fd',
  mainCommit: CURRENT_MAIN_COMMIT,
  credentialClosureBindingRepairPacketSha256:
    '57675e09d0bd717a4ce6e372e4f49a3c9c494b4dabb29194c3a973a9405584e8',
  credentialClosureBindingRepairSourceCommit:
    '4f25f2f1ab3df8964c9aeaba0dafb0216b226637',
  liveGateCredentialClosurePacketSha256:
    '4697784dec93175221fcdf2e885155d1ccda2b724e368ff2bb9855b9dc5603e1',
  productionBindingSourceInstallPacketSha256:
    'e9721f15e834393e5663a5e8a260e7425d792c8800327ccc7909316f823e1515',
  githubProductionDeploymentId: '6772517435',
  productionTarget: CURRENT_PRODUCTION_TARGET,
  failClosedSmoke: Object.freeze({
    status: 401,
    code: 'USER_SESSION_REQUIRED',
    observedNoLaterThanUtc: '2026-09-30T23:39:21Z',
  }),
});

const PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_URL: CURRENT_PRODUCTION_HOST,
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: CURRENT_MAIN_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});

const SOURCES = Object.freeze([
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadLiveOpeningCredentialClosureMetadataPolicy.js',
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'server/index.js',
  'scripts/cad-auth-credential-metadata-source-repair-checker.js',
  'scripts/cad-auth-credential-metadata-source-repair.test.js',
  'scripts/cad-auth-credential-closure-binding-repair-checker.js',
  'scripts/cad-auth-credential-closure-binding-repair.test.js',
  'scripts/cad-auth-live-gate-credential-closure-checker.js',
  'scripts/cad-auth-live-gate-credential-closure.test.js',
  'docs/cad-auth-credential-metadata-source-repair.md',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBindings = (readSource = read) =>
  Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));

function blockedEffectService(calls = []) {
  return Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_SOURCE_ONLY_EFFECT');
  }]));
}

function sourceOwnedMetadataProof(env = PROOF_ENV) {
  const calls = [];
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata(env);
  const privateSessionCredentialSupply = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256,
  });
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata,
    privateSessionCredentialSupply,
    durableService: blockedEffectService(calls),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  const installation = closure.runtime?.installation || null;
  const manifest = installation?.manifest || null;
  return Object.freeze({
    metadataAccepted: deploymentMetadata !== null,
    deploymentReference: deploymentMetadata?.deploymentReference || null,
    deploymentReferenceDerivedFromTargetAndCommit:
      deploymentMetadata?.deploymentReference === SOURCE_OWNED_DEPLOYMENT_REFERENCE,
    deploymentTarget: deploymentMetadata?.deploymentTarget || null,
    gitCommitSha: deploymentMetadata?.gitCommitSha || null,
    privateCredentialSupplyAccepted: closure.privateCredentialSupplyAccepted === true,
    privateCredentialValueIncluded: privateSessionCredentialSupply.credentialValueIncluded === true,
    gateNonNull: closure.gateNonNull === true,
    installationNonNull: closure.installationNonNull === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    sourceExecutable: closure.sourceExecutable === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    commandCardSha256: manifest?.commandCardSha256 || null,
    commandCardBytesSha256: manifest ? sha(manifest.commandCardBytes) : null,
    installationSha256: installation?.liveGate?.installationSha256 || null,
    boundedSessionRef: manifest?.boundedSessionRef || null,
    durableEvidenceSha256: manifest?.durableEvidenceSha256 || null,
    privateSessionCredentialSupplyRef: privateSessionCredentialSupply.supplyRef,
    privateSupplyReceiptSha256: privateSessionCredentialSupply.supplyReceiptSha256,
    effectsExecuted: calls.length,
  });
}

function negativeReferenceProof() {
  return Object.freeze({
    githubDeploymentIdAsDeploymentIdAccepted:
      readCadProductionCurrentDeploymentMetadata({
        ...PROOF_ENV,
        VERCEL_DEPLOYMENT_ID: BOUND_INPUTS.githubProductionDeploymentId,
      }) !== null,
    requestMetadataAccepted:
      readCadProductionCurrentDeploymentMetadata({
        ...PROOF_ENV,
        VERCEL_GIT_COMMIT_SHA: 'not-a-sha',
      }) !== null,
    aliasTargetAccepted:
      readCadProductionCurrentDeploymentMetadata({
        ...PROOF_ENV,
        VERCEL_URL: 'reversr.vercel.app',
      }) !== null,
  });
}

function defaultClosedProof() {
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(PROOF_ENV),
  });
  return Object.freeze({
    defaultPrivateSupplyAccepted: closure.privateCredentialSupplyAccepted === true,
    gateNonNull: closure.gateNonNull === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    uploadSessionIssued: closure.uploadSessionIssued === true,
    requestBodyAdmittedOrRead: closure.requestBodyAdmittedOrRead === true,
    effectsExecuted: closure.effectsExecuted,
  });
}

function expectedPacket(readSource = read) {
  const sourceProof = sourceOwnedMetadataProof();
  const closed = defaultClosedProof();
  const negative = negativeReferenceProof();
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-credential-metadata-source-repair-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'CURRENT_DEPLOYMENT_METADATA_SOURCE_REPAIRED_DEFAULT_CLOSED',
    boundInputs: BOUND_INPUTS,
    metadataPolicy: CURRENT_DEPLOYMENT_METADATA_POLICY,
    sourceOwnedDeploymentReference: SOURCE_OWNED_DEPLOYMENT_REFERENCE,
    sourceOwnedMetadataProof: sourceProof,
    negativeReferenceProof: negative,
    defaultClosedProof: closed,
    executableDefaultGateInstallationPathProven:
      sourceProof.metadataAccepted === true
      && sourceProof.deploymentReferenceDerivedFromTargetAndCommit === true
      && sourceProof.privateCredentialSupplyAccepted === true
      && sourceProof.privateCredentialValueIncluded === false
      && sourceProof.gateNonNull === true
      && sourceProof.installationNonNull === true
      && sourceProof.sessionServiceNonNull === true
      && sourceProof.sourceExecutable === true
      && sourceProof.executableRuntimeEnabled === true
      && sourceProof.commandCardSha256 === sourceProof.commandCardBytesSha256
      && /^[a-f0-9]{64}$/.test(sourceProof.commandCardSha256 || '')
      && /^[a-f0-9]{64}$/.test(sourceProof.installationSha256 || '')
      && sourceProof.privateSessionCredentialSupplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
      && sourceProof.effectsExecuted === 0
      && negative.githubDeploymentIdAsDeploymentIdAccepted === false
      && negative.requestMetadataAccepted === false
      && negative.aliasTargetAccepted === false
      && closed.defaultPrivateSupplyAccepted === false
      && closed.gateNonNull === false
      && closed.sessionServiceNonNull === false
      && closed.executableRuntimeEnabled === false
      && closed.uploadSessionIssued === false
      && closed.requestBodyAdmittedOrRead === false
      && closed.effectsExecuted === 0,
    privateCredentialSupplyRequirement: Object.freeze({
      supplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
      credentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      credentialValuePubliclyDisclosed: false,
      privateSupplyReceiptRequired: true,
      uploadSessionIssuanceAuthorized: false,
    }),
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    runtimeInstallationActivated: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    privateEvidenceRead: false,
    effectsExecuted: 0,
    nextGate: Object.freeze({
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebindRefresh: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge live-opening credential-closure deployment metadata source repair deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to credential-closure deployment metadata source repair packet SHA-256 <metadataSourceRepairPacketSha256> at source commit <metadataSourceRepairSourceCommit>, credential-closure binding repair packet SHA-256 57675e09d0bd717a4ce6e372e4f49a3c9c494b4dabb29194c3a973a9405584e8, live-gate credential closure packet SHA-256 4697784dec93175221fcdf2e885155d1ccda2b724e368ff2bb9855b9dc5603e1, production binding source-install packet SHA-256 e9721f15e834393e5663a5e8a260e7425d792c8800327ccc7909316f823e1515, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed server-owned default path can derive a non-null executable gate from reviewed non-secret current production metadata available without provider credentials, recompute the current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the executable gate and credential precondition remain source-owned without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved current-deployment metadata source, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing executable default gate installation path, missing exact private credential supply requirement, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    }),
    stopConditions: Object.freeze([
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'unresolvedCurrentDeploymentMetadataSource',
      'unresolvedCommandCardBinding',
      'missingExecutableDefaultGateInstallationPath',
      'missingExactPrivateCredentialSupplyRequirement',
      'missingInstallationSha256',
      'privateDataLeakageRisk',
      'runtimeCredentialsOrProviderConfigurationNeeded',
    ]),
    controlledUploadRuntimeBlocked: true,
    controlledUploadRuntimeBlocker: 'CONTROLLED_UPLOAD_REVIEWED_DURABLE_HOST_REQUIRED',
    controlledUploadLiveDurabilityVerified: false,
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
      ? 'CREDENTIAL_METADATA_SOURCE_REPAIR_VALID_DEFAULT_CLOSED'
      : 'CREDENTIAL_METADATA_SOURCE_REPAIR_BLOCKED',
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
  BOUND_INPUTS,
  PACKET,
  PROOF_ENV,
  SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  SOURCES,
  checkPacket,
  defaultClosedProof,
  expectedPacket,
  negativeReferenceProof,
  sourceOwnedMetadataProof,
};
