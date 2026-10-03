const {
  createControlledInternalUploadActivationManifest,
  reviewControlledInternalUploadActivationManifest,
  COHORT_REF,
  SESSION_REF,
  VALIDATOR_ENVELOPE,
} = require('./cadControlledInternalUploadActivation');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');
const {
  createCadStartupActiveLiveOpeningWindow,
} = require('./cadStartupLiveGateSourceInstallClosure');
const {
  validCurrentDeploymentMetadata,
} = require('./cadLiveOpeningCredentialClosureMetadataPolicy');

const STOPPED_CONTROLLED_UPLOAD_ACTIVATION_DISPOSITION_SHA256 =
  'ef54235060fc632f884d708bbb977e8279979dd83d1f4f17aab9eae27704563c';
const APPROVED_CONTROLLED_ACTIVATION_REFRESH_SHA256 =
  'af33c5a1b0121ee33164d778f7e62b864c80465b71434d2dc45a15ba3c03e73e';
const BASE_MAIN_COMMIT = '7c551e230982d0482068cbc60424860c268aafdc';
const BASE_VERCEL_DEPLOYMENT = 'dpl_CfkHP8RFjCSthTtZJm4JwJHSkFwY';
const BASE_PRODUCTION_ALIAS = 'https://reversr.vercel.app';
const BASE_FAIL_CLOSED_SMOKE_OBSERVED_AT_UTC = '2026-10-03T01:49:30Z';
const CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_PACKET_SHA256 =
  '43d1bb66e9e53dae20206790808be81d055a0090da12a814a03f49ed442aa614';
const CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_SOURCE_COMMIT =
  'd60941a10e0d969246d6fcdbc072d3dfeb6516f5';
const CURRENT_PRODUCTION_DEPLOYMENT_BINDING_SHA256 =
  'c1f0a70ee72f69062b393f083648f5809791c63b2f660b4fee364fd0b1b8123c';
const APPROVED_COMMAND_CARD_SHA256 =
  '63bedb7cecae55872d8ac291ab3dd9761de202634a13998a7a77c6eb0051f03c';
const APPROVED_INSTALLATION_SHA256 =
  'df21b3ec6ecfa44d5190f63a815722c2b0bd90b5f596121294f51439acf859c3';
const APPROVED_CONTROLLED_WINDOW = Object.freeze({
  startUtc: '2026-10-03T02:30:00Z',
  expiresUtc: '2026-10-03T03:00:00Z',
  proofNowUtc: '2026-10-03T02:35:00Z',
});

// No reviewed source-owned durable upload host is installed. This is a source
// barrier, not a caller-supplied capability flag. A future host integration needs
// independent review and cross-runtime transactional/rollback/smoke evidence.
const CONTROLLED_UPLOAD_RUNTIME_BLOCKER = 'CONTROLLED_UPLOAD_REVIEWED_DURABLE_HOST_REQUIRED';

const sha = /^[a-f0-9]{64}$/;

function deniedBinding(code, extra = {}) {
  return Object.freeze({
    ok: false,
    code,
    enabled: false,
    defaultClosed: true,
    activationEnabled: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionReadAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    effectsExecuted: 0,
    ...extra,
  });
}

function createProofDeploymentMetadata({
  deploymentReference = BASE_VERCEL_DEPLOYMENT,
  deploymentTarget = 'https://reversr-cfkhp8rfj-vsillahs-projects.vercel.app',
  gitCommitSha = BASE_MAIN_COMMIT,
} = {}) {
  return Object.freeze({
    schemaVersion: 1,
    source: 'vercel-system-environment',
    deploymentReference,
    deploymentTarget,
    projectProductionTarget: BASE_PRODUCTION_ALIAS,
    gitCommitSha,
    gitCommitRef: 'main',
    gitRepo: 'ReversR-Rebuild',
    gitOwner: 'vsillah',
    vercelEnv: 'production',
    secretBearing: false,
  });
}

function createControlledUploadObservableGateSource({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  now = Date.now,
} = {}) {
  const openingWindow = createCadStartupActiveLiveOpeningWindow({ now });
  if (!validCurrentDeploymentMetadata(deploymentMetadata) || !openingWindow) {
    return null;
  }
  const controlledOpeningWindow = Object.freeze({
    startUtc: openingWindow.startUtc,
    expiresUtc: openingWindow.expiresUtc,
    startInclusiveExpiryExclusive: true,
  });
  const manifest = createControlledInternalUploadActivationManifest({
    activationEnabled: true,
    currentDeploymentReference: deploymentMetadata.deploymentReference,
    openingWindow: controlledOpeningWindow,
  });
  const review = reviewControlledInternalUploadActivationManifest({
    manifest,
    currentDeploymentReference: deploymentMetadata.deploymentReference,
  });
  if (review.bindingAccepted !== true
    || review.activationEnabled !== true
    || !sha.test(manifest.commandCardSha256)
    || !sha.test(manifest.installationSha256)
    || JSON.stringify(manifest.validatorEnvelope) !== JSON.stringify(VALIDATOR_ENVELOPE)) {
    return null;
  }
  return Object.freeze({
    schemaVersion: 1,
    sourceOnly: true,
    enabled: true,
    explicitControlledActivationApproved: false,
    defaultProductionClosed: true,
    stoppedControlledUploadActivationDispositionSha256:
      STOPPED_CONTROLLED_UPLOAD_ACTIVATION_DISPOSITION_SHA256,
    approvedControlledActivationRefreshSha256:
      APPROVED_CONTROLLED_ACTIVATION_REFRESH_SHA256,
    controlledUploadObservableGateProofPacketSha256:
      CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_PACKET_SHA256,
    controlledUploadObservableGateProofSourceCommit:
      CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_SOURCE_COMMIT,
    currentProductionDeploymentBindingSha256:
      CURRENT_PRODUCTION_DEPLOYMENT_BINDING_SHA256,
    baseMainCommit: BASE_MAIN_COMMIT,
    baseVercelDeployment: BASE_VERCEL_DEPLOYMENT,
    baseProductionAlias: BASE_PRODUCTION_ALIAS,
    baseFailClosedSmokeObservedAtUtc:
      BASE_FAIL_CLOSED_SMOKE_OBSERVED_AT_UTC,
    currentDeploymentReference: deploymentMetadata.deploymentReference,
    productionTarget: deploymentMetadata.deploymentTarget,
    mainCommit: deploymentMetadata.gitCommitSha,
    cohortRef: COHORT_REF,
    sessionId: SESSION_REF,
    openingWindow: controlledOpeningWindow,
    manifest,
    manifestReview: review,
    commandCardSha256: manifest.commandCardSha256,
    installationSha256: manifest.installationSha256,
    approvedWindowProof: Object.freeze({
      window: APPROVED_CONTROLLED_WINDOW,
      commandCardSha256: APPROVED_COMMAND_CARD_SHA256,
      installationSha256: APPROVED_INSTALLATION_SHA256,
      deploymentReference: BASE_VERCEL_DEPLOYMENT,
    }),
    authorizes: Object.freeze({
      productionUploadActivation: false,
      requestBodyAdmissionRead: false,
      conversion: false,
      sandboxDispatch: false,
      privateCadUse: false,
      executableCommandCardIssuance: false,
      realUserCommercialization: false,
      commercialReadinessClaim: false,
    }),
  });
}

function createControlledUploadObservableGateAdapter() {
  // Never manufacture durable, atomic-expiry or smoke receipts. In particular,
  // injected ledgers, adapter objects and self-attested flags are not authority.
  return null;
}

function createControlledUploadObservableGateActivationConfig({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  now = Date.now,
} = {}) {
  const source = createControlledUploadObservableGateSource({
    deploymentMetadata,
    now,
  });
  if (!source) {
    return Object.freeze({
      binding: deniedBinding('CONTROLLED_UPLOAD_OBSERVABLE_GATE_SOURCE_UNRESOLVED'),
      controlledInternalUploadActivation: Object.freeze({ enabled: false }),
    });
  }
  return Object.freeze({
    binding: deniedBinding(CONTROLLED_UPLOAD_RUNTIME_BLOCKER, {
      sourceBindingAccepted: true,
      currentDeploymentReference: source.currentDeploymentReference,
      commandCardSha256: source.commandCardSha256,
      installationSha256: source.installationSha256,
      openingWindow: source.openingWindow,
    }),
    source,
    controlledInternalUploadActivation: Object.freeze({ enabled: false }),
  });
}

function createCadControlledUploadObservableGateActivationMount({
  baseRuntimeMount,
} = {}) {
  // Terminal source barrier: do not call the base runtime, read metadata, or
  // accept a caller-supplied adapter while the reviewed durable host is absent.
  const blocked = () => deniedBinding(CONTROLLED_UPLOAD_RUNTIME_BLOCKER, {
    bodyReadAuthorized: false,
    routeBodyGateAuthorized: false,
    admissionAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
  });
  return Object.freeze({
    ...(baseRuntimeMount || {}),
    controlledInternalUploadActivationMounted: true,
    controlledUploadObservableGateWiringRepairMounted: true,
    controlledUploadRuntimeBlocked: true,
    enabled: false,
    defaultClosed: true,
    binding: blocked(),
    admissionSwitch: Object.freeze({ decide: async () => blocked() }),
    routeBodyGate: Object.freeze({
      authorizeBodyRead: async () => blocked(),
      afterBodyAdmission: async () => blocked(),
    }),
  });
}

function createControlledUploadObservableGateWiringRepairReview({
  deploymentMetadata = createProofDeploymentMetadata(),
  now = () => Date.parse(APPROVED_CONTROLLED_WINDOW.proofNowUtc),
} = {}) {
  const config = createControlledUploadObservableGateActivationConfig({
    deploymentMetadata,
    now,
  });
  const source = config.source || null;
  const approvedDigestProof = source?.commandCardSha256 === APPROVED_COMMAND_CARD_SHA256
    && source?.installationSha256 === APPROVED_INSTALLATION_SHA256;
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-controlled-upload-observable-gate-wiring-repair-review-v1',
    sourceOnly: true,
    status: source && approvedDigestProof
      ? 'CONTROLLED_UPLOAD_OBSERVABLE_GATE_SOURCE_BOUND_RUNTIME_BLOCKED'
      : 'CONTROLLED_UPLOAD_OBSERVABLE_GATE_WIRING_BLOCKED',
    boundStopDisposition: Object.freeze({
      stoppedControlledUploadActivationDispositionSha256:
        STOPPED_CONTROLLED_UPLOAD_ACTIVATION_DISPOSITION_SHA256,
      approvedControlledActivationRefreshSha256:
        APPROVED_CONTROLLED_ACTIVATION_REFRESH_SHA256,
      stoppedReason:
        'production controlled activation reached USER_UPLOADS_DISABLED without observable proof headers because deployed startup/default route wiring did not install the reviewed activation mount',
    }),
    startupWiring: Object.freeze({
      requestTimeCurrentDeploymentMetadata: false,
      requestTimeActiveWindowBinding: false,
      controlledActivationMountInstalledFromServerSource: true,
      proofOnlyInjectionRequired: false,
      defaultProductionClosed: true,
      manifestReviewAccepted: source?.manifestReview?.bindingAccepted === true,
      approvedWindowCommandCardMatches: source?.commandCardSha256 === APPROVED_COMMAND_CARD_SHA256,
      approvedWindowInstallationMatches: source?.installationSha256 === APPROVED_INSTALLATION_SHA256,
    }),
    observableHeaders: Object.freeze({
      requiredForLaterLiveAttempt: true,
      validation: 'X-ReversR-CAD-Controlled-Upload-Validation',
      rollback: 'X-ReversR-CAD-Controlled-Upload-Rollback',
      commandCard: 'X-ReversR-CAD-Controlled-Command-Card-SHA256',
      installation: 'X-ReversR-CAD-Controlled-Installation-SHA256',
      credentialValueAuthorized: false,
      cadBytesAuthorized: false,
      privateFileNamesAuthorized: false,
    }),
    runtimeBlocker: CONTROLLED_UPLOAD_RUNTIME_BLOCKER,
    liveDurabilityVerified: false,
    independentSmokeVerified: false,
    controlledBinding: config.binding,
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
  APPROVED_COMMAND_CARD_SHA256,
  APPROVED_CONTROLLED_ACTIVATION_REFRESH_SHA256,
  APPROVED_CONTROLLED_WINDOW,
  APPROVED_INSTALLATION_SHA256,
  BASE_FAIL_CLOSED_SMOKE_OBSERVED_AT_UTC,
  BASE_MAIN_COMMIT,
  BASE_PRODUCTION_ALIAS,
  BASE_VERCEL_DEPLOYMENT,
  CONTROLLED_UPLOAD_RUNTIME_BLOCKER,
  CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_PACKET_SHA256,
  CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_SOURCE_COMMIT,
  CURRENT_PRODUCTION_DEPLOYMENT_BINDING_SHA256,
  STOPPED_CONTROLLED_UPLOAD_ACTIVATION_DISPOSITION_SHA256,
  createCadControlledUploadObservableGateActivationMount,
  createControlledUploadObservableGateActivationConfig,
  createControlledUploadObservableGateAdapter,
  createControlledUploadObservableGateSource,
  createControlledUploadObservableGateWiringRepairReview,
  createProofDeploymentMetadata,
};
