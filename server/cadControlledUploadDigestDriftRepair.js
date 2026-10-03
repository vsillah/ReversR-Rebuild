const {
  createDerivedDeploymentReference,
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');
const {
  createCadControlledUploadObservableGateActivationMount,
  createControlledUploadObservableGateActivationConfig,
} = require('./cadControlledUploadObservableGateWiringRepair');
const {
  validCurrentDeploymentMetadata,
} = require('./cadLiveOpeningCredentialClosureMetadataPolicy');

const STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_ATTEMPT_UTC =
  '2026-10-03T04:31:50Z';
const STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_CODE = 'USER_UPLOADS_DISABLED';
const OBSERVED_DIGEST_DRIFT_COMMAND_CARD_SHA256 =
  'ff66a1b3800b1f1e720b45005ad2ed2035d3c3bf275ee8ade34c7e0d54cb0641';
const OBSERVED_DIGEST_DRIFT_INSTALLATION_SHA256 =
  '396b71444fc08db82c613983ba7b7288737c6ebbf5fa09e9b59056369302de08';
const APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256 =
  '1ea310dd9d368b24982c39b9389ec34db1ae4838d0e51926800cc1b788fead04';
const APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256 =
  '239286c275c253c58580a86046cdb783eb76cdfc0134f272183f5cb9e791b830';
const DIGEST_DRIFT_REPAIR_MAIN_COMMIT =
  'f42c2d8a4f489856582aa33962b795f78f610fc3';
const DIGEST_DRIFT_REPAIR_PRODUCTION_TARGET =
  'https://reversr-9hllbtpnc-vsillahs-projects.vercel.app';
const DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  'vercel-target:reversr-9hllbtpnc-vsillahs-projects.vercel.app@f42c2d8a4f489856582aa33962b795f78f610fc3';
const DIGEST_DRIFT_REPAIR_WINDOW = Object.freeze({
  startUtc: '2026-10-03T04:30:00Z',
  expiresUtc: '2026-10-03T05:00:00Z',
  proofNowUtc: '2026-10-03T04:35:00Z',
});

function sourceOwnedDeploymentReferenceFromMetadata(metadata) {
  if (!validCurrentDeploymentMetadata(metadata)) return null;
  const host = metadata.deploymentTarget.replace(/^https:\/\//, '');
  return createDerivedDeploymentReference(host, metadata.gitCommitSha);
}

function createSourceOwnedControlledUploadDeploymentMetadata(metadata) {
  const sourceOwnedReference = sourceOwnedDeploymentReferenceFromMetadata(metadata);
  if (!sourceOwnedReference) return null;
  return Object.freeze({
    schemaVersion: metadata.schemaVersion,
    source: metadata.source,
    deploymentReference: sourceOwnedReference,
    deploymentTarget: metadata.deploymentTarget,
    projectProductionTarget: metadata.projectProductionTarget,
    gitCommitSha: metadata.gitCommitSha,
    gitCommitRef: metadata.gitCommitRef,
    gitRepo: metadata.gitRepo,
    gitOwner: metadata.gitOwner,
    vercelEnv: metadata.vercelEnv,
    secretBearing: metadata.secretBearing,
  });
}

function readSourceOwnedControlledUploadDeploymentMetadata({
  readDeploymentMetadata = readCadProductionCurrentDeploymentMetadata,
} = {}) {
  const metadata = typeof readDeploymentMetadata === 'function'
    ? readDeploymentMetadata()
    : readDeploymentMetadata;
  return createSourceOwnedControlledUploadDeploymentMetadata(metadata);
}

function createCadControlledUploadDigestDriftRepairActivationMount({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata,
  now = Date.now,
  ledger,
  baseRuntimeMount,
} = {}) {
  const readDeploymentMetadata = typeof deploymentMetadata === 'function'
    ? deploymentMetadata
    : () => deploymentMetadata;
  return createCadControlledUploadObservableGateActivationMount({
    deploymentMetadata: () => readSourceOwnedControlledUploadDeploymentMetadata({
      readDeploymentMetadata,
    }),
    now,
    ledger,
    baseRuntimeMount,
  });
}

function createCadControlledUploadDigestDriftRepairReview({
  deploymentMetadata,
  now = () => Date.parse(DIGEST_DRIFT_REPAIR_WINDOW.proofNowUtc),
  ledger = { runs: new Set(), attempts: new Set(), rollbacks: new Set(), fences: new Set(), revoked: new Set() },
} = {}) {
  const sourceOwnedMetadata =
    createSourceOwnedControlledUploadDeploymentMetadata(deploymentMetadata);
  const config = createControlledUploadObservableGateActivationConfig({
    deploymentMetadata: sourceOwnedMetadata,
    now,
    ledger,
  });
  const source = config.source || null;
  const sourceOwnedReferenceResolved =
    source?.currentDeploymentReference
      === DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE;
  const approvedDigestsResolved =
    source?.commandCardSha256 === APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256
      && source?.installationSha256 === APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256;
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-controlled-upload-digest-drift-repair-review-v1',
    sourceOnly: true,
    status: source && sourceOwnedReferenceResolved && approvedDigestsResolved
      ? 'CONTROLLED_UPLOAD_DIGEST_DRIFT_REPAIR_READY_SOURCE_ONLY'
      : 'CONTROLLED_UPLOAD_DIGEST_DRIFT_REPAIR_BLOCKED',
    stoppedAttempt: Object.freeze({
      observedAtUtc: STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_ATTEMPT_UTC,
      terminalCode: STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_CODE,
      observedCommandCardSha256: OBSERVED_DIGEST_DRIFT_COMMAND_CARD_SHA256,
      observedInstallationSha256: OBSERVED_DIGEST_DRIFT_INSTALLATION_SHA256,
      stoppedReason:
        'observable controlled upload proof headers were present, but command-card and installation digests drifted from the approval-bound source-owned deployment reference',
    }),
    repair: Object.freeze({
      deployedStartupRoutePath: true,
      providerDeploymentIdIsProvenanceOnly: true,
      sourceOwnedDeploymentReferenceResolved: sourceOwnedReferenceResolved,
      commandCardDigestReboundToSourceOwnedReference:
        source?.commandCardSha256 === APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256,
      installationDigestReboundToSourceOwnedReference:
        source?.installationSha256 === APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256,
      productionTarget: source?.productionTarget || null,
      mainCommit: source?.mainCommit || null,
      currentDeploymentReference: source?.currentDeploymentReference || null,
      openingWindow: source?.openingWindow || null,
    }),
    binding: config.binding,
    authorizes: Object.freeze({
      productionUploadActivation: false,
      requestBodyAdmissionOrRead: false,
      privateCredentialRead: false,
      uploadSessionIssuance: false,
      conversionDispatch: false,
      sandboxDispatch: false,
      privateCadUse: false,
      runtimeInstallationActivation: false,
      executableCommandCardIssuance: false,
      externalMessages: false,
      liveRetry: false,
      secondLiveRun: false,
      realUserCommercialization: false,
      commercialReadinessClaim: false,
    }),
  });
}

module.exports = {
  APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256,
  APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256,
  DIGEST_DRIFT_REPAIR_MAIN_COMMIT,
  DIGEST_DRIFT_REPAIR_PRODUCTION_TARGET,
  DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  DIGEST_DRIFT_REPAIR_WINDOW,
  OBSERVED_DIGEST_DRIFT_COMMAND_CARD_SHA256,
  OBSERVED_DIGEST_DRIFT_INSTALLATION_SHA256,
  STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_ATTEMPT_UTC,
  STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_CODE,
  createCadControlledUploadDigestDriftRepairActivationMount,
  createCadControlledUploadDigestDriftRepairReview,
  createSourceOwnedControlledUploadDeploymentMetadata,
  readSourceOwnedControlledUploadDeploymentMetadata,
  sourceOwnedDeploymentReferenceFromMetadata,
};
