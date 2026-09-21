const CAD_COST_WORKBOOK = Object.freeze({
  schemaVersion: 1,
  packet: 'cad-per-run-cost-workbook',
  status: 'source_only_workbook_ready',
  unit: 'one CAD run',
  sourceOnly: true,
  currentPricingClaims: false,
  pricingEvidenceRequired: true,
  approvedDevelopmentCeilingUsd: 50,
  feePerRunReady: false,
  customerFeeReady: false,
  buckets: Object.freeze([
    Object.freeze({
      id: 'convex-auth-session-store',
      label: 'Convex',
      readiness: 'needs current plan and usage evidence',
      meters: Object.freeze(['auth/session calls', 'mutations', 'query reads', 'document writes', 'retained storage']),
    }),
    Object.freeze({
      id: 'vercel-web-api',
      label: 'Vercel',
      readiness: 'needs current plan and route usage evidence',
      meters: Object.freeze(['function invocations', 'build minutes', 'bandwidth', 'logs']),
    }),
    Object.freeze({
      id: 'upload-admission',
      label: 'Upload admission',
      readiness: 'locked until body admission is separately approved',
      meters: Object.freeze(['request validation', 'body-read bytes', 'temporary storage', 'hashing CPU']),
    }),
    Object.freeze({
      id: 'conversion-sandbox-compute',
      label: 'Conversion compute',
      readiness: 'locked until conversion and Sandbox dispatch are separately approved',
      meters: Object.freeze(['Sandbox startup', 'CPU time', 'memory', 'storage', 'egress', 'cleanup calls']),
    }),
    Object.freeze({
      id: 'preview-render-retention',
      label: 'Preview and retention',
      readiness: 'needs artifact sizes and retention policy',
      meters: Object.freeze(['derived preview size', 'reference images', 'cache policy', 'sanitized evidence files']),
    }),
    Object.freeze({
      id: 'internal-tester-support',
      label: 'Tester support',
      readiness: 'needs browser, device, file-picker, renderer and triage evidence',
      meters: Object.freeze(['device install support', 'browser compatibility', 'file-picker failures', 'renderer compatibility triage', 'tester follow-up time']),
    }),
    Object.freeze({
      id: 'account-history-persistence',
      label: 'Account history',
      readiness: 'needs account-backed history or explicit local-only policy',
      meters: Object.freeze(['saved reconstruction records', 'sync or export/import operations', 'retained metadata', 'migration support', 'empty-state support']),
    }),
    Object.freeze({
      id: 'commercial-buffer',
      label: 'Commercial buffer',
      readiness: 'needs fee policy before customer pricing',
      meters: Object.freeze(['taxes', 'fees', 'FX', 'contingency', 'support burden']),
    }),
  ]),
});

const CAD_BUILD_READINESS = Object.freeze({
  headline: 'Build stays locked while cost and manufacturing evidence are incomplete.',
  userSteps: Object.freeze([
    Object.freeze({
      label: 'Source',
      state: 'Ready',
      detail: 'CAD source is selected and ready for review.',
      tone: 'success',
      icon: 'document-text-outline',
    }),
    Object.freeze({
      label: 'Geometry',
      state: 'Review',
      detail: 'Inspect the model, dimensions, and references before preparing implementation.',
      tone: 'warning',
      icon: 'cube-outline',
    }),
    Object.freeze({
      label: 'Package',
      state: 'Locked',
      detail: 'The implementation package opens after the required review is complete.',
      tone: 'muted',
      icon: 'construct-outline',
    }),
  ]),
  summaryCards: Object.freeze([
    Object.freeze({
      label: 'Development cap',
      value: 'USD 50',
      tone: 'success',
    }),
    Object.freeze({
      label: 'Fee per run',
      value: 'Evidence pending',
      tone: 'warning',
    }),
    Object.freeze({
      label: 'Activation',
      value: 'Uploads locked',
      tone: 'muted',
    }),
  ]),
  productReady: Object.freeze([
    'Desktop/browser and installed-app internal CAD preview controls',
    'Local CAD source chooser with IGES, STEP and BREP render support',
    'Fail-closed production upload route status',
  ]),
  costEvidenceNeeded: Object.freeze([
    'Current Convex and Vercel plan terms',
    'Sandbox or conversion compute pricing',
    'Per-run operation, storage and egress counts',
    'Account-backed history persistence and preview-to-project retention policy',
    'Internal tester browser, device and file-compatibility support',
    'Tax, fee, FX, contingency and support policy',
  ]),
  blockedOutputs: Object.freeze([
    'Production CAD upload activation',
    'CAD conversion or Sandbox dispatch for user files',
    'Durable account-backed reconstruction history',
    'Customer fee quote or manufacturing package',
  ]),
  commercializationGates: Object.freeze([
    Object.freeze({
      label: 'Run cost',
      state: 'Needs evidence',
      detail: 'Provider terms, metered operation counts, storage and support burden are still open.',
      tone: 'warning',
    }),
    Object.freeze({
      label: 'Account history',
      state: 'Fast follow',
      detail: 'Saved reconstruction history needs account-backed persistence or an explicit local-only policy.',
      tone: 'warning',
    }),
    Object.freeze({
      label: 'Production upload',
      state: 'Locked',
      detail: 'User-file upload activation still requires a separate production gate.',
      tone: 'muted',
    }),
    Object.freeze({
      label: 'Conversion compute',
      state: 'Locked',
      detail: 'Sandbox or conversion dispatch for user files remains separately gated.',
      tone: 'muted',
    }),
    Object.freeze({
      label: 'Manufacturing output',
      state: 'Blocked',
      detail: 'Build packages and customer fee quotes wait on cost, geometry and review evidence.',
      tone: 'muted',
    }),
  ]),
});

module.exports = {
  CAD_COST_WORKBOOK,
  CAD_BUILD_READINESS,
};
