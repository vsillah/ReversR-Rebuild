const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const BINDING_PATH = 'docs/cad-internal-admission-evidence-binding.json';
const TEMPLATE_PATH = 'docs/cad-internal-admission-opening-bundle-template.json';

const REQUIRED_REQUIREMENT_KEYS = [
  'exactRuntimeCommit',
  'productionUrlAndRoute',
  'startsAtUtc',
  'expiresAtUtc',
  'internalCohortRef',
  'explicitUploadActivationPhrase',
  'concurrentSessionRevocationFence',
  'browserCookieTransportReview',
  'nativeBearerTransportReview',
  'rollbackSessionRevocationEvidence',
  'retentionDisposition',
  'durablePrivateRegisterAndLockout',
  'environmentDeploymentTestApprovals',
  'allInCostCapEvidence',
  'conversionSandboxApprovalSplit',
  'postRollbackSmokeRefs',
];

const FORBIDDEN_REQUEST_FLAGS = [
  'executableNow',
  'requestBodyReadAuthorizedNow',
  'conversionAllowed',
  'sandboxDispatchAllowed',
  'storeMutationAllowed',
  'privateCadAllowed',
  'realUsersAllowed',
  'commercialReadinessClaimAllowed',
];

const FORBIDDEN_AUTHORIZES = [
  'requestBodyRead',
  'productionUploadActivation',
  'conversionDispatch',
  'sandboxDispatch',
  'providerEnvResourceBillingChanges',
  'storeMutation',
  'privateCad',
  'realUsers',
  'externalMessages',
  'secrets',
];

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function hasReviewRef(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasRequirementValue(key, value) {
  if (key === 'postRollbackSmokeRefs') return Array.isArray(value) && value.length > 0 && value.every(hasReviewRef);
  return hasReviewRef(value);
}

function loadBinding(root = DEFAULT_ROOT) {
  return readJson(root, BINDING_PATH);
}

function buildOpeningBundleTemplate({ root = DEFAULT_ROOT, baseCommit, observedAtUtc = null } = {}) {
  const binding = loadBinding(root);
  return {
    schemaVersion: 1,
    packet: 'cad-internal-admission-opening-bundle-template',
    mode: 'source-only-guarded-switch-opening-bundle-template',
    status: 'TEMPLATE_ONLY_SWITCH_STILL_DISABLED',
    sourceOnly: true,
    runtimeRouteChanged: false,
    baseCommit: baseCommit || binding.baseCommit,
    observedAtUtc,
    expensesUsd: 0,
    route: binding.route,
    evidenceBinding: BINDING_PATH,
    requestedOpening: {
      scope: binding.firstFutureAllowedOpening.scope,
      executableNow: false,
      requestBodyReadAuthorizedNow: false,
      requiresSeparateActivationApproval: true,
      conversionAllowed: false,
      sandboxDispatchAllowed: false,
      storeMutationAllowed: false,
      privateCadAllowed: false,
      realUsersAllowed: false,
      commercialReadinessClaimAllowed: false,
    },
    requiredEvidence: binding.evidenceSlots.map(slot => ({
      id: slot.id,
      bindingSource: slot.source,
      receiptRef: null,
      reviewerRef: null,
      satisfied: false,
    })),
    openingBundleRequirements: {
      exactRuntimeCommit: null,
      productionUrlAndRoute: null,
      startsAtUtc: null,
      expiresAtUtc: null,
      internalCohortRef: null,
      explicitUploadActivationPhrase: null,
      concurrentSessionRevocationFence: null,
      browserCookieTransportReview: null,
      nativeBearerTransportReview: null,
      rollbackSessionRevocationEvidence: null,
      retentionDisposition: null,
      durablePrivateRegisterAndLockout: null,
      environmentDeploymentTestApprovals: null,
      allInCostCapEvidence: null,
      conversionSandboxApprovalSplit: null,
      stopOnUnknownOutcome: true,
      postRollbackSmokeRefs: [],
    },
    checkerPolicy: {
      readyStateName: 'readyForSeparateActivationApproval',
      readyStateDoesNotExecute: true,
      routeMustRemainFailClosedUntilSeparateApproval: true,
      checkedBundleMayNotCarrySecrets: true,
      checkedBundleMayNotCarryCadBytes: true,
    },
    authorizes: {
      sourceOnlyDocsAndTests: true,
      localValidation: true,
      draftPr: true,
      greenCheckMerge: true,
      normalVercelDeploymentFromMain: true,
      productionFailClosedSmoke: true,
      cleanup: true,
      requestBodyRead: false,
      productionUploadActivation: false,
      conversionDispatch: false,
      sandboxDispatch: false,
      providerEnvResourceBillingChanges: false,
      storeMutation: false,
      privateCad: false,
      realUsers: false,
      externalMessages: false,
      secrets: false,
    },
    nextRecommendedGate: 'fill this bundle with sanitized evidence for human approval review; do not execute production upload activation from this packet',
  };
}

function checkOpeningBundle(bundle, { root = DEFAULT_ROOT } = {}) {
  const binding = loadBinding(root);
  const problems = [];
  const warnings = [];

  if (bundle.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  if (bundle.mode !== 'source-only-guarded-switch-opening-bundle-template') problems.push('mode must remain source-only guarded template');
  if (bundle.sourceOnly !== true) problems.push('sourceOnly must be true');
  if (bundle.runtimeRouteChanged !== false) problems.push('runtimeRouteChanged must be false');
  if (bundle.route !== binding.route) problems.push(`route must match ${binding.route}`);
  if (bundle.evidenceBinding !== BINDING_PATH) problems.push(`evidenceBinding must be ${BINDING_PATH}`);

  const requestedOpening = bundle.requestedOpening || {};
  for (const flag of FORBIDDEN_REQUEST_FLAGS) {
    if (requestedOpening[flag] !== false) problems.push(`requestedOpening.${flag} must remain false`);
  }
  if (requestedOpening.requiresSeparateActivationApproval !== true) {
    problems.push('requestedOpening.requiresSeparateActivationApproval must be true');
  }

  const authorizes = bundle.authorizes || {};
  for (const key of FORBIDDEN_AUTHORIZES) {
    if (authorizes[key] !== false) problems.push(`authorizes.${key} must remain false`);
  }

  const expectedSlots = new Map(binding.evidenceSlots.map(slot => [slot.id, slot.source]));
  const receivedSlots = new Map();
  for (const item of bundle.requiredEvidence || []) {
    receivedSlots.set(item.id, item);
  }

  for (const [id, source] of expectedSlots) {
    const item = receivedSlots.get(id);
    if (!item) {
      problems.push(`requiredEvidence.${id} is missing`);
      continue;
    }
    if (item.bindingSource !== source) problems.push(`requiredEvidence.${id}.bindingSource must match binding source`);
    if (item.satisfied !== true) problems.push(`requiredEvidence.${id}.satisfied must be true for review readiness`);
    if (!hasReviewRef(item.receiptRef)) problems.push(`requiredEvidence.${id}.receiptRef is required`);
    if (!hasReviewRef(item.reviewerRef)) problems.push(`requiredEvidence.${id}.reviewerRef is required`);
  }

  for (const id of receivedSlots.keys()) {
    if (!expectedSlots.has(id)) warnings.push(`requiredEvidence.${id} is not part of the current binding`);
  }

  const requirements = bundle.openingBundleRequirements || {};
  for (const key of REQUIRED_REQUIREMENT_KEYS) {
    if (!hasRequirementValue(key, requirements[key])) problems.push(`openingBundleRequirements.${key} is required`);
  }
  if (requirements.stopOnUnknownOutcome !== true) problems.push('openingBundleRequirements.stopOnUnknownOutcome must be true');

  return {
    ok: problems.length === 0,
    readyForSeparateActivationApproval: problems.length === 0,
    terminalCodeUntilSeparateApproval: 'USER_UPLOADS_DISABLED',
    routeMayOpenNow: false,
    problems,
    warnings,
  };
}

function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'template';
  if (command === 'template') {
    process.stdout.write(`${JSON.stringify(buildOpeningBundleTemplate(), null, 2)}\n`);
    return;
  }
  if (command === 'check') {
    const file = argv[1] || TEMPLATE_PATH;
    const bundle = readJson(process.cwd(), file);
    const result = checkOpeningBundle(bundle, { root: process.cwd() });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }
  throw Error(`Unknown command: ${command}`);
}

if (require.main === module) main();

module.exports = {
  buildOpeningBundleTemplate,
  checkOpeningBundle,
  readJson,
};
