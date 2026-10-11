const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  CREDENTIAL_REFERENCES,
  ENVIRONMENT_VARIABLE_REFERENCES,
  LIMITS,
  QUALIFICATION_BINDING,
  approvalCommitment,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const {
  EXECUTION_BASELINE,
  approvalIssuanceVerificationRequest,
  expectedAncestryDigest,
  expectedApprovalIssuanceReceipt,
  expectedRuntimeReceiptDigest,
} = require('../server/cadPhase5Package8OneUseCoordinator');
const {
  runtimeAuthorityRequest,
} = require('../server/cadPhase5Package8IndependentQualificationLauncher');
const {
  COMMAND_REVIEW_GATE,
  createCadPhase5Package8InternalQualificationCommand,
} = require('../server/cadPhase5Package8InternalQualificationCommand');
const {
  VERIFIER_SOURCE_BINDING,
  hash,
} = require('../server/cadPhase5Package8RuntimeIssuerAuthorityVerifier');
const { SYNTHETIC_PRIVATE_IGES_FIXTURE }
  = require('../server/cadPhase5SyntheticPrivatePathQualification');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-11T03:00:00.000Z');
const VERIFIER = hash('package8-command-verifier');
const ISSUER = hash('package8-command-issuer');

function approval() {
  const runtimeDeployment = { schemaVersion: 1,
    deploymentId: 'dpl_package8_development_command', state: 'READY',
    environment: 'development', commit: VERIFIER_SOURCE_BINDING.runtimeInstallRootCommit,
    tree: VERIFIER_SOURCE_BINDING.runtimeInstallRootTree,
    identityMetadataSupported: true, functionSchemaEquivalenceClaimed: false,
    receiptDigest: '' };
  runtimeDeployment.receiptDigest = expectedRuntimeReceiptDigest(runtimeDeployment);
  const executionBinding = { schemaVersion: 1, baseline: { ...EXECUTION_BASELINE },
    executionHeadCommit: runtimeDeployment.commit, executionHeadTree: runtimeDeployment.tree,
    clean: true, descendantOfBaseline: true, ancestryReceiptDigest: '', runtimeDeployment };
  executionBinding.ancestryReceiptDigest = expectedAncestryDigest(executionBinding);
  const artifact = { schemaVersion: 1,
    kind: 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL',
    status: 'ISSUED_ONE_USE_DEVELOPMENT_QUALIFICATION',
    issuanceReference: 'package8-command-once', approvalIdDigest: '0'.repeat(64),
    issuedAtUtc: new Date(NOW).toISOString(),
    authorityExpiresAtUtc: new Date(NOW + 9 * 60_000).toISOString(),
    window: { schemaVersion: 1, idDigest: hash('package8-command-window'),
      startUtc: new Date(NOW - 60_000).toISOString(),
      endUtc: new Date(NOW + 9 * 60_000).toISOString(), activated: true },
    binding: { ...QUALIFICATION_BINDING }, executionBinding,
    owner: { userId: 'synthetic-package8-user', shopId: 'synthetic-package8-shop',
      uploadSessionId: 'synthetic-package8-upload-session' },
    session: { sessionDigest: hash('synthetic-package8-session'),
      loginSessionId: 'synthetic-package8-login-session' },
    fixture: { id: SYNTHETIC_PRIVATE_IGES_FIXTURE.id,
      sha256: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256, projectOwned: true,
      nonproprietary: true, customerData: false },
    limits: { ...LIMITS }, credentialReferences: [...CREDENTIAL_REFERENCES],
    environmentVariableReferences: [...ENVIRONMENT_VARIABLE_REFERENCES],
    calculatedMaximumCostMicros: 8_999_999, observedCostMicros: 0,
    providerRequestsAuthorized: true, runtimeActivationAuthorized: false };
  artifact.approvalIdDigest = approvalCommitment(artifact);
  return artifact;
}

function authorityEvidence(artifact) {
  const request = runtimeAuthorityRequest(artifact, ISSUER);
  return { schemaVersion: 1, verifierPrincipalCommitment: VERIFIER,
    issuerPrincipalCommitment: ISSUER, issuanceReference: request.issuanceReference,
    approvalCommitment: request.approvalCommitment,
    sourceReview: { schemaVersion: 1, baselineCommit: request.baselineCommit,
      baselineTree: request.baselineTree, executionHeadCommit: request.executionHeadCommit,
      executionHeadTree: request.executionHeadTree, clean: true, descendantOfBaseline: true,
      ancestryReceiptDigest: artifact.executionBinding.ancestryReceiptDigest },
    runtimeDeployment: { ...artifact.executionBinding.runtimeDeployment },
    ownerCommitment: request.ownerCommitment, sessionCommitment: request.sessionCommitment,
    windowIdDigest: request.windowIdDigest, windowStartUtc: request.windowStartUtc,
    windowEndUtc: request.windowEndUtc, limitsCommitment: request.limitsCommitment,
    authorityExpiresAtUtc: request.authorityExpiresAtUtc,
    sourceClosureSha256: request.sourceClosureSha256,
    sourceOwnershipSeparated: true, independentRuntimeIssuerCustodyBound: true };
}

function runtimeLedger(calls) {
  let state = null;
  return { sourceOnly: true, internalOnly: true, configured: false,
    reviewConfigured: true, independentlyOwned: true,
    applicationRetries: 0, transportRetries: 0, providerRetries: 0,
    async registerExact({ authorityEvidence: evidence, request }) {
      calls.push('authority:register');
      state = { authorityCommitment: hash(JSON.stringify(evidence)),
        requestCommitment: hash(JSON.stringify(request)), status: 'ACTIVE', generation: 1,
        consumed: false, revoked: false, closed: false, expired: false };
      return { ok: true, code: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED',
        authorityCommitment: state.authorityCommitment,
        requestCommitment: state.requestCommitment, generation: 1, replayed: false,
        sourceOnly: true, applicationRetries: 0, transportRetries: 0, providerRetries: 0 };
    },
    async consumeExact(locator) {
      calls.push('authority:consume');
      assert.equal(locator.authorityCommitment, state.authorityCommitment);
      state.status = 'CONSUMED'; state.consumed = true; state.generation += 1;
      return { ok: true, code: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED',
        authorityCommitment: state.authorityCommitment,
        requestCommitment: state.requestCommitment, generation: state.generation,
        replayed: false, sourceOnly: true, applicationRetries: 0,
        transportRetries: 0, providerRetries: 0 };
    },
    async revokeExact() { calls.push('authority:revoke'); state.status = 'REVOKED';
      state.revoked = true; return { ok: true,
        code: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED' }; },
    async closeExact() { calls.push('authority:close'); state.status = 'CLOSED';
      state.closed = true; return { ok: true,
        code: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED' }; },
    async readSanitized() { calls.push('authority:read'); return { ...state }; },
  };
}

function approvalIssuer(artifact, calls) {
  const request = approvalIssuanceVerificationRequest(artifact);
  const receipt = expectedApprovalIssuanceReceipt(artifact);
  const consumptionReceiptDigest = hash('package8-command-consumption');
  let status = 'active';
  return { sourceOnly: true, internalOnly: true, configured: false, reviewConfigured: true,
    enabled: false, mounted: false, sourceOwnershipSeparated: true,
    independentRuntimeIssuerCustodyBound: false,
    applicationRetries: 0, transportRetries: 0, providerRetries: 0,
    async verifyExact(value) { calls.push('approval:verify'); assert.deepEqual(value, request);
      return receipt; },
    async consumeExact(value) { calls.push('approval:consume'); assert.deepEqual(value, request);
      status = 'consumed'; return { ok: true, code: 'PACKAGE8_APPROVAL_CONSUMED',
        issuanceReference: artifact.issuanceReference,
        approvalCommitment: artifact.approvalIdDigest,
        status: 'ISSUED_CONSUMED_ONE_USE', generation: 2, consumptionReceiptDigest,
        applicationRetries: 0, transportRetries: 0, providerRetries: 0 }; },
    async revokeExact() { calls.push('approval:revoke'); status = 'revoked';
      return { ok: true, code: 'PACKAGE8_APPROVAL_REVOKED' }; },
    async closeExact() { calls.push('approval:close'); status = 'closed';
      return { ok: true, code: 'PACKAGE8_APPROVAL_CLOSED' }; },
    async readSanitized() { calls.push('approval:read'); return { schemaVersion: 1,
      issuanceReference: artifact.issuanceReference,
      approvalCommitment: artifact.approvalIdDigest, status: 'ISSUED_CLOSED', closed: true,
      expired: false, consumptionReceiptDigest, internalStatus: status }; },
  };
}

test('command atomically consumes runtime authority before any provider-capable qualification', async () => {
  const calls = [];
  const artifact = approval();
  const command = createCadPhase5Package8InternalQualificationCommand({
    reviewOnly: true, commandGate: COMMAND_REVIEW_GATE,
    verifierPrincipalCommitment: VERIFIER, issuerPrincipalDigest: ISSUER,
    authorityEvidence: authorityEvidence(artifact), approvalArtifact: artifact,
    runtimeAuthorityLedger: runtimeLedger(calls), approvalIssuer: approvalIssuer(artifact, calls),
    qualificationSources: { convex: {}, exactSession: {}, executionReceipt: {},
      lifecycleMetadata: {}, r2: {}, sandbox: {} },
    qualificationBindingFactory: () => ({ sourceOnly: true, reviewConfigured: true,
      enabled: false, mounted: false, routeMounted: false,
      requestBodyAdmissionAuthorized: false, runtimeActivationAllowed: false,
      async reviewOneUse() { calls.push('qualification:run'); return { ok: true,
        code: 'PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFIED_CLOSED', admissionClosed: true,
        conversionClosed: true, sessionRevoked: true, grantsRevoked: true,
        uncertainRecordsQuarantined: true, automaticRetries: 0 }; } }),
    now: () => NOW,
  });
  assert.equal(command.reviewConfigured, true);
  const result = await command.execute();
  assert.equal(result.ok, true);
  assert.equal(result.authorityConsumed, true);
  assert.equal(result.authorityClosed, true);
  assert.deepEqual(calls.slice(0, 5), ['authority:register', 'authority:consume',
    'approval:verify', 'approval:consume', 'qualification:run']);
  assert.equal(calls.at(-2), 'authority:close');
  assert.equal(calls.at(-1), 'authority:read');
  assert.equal((await command.execute()).code, 'PACKAGE8_INTERNAL_QUALIFICATION_COMMAND_DISABLED');
});

test('command remains disabled without exact evidence and exposes no route or env lookup', () => {
  const command = createCadPhase5Package8InternalQualificationCommand();
  assert.equal(command.reviewConfigured, false);
  assert.equal(command.mounted, false);
  assert.equal(command.routeMounted, false);
  const source = fs.readFileSync(path.join(root,
    'scripts/run-cad-phase5-package8-internal-qualification.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\(|httpAction|app\.(get|post|use)\(/);
  assert.match(source, /mode-0600|0o077/);
});
