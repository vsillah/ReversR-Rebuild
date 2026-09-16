const REQUIRED_FALSE_AUTHORITY = [
  'cadUploadActivationAuthorized',
  'cadConversionAuthorized',
  'sandboxDispatchAuthorized',
  'privateCadAuthorized',
  'productionStoreMutationAuthorized',
  'developmentStoreMutationAuthorizedNow',
  'envProviderAuthResourceChangeAuthorized',
  'usageBillingChangeAuthorized',
  'secretReadAuthorized',
  'emailSmsSlackAuthorized',
  'externalDeliveryAuthorized',
  'pushMergeDeployAuthorizedByThisPacket',
  'retryAuthorized',
  'secondRunAuthorized',
];

const REQUIRED_TRUE_REQUIREMENTS = [
  'mustRemainDisabledByDefault',
  'requiresLiteralFalseBodyAdmissionGate',
  'requiresNoEnvironmentToggle',
  'requiresNoRequestDrivenEnablement',
  'requiresSessionVerificationBeforeBodyAdmission',
  'requiresNoBodyReadBeforeSessionAndGate',
  'requiresDisabledRollbackTarget',
  'requiresAcceptedOneRunDevelopmentWindow',
  'requiresBoundedDevelopmentOnlyDryRunFirst',
  'requiresStopOnUnknownOutcome',
  'requiresNoAutomaticRetry',
  'requiresNoConversionOrSandboxAuthority',
  'requiresNoProductionStoreMutation',
  'requiresNoSecretRead',
];

function allNamedValues(source, names, expected) {
  return names.every(name => source?.[name] === expected);
}

function inspectUploadAdmissionRuntimeBridgeReview(packet, routeSource = '') {
  const authorityClosed = allNamedValues(packet?.authorityPreserved, REQUIRED_FALSE_AUTHORITY, false);
  const requirementsClosed = allNamedValues(packet?.runtimeIntroductionRequirements, REQUIRED_TRUE_REQUIREMENTS, true);
  const routeLiteralClosed = /const BODY_ADMISSION_AUTHORIZED = false;/.test(routeSource);
  const routeReturnsDisabled = /return send\(res, 'USER_UPLOADS_DISABLED'\);/.test(routeSource);
  const noBridgeRuntimeImport = !/uploadAdmissionGuardedRouteBridge|uploadAdmissionRuntimeBridge/.test(routeSource);
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-runtime-bridge-review'
    && packet?.sourceOnly === true
    && packet?.runtimeBridgeCanBeIntroducedSafely === true
    && packet?.runtimeBridgeImplementedNow === false
    && packet?.runtimeBridgeMountedNow === false
    && packet?.bodyAdmissionAuthorized === false
    && packet?.routeTerminalCode === 'USER_UPLOADS_DISABLED'
    && packet?.reviewDecision?.decision === 'SOURCE_ONLY_RUNTIME_BRIDGE_ALLOWED_AS_DISABLED_DEFAULT_FOLLOW_UP'
    && packet?.nextSafeAction?.branch === 'codex/cad-upload-admission-runtime-bridge-source'
    && authorityClosed
    && requirementsClosed;

  const currentRouteStillClosed = routeLiteralClosed && routeReturnsDisabled && noBridgeRuntimeImport;
  return {
    structureValid,
    authorityClosed,
    requirementsClosed,
    currentRouteStillClosed,
    readyForSourceOnlyBridgeFollowUp: structureValid && currentRouteStillClosed,
    readyForLiveRun: false,
    readyForUploadActivation: false,
    terminalCode: currentRouteStillClosed ? 'USER_UPLOADS_DISABLED' : 'RUNTIME_ROUTE_OPENED_UNEXPECTEDLY',
  };
}

module.exports = { inspectUploadAdmissionRuntimeBridgeReview };
