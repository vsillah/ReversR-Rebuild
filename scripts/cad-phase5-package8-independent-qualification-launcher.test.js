const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
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
  LAUNCH_REVIEW_GATE,
  createCadPhase5Package8IndependentQualificationLauncher,
  expectedRuntimeAuthorityReceipt,
} = require('../server/cadPhase5Package8IndependentQualificationLauncher');
const { SYNTHETIC_PRIVATE_IGES_FIXTURE }
  = require('../server/cadPhase5SyntheticPrivatePathQualification');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-11T00:20:00.000Z');
const hash = value => createHash('sha256').update(value).digest('hex');
const OWNER = Object.freeze({
  userId: 'synthetic-package8-user',
  shopId: 'synthetic-package8-shop',
  uploadSessionId: 'synthetic-package8-upload-session',
});
const SESSION = Object.freeze({
  sessionDigest: 'c'.repeat(64),
  loginSessionId: 'synthetic-package8-login-session',
});
const WINDOW = Object.freeze({
  schemaVersion: 1,
  idDigest: 'a'.repeat(64),
  startUtc: '2026-10-11T00:19:00.000Z',
  endUtc: '2026-10-11T00:29:00.000Z',
  activated: true,
});

function executionBinding() {
  const value = {
    schemaVersion: 1,
    baseline: { ...EXECUTION_BASELINE },
    executionHeadCommit: '1'.repeat(40),
    executionHeadTree: '2'.repeat(40),
    clean: true,
    descendantOfBaseline: true,
    ancestryReceiptDigest: '',
    runtimeDeployment: {
      schemaVersion: 1,
      deploymentId: 'dpl_package8_development_exact',
      state: 'READY',
      environment: 'development',
      commit: '1'.repeat(40),
      tree: '2'.repeat(40),
      functionEquivalence: 'VERIFIED_EXACT',
      receiptDigest: '',
    },
  };
  value.ancestryReceiptDigest = expectedAncestryDigest(value);
  value.runtimeDeployment.receiptDigest = expectedRuntimeReceiptDigest(
    value.runtimeDeployment,
  );
  return value;
}

function approval(overrides = {}) {
  const artifact = {
    schemaVersion: 1,
    kind: 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL',
    status: 'ISSUED_ONE_USE_DEVELOPMENT_QUALIFICATION',
    issuanceReference: 'package8-independent-launch-once',
    approvalIdDigest: '0'.repeat(64),
    issuedAtUtc: new Date(NOW).toISOString(),
    authorityExpiresAtUtc: WINDOW.endUtc,
    window: { ...WINDOW },
    binding: { ...QUALIFICATION_BINDING },
    executionBinding: executionBinding(),
    owner: { ...OWNER },
    session: { ...SESSION },
    fixture: {
      id: SYNTHETIC_PRIVATE_IGES_FIXTURE.id,
      sha256: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
      projectOwned: true,
      nonproprietary: true,
      customerData: false,
    },
    limits: { ...LIMITS },
    credentialReferences: [...CREDENTIAL_REFERENCES],
    environmentVariableReferences: [...ENVIRONMENT_VARIABLE_REFERENCES],
    calculatedMaximumCostMicros: 8_999_999,
    observedCostMicros: 0,
    providerRequestsAuthorized: true,
    runtimeActivationAuthorized: false,
  };
  Object.assign(artifact, overrides);
  artifact.approvalIdDigest = approvalCommitment(artifact);
  return artifact;
}

function fixture(options = {}) {
  const calls = [];
  const state = options.state || {
    status: 'active',
    generation: 1,
    consumptionReceiptDigest: null,
  };
  const issuer = {
    sourceOnly: true,
    internalOnly: true,
    configured: false,
    reviewConfigured: true,
    enabled: false,
    mounted: false,
    sourceOwnershipSeparated: true,
    independentRuntimeIssuerCustodyBound: false,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
    async verifyExact(request) {
      calls.push('issuer:verify');
      if (state.status !== 'active') return null;
      return expectedApprovalIssuanceReceipt(options.artifact || approval());
    },
    async consumeExact(request) {
      calls.push('issuer:consume');
      assert.deepEqual(request,
        approvalIssuanceVerificationRequest(options.artifact || approval()));
      if (options.consumeUnknown) throw Error('unknown');
      if (state.status !== 'active') return { ok: false,
        code: 'PACKAGE8_APPROVAL_REPLAYED' };
      state.status = 'consumed';
      state.generation += 1;
      state.consumptionReceiptDigest = hash(`consumed:${request.approvalCommitment}`);
      return {
        ok: true,
        code: 'PACKAGE8_APPROVAL_CONSUMED',
        issuanceReference: request.issuanceReference,
        approvalCommitment: request.approvalCommitment,
        status: 'ISSUED_CONSUMED_ONE_USE',
        generation: state.generation,
        consumptionReceiptDigest: state.consumptionReceiptDigest,
        applicationRetries: 0,
        transportRetries: 0,
        providerRetries: 0,
      };
    },
    async revokeExact() {
      calls.push('issuer:revoke');
      state.status = 'revoked';
      state.generation += 1;
      return { ok: true, code: 'PACKAGE8_APPROVAL_REVOKED' };
    },
    async closeExact() {
      calls.push('issuer:close');
      if (options.closeUnknown) throw Error('unknown');
      state.status = 'closed';
      state.generation += 1;
      return { ok: true, code: 'PACKAGE8_APPROVAL_CLOSED' };
    },
    async readSanitized() {
      calls.push('issuer:read');
      if (options.readUnknown) throw Error('unknown');
      const artifact = options.artifact || approval();
      return {
        schemaVersion: 1,
        issuanceReference: artifact.issuanceReference,
        approvalCommitment: artifact.approvalIdDigest,
        status: state.status === 'closed' ? 'ISSUED_CLOSED' : 'ISSUED_REVOKED',
        closed: state.status === 'closed',
        expired: false,
        consumptionReceiptDigest: state.consumptionReceiptDigest,
      };
    },
  };
  const issuerAuthorityVerifier = {
    sourceOnly: true,
    configured: false,
    reviewConfigured: true,
    sourceOwnershipSeparated: true,
    independentRuntimeIssuerCustodyBound: true,
    async verifyExact(request) {
      calls.push('authority:verify');
      if (options.authorityUnknown) return null;
      return expectedRuntimeAuthorityReceipt(request);
    },
  };
  const qualificationBindingFactory = ({ sources }) => ({
    sourceOnly: true,
    reviewConfigured: true,
    enabled: false,
    mounted: false,
    routeMounted: false,
    requestBodyAdmissionAuthorized: false,
    runtimeActivationAllowed: false,
    async reviewOneUse({ approvalArtifact }) {
      calls.push('qualification:verify-consumption');
      await sources.approvalIssuance.verifyExact(
        approvalIssuanceVerificationRequest(approvalArtifact),
      );
      calls.push('qualification:first-provider-eligible-step');
      if (options.qualificationThrows) throw Error('unknown');
      if (options.qualificationFails) return {
        ok: false,
        code: 'PACKAGE8_EXECUTION_QUARANTINED',
        automaticRetries: 0,
      };
      return {
        ok: true,
        code: 'PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFIED_CLOSED',
        admissionClosed: true,
        conversionClosed: true,
        sessionRevoked: true,
        grantsRevoked: true,
        uncertainRecordsQuarantined: true,
        automaticRetries: 0,
        lifecycleSnapshotDigest: 'e'.repeat(64),
      };
    },
  });
  const launcher = createCadPhase5Package8IndependentQualificationLauncher({
    reviewOnly: true,
    testOnly: true,
    launchGate: LAUNCH_REVIEW_GATE,
    issuerPrincipalDigest: 'f'.repeat(64),
    issuerAuthorityVerifier,
    approvalIssuer: issuer,
    qualificationSources: {
      convex: {},
      exactSession: {},
      executionReceipt: {},
      lifecycleMetadata: {},
      r2: {},
      sandbox: {},
    },
    qualificationBindingFactory,
    now: () => NOW,
  });
  return { calls, issuer, launcher, state };
}

test('default launcher is disabled, unmounted and incapable of provider work', async () => {
  const launcher = createCadPhase5Package8IndependentQualificationLauncher();
  const result = await launcher.runOneUse({ approvalArtifact: approval() });
  assert.equal(result.code, 'PACKAGE8_INDEPENDENT_QUALIFICATION_LAUNCHER_DISABLED');
  assert.equal(launcher.reviewConfigured, false);
  assert.equal(launcher.enabled, false);
  assert.equal(launcher.mounted, false);
  assert.equal(launcher.routeMounted, false);
  assert.equal(launcher.providerDispatchEnabled, false);
  assert.equal(launcher.actualApprovalIssued, false);
});

test('authority, verification and atomic consumption precede provider eligibility', async () => {
  const f = fixture();
  const result = await f.launcher.runOneUse({ approvalArtifact: approval() });
  assert.equal(result.code, 'PACKAGE8_INDEPENDENT_QUALIFICATION_QUALIFIED_CLOSED');
  assert.equal(result.approvalConsumed, true);
  assert.equal(result.approvalClosed, true);
  assert.equal(result.closeFirstConfirmed, true);
  assert.deepEqual(f.calls, [
    'authority:verify',
    'issuer:verify',
    'issuer:consume',
    'qualification:verify-consumption',
    'qualification:first-provider-eligible-step',
    'issuer:close',
    'issuer:read',
  ]);
  assert.deepEqual(result.counts, {
    authorityVerifications: 1,
    issuerVerifications: 1,
    issuerConsumptions: 1,
    cachedConsumptionProofReads: 1,
    qualificationRuns: 1,
    issuerRevocations: 0,
    issuerCloses: 1,
    sanitizedReads: 1,
  });
});

test('independent authority mismatch stops before issuer and qualification calls', async () => {
  const f = fixture({ authorityUnknown: true });
  const result = await f.launcher.runOneUse({ approvalArtifact: approval() });
  assert.equal(result.code, 'PACKAGE8_ISSUER_AUTHORITY_UNKNOWN');
  assert.deepEqual(f.calls, ['authority:verify']);
});

test('issuer principal cannot equal owner or session commitment', async () => {
  const artifact = approval();
  const ownerDigest = hash([
    artifact.owner.userId,
    artifact.owner.shopId,
    artifact.owner.uploadSessionId,
  ].join('|'));
  const f = fixture({ artifact });
  const launcher = createCadPhase5Package8IndependentQualificationLauncher({
    reviewOnly: true,
    testOnly: true,
    launchGate: LAUNCH_REVIEW_GATE,
    issuerPrincipalDigest: ownerDigest,
    issuerAuthorityVerifier: {
      sourceOnly: true,
      configured: false,
      reviewConfigured: true,
      sourceOwnershipSeparated: true,
      independentRuntimeIssuerCustodyBound: true,
      async verifyExact() { throw Error('forbidden'); },
    },
    approvalIssuer: f.issuer,
    qualificationSources: {
      convex: {}, exactSession: {}, executionReceipt: {}, lifecycleMetadata: {},
      r2: {}, sandbox: {},
    },
    qualificationBindingFactory: () => { throw Error('forbidden'); },
    now: () => NOW,
  });
  const result = await launcher.runOneUse({ approvalArtifact: artifact });
  assert.equal(result.code, 'PACKAGE8_ISSUER_OWNERSHIP_NOT_INDEPENDENT');
  assert.deepEqual(f.calls, []);
});

test('uncertain consumption latches closed with no qualification or mutation retry', async () => {
  const f = fixture({ consumeUnknown: true });
  const first = await f.launcher.runOneUse({ approvalArtifact: approval() });
  const second = await f.launcher.runOneUse({ approvalArtifact: approval() });
  assert.equal(first.code, 'PACKAGE8_APPROVAL_CONSUMPTION_UNKNOWN');
  assert.equal(second.code, 'PACKAGE8_INDEPENDENT_QUALIFICATION_LAUNCHER_DISABLED');
  assert.deepEqual(f.calls, ['authority:verify', 'issuer:verify', 'issuer:consume']);
});

test('failed or thrown qualification revokes and closes consumed authority once', async () => {
  for (const option of [{ qualificationFails: true }, { qualificationThrows: true }]) {
    const f = fixture(option);
    const result = await f.launcher.runOneUse({ approvalArtifact: approval() });
    assert.equal(result.code, 'PACKAGE8_QUALIFICATION_CLOSED_AFTER_FAILURE');
    assert.equal(result.approvalConsumed, true);
    assert.equal(result.approvalClosed, true);
    assert.equal(result.revocationAttempted, true);
    assert.equal(f.calls.filter(call => call === 'issuer:revoke').length, 1);
    assert.equal(f.calls.filter(call => call === 'issuer:close').length, 1);
    assert.equal(f.calls.filter(call => call === 'issuer:consume').length, 1);
  }
});

test('terminal mutation or read uncertainty stops without repeating a mutation', async () => {
  for (const option of [{ closeUnknown: true }, { readUnknown: true }]) {
    const f = fixture(option);
    const result = await f.launcher.runOneUse({ approvalArtifact: approval() });
    assert.equal(result.code, option.closeUnknown
      ? 'PACKAGE8_QUALIFICATION_TERMINAL_UNKNOWN'
      : 'PACKAGE8_APPROVAL_TERMINAL_EVIDENCE_UNKNOWN');
    assert.equal(f.calls.filter(call => call === 'issuer:consume').length, 1);
    assert.equal(f.calls.filter(call => call === 'issuer:close').length, 1);
    assert.equal(f.calls.filter(call => call === 'issuer:revoke').length, 0);
  }
});

test('restart and replay cannot transfer a consumed approval to another launcher', async () => {
  const state = { status: 'active', generation: 1, consumptionReceiptDigest: null };
  const first = fixture({ state });
  assert.equal((await first.launcher.runOneUse({ approvalArtifact: approval() })).ok, true);
  const restarted = fixture({ state });
  const replay = await restarted.launcher.runOneUse({ approvalArtifact: approval() });
  assert.equal(replay.code, 'PACKAGE8_APPROVAL_ISSUANCE_UNKNOWN');
  assert.equal(restarted.calls.includes('issuer:consume'), false);
  assert.equal(restarted.calls.includes('qualification:first-provider-eligible-step'), false);
});

test('launcher source has no runtime, credential, network or raw-log surface', () => {
  const source = fs.readFileSync(path.join(root,
    'server/cadPhase5Package8IndependentQualificationLauncher.js'), 'utf8');
  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|https?\.request|child_process|console\.|secretAccessKey|private key/i);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, runtime), 'utf8'),
      /cadPhase5Package8IndependentQualificationLauncher/);
  }
});
