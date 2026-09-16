const REQUIRED_INPUTS = Object.freeze({
  uploadSessionCloseout: 'docs/cad-dev-upload-session-successful-closeout.json',
  dryRunCloseout: 'docs/cad-upload-admission-development-dry-run-closeout.json',
  activationRunManifest: 'docs/cad-upload-activation-run-manifest.json',
  qualificationWindow: 'docs/cad-upload-admission-qualification-window.json',
  routeGate: 'server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED',
});

const falseKeys = values => Object.values(values || {}).every(value => value === false);

function inspectUploadAdmissionQualificationGate(packet) {
  const uploadSession = packet.inputs.uploadSessionCloseout;
  const dryRun = packet.inputs.dryRunCloseout;
  const blockers = packet.remainingExecutionBlockers || [];
  const futureRun = packet.futureBoundedAdmissionRun || {};

  const uploadSessionReady = uploadSession.path === REQUIRED_INPUTS.uploadSessionCloseout
    && uploadSession.runCompleted === true
    && uploadSession.unknownOutcome === false
    && uploadSession.loginSessionIdObserved === true
    && uploadSession.retainedUploadSession === true
    && uploadSession.bodyAdmissionAuthorized === false;

  const dryRunReady = dryRun.path === REQUIRED_INPUTS.dryRunCloseout
    && dryRun.dryRunCompleted === true
    && dryRun.unknownOutcome === false
    && dryRun.uploadBodiesRead === 0
    && dryRun.conversionDispatches === 0
    && dryRun.sandboxDispatches === 0
    && dryRun.staleReceiptMainCommitCaveatRequiresRerun === false;

  const sourceBindingsValid = packet.sourceBindings.activationRunManifest === REQUIRED_INPUTS.activationRunManifest
    && packet.sourceBindings.qualificationWindow === REQUIRED_INPUTS.qualificationWindow
    && packet.sourceBindings.routeGate === REQUIRED_INPUTS.routeGate;

  const authoritiesClosed = packet.sourceOnly === true
    && packet.liveRunAuthorized === false
    && packet.productionUploadActivationAuthorized === false
    && packet.bodyAdmissionAuthorizedNow === false
    && packet.conversionAuthorized === false
    && packet.sandboxDispatchAuthorized === false
    && falseKeys(packet.authorityPreserved);

  const blockersPreserved = blockers.includes('fresh UTC execution window is not accepted in this packet')
    && blockers.includes('exact deployment reference must be rebound after merge')
    && blockers.includes('future run manifest hash must be accepted before execution');

  const futureRunBounded = futureRun.route === 'POST /api/cad/user-import'
    && futureRun.developmentOnly === true
    && futureRun.publicSyntheticFixtureOnly === true
    && futureRun.stopBeforeConversion === true
    && futureRun.stopBeforeSandbox === true
    && futureRun.privateCadAllowed === false
    && futureRun.realUsersAllowed === false
    && futureRun.maxAllInCostUsd === 50;

  return Object.freeze({
    structureValid: packet.schemaVersion === 1
      && packet.mode === 'source-only-cad-upload-admission-qualification-gate',
    uploadSessionReady,
    dryRunReady,
    sourceBindingsValid,
    authoritiesClosed,
    blockersPreserved,
    futureRunBounded,
  });
}

module.exports = { REQUIRED_INPUTS, inspectUploadAdmissionQualificationGate };
