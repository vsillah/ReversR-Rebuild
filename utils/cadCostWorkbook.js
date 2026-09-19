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
      readiness: 'needs device, file-picker, renderer and triage evidence',
      meters: Object.freeze(['device install support', 'file-picker failures', 'renderer compatibility triage', 'tester follow-up time']),
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
    'Installed-app internal IGES preview controls',
    'Source/reference comparison flow',
    'Fail-closed route status',
  ]),
  costEvidenceNeeded: Object.freeze([
    'Current Convex and Vercel plan terms',
    'Sandbox or conversion compute pricing',
    'Per-run operation, storage and egress counts',
    'Internal tester device and file-compatibility support',
    'Tax, fee, FX, contingency and support policy',
  ]),
  blockedOutputs: Object.freeze([
    'Production CAD upload activation',
    'CAD conversion or Sandbox dispatch for user files',
    'Customer fee quote or manufacturing package',
  ]),
});

module.exports = {
  CAD_COST_WORKBOOK,
  CAD_BUILD_READINESS,
};
