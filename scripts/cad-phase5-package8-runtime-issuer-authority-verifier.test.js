const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  LIMITS: QUALIFICATION_LIMITS,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const {
  EXECUTION_BASELINE,
  expectedAncestryDigest,
} = require('../server/cadPhase5Package8OneUseCoordinator');
const {
  expectedRuntimeAuthorityReceipt,
  runtimeAuthorityRequest,
} = require('../server/cadPhase5Package8IndependentQualificationLauncher');
const {
  VERIFIER_REVIEW_GATE,
  VERIFIER_SOURCE_BINDING,
  createCadPhase5Package8RuntimeIssuerAuthorityVerifier,
  hash,
  requestFromEvidence,
} = require('../server/cadPhase5Package8RuntimeIssuerAuthorityVerifier');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-11T01:00:00.000Z');
const VERIFIER = hash('package8-runtime-authority-verifier');
const ISSUER = hash('package8-independent-issuer');
const OWNER = hash('package8-synthetic-owner');
const SESSION = hash('package8-synthetic-session');

function evidence(overrides = {}) {
  const sourceReview = {
    schemaVersion: 1,
    baselineCommit: EXECUTION_BASELINE.mergedMainCommit,
    baselineTree: EXECUTION_BASELINE.mergedMainTree,
    executionHeadCommit: VERIFIER_SOURCE_BINDING.reviewedMainCommit,
    executionHeadTree: VERIFIER_SOURCE_BINDING.reviewedMainTree,
    clean: true,
    descendantOfBaseline: true,
    ancestryReceiptDigest: '',
  };
  sourceReview.ancestryReceiptDigest = expectedAncestryDigest(sourceReview);
  const value = {
    schemaVersion: 1,
    verifierPrincipalCommitment: VERIFIER,
    issuerPrincipalCommitment: ISSUER,
    issuanceReference: 'package8-runtime-authority-once',
    approvalCommitment: hash('package8-runtime-authority-approval'),
    sourceReview,
    runtimeDeployment: {
      schemaVersion: 1,
      deploymentId: 'dpl_package8_development_runtime_exact',
      state: 'READY',
      environment: 'development',
      commit: VERIFIER_SOURCE_BINDING.reviewedMainCommit,
      tree: VERIFIER_SOURCE_BINDING.reviewedMainTree,
      receiptDigest: hash('package8-development-runtime-receipt'),
      identityMetadataSupported: true,
      functionSchemaEquivalenceClaimed: false,
    },
    ownerCommitment: OWNER,
    sessionCommitment: SESSION,
    windowIdDigest: hash('package8-runtime-authority-window'),
    windowStartUtc: '2026-10-11T00:59:00.000Z',
    windowEndUtc: '2026-10-11T01:09:00.000Z',
    limitsCommitment: hash(JSON.stringify(QUALIFICATION_LIMITS)),
    authorityExpiresAtUtc: '2026-10-11T01:09:00.000Z',
    sourceClosureSha256: VERIFIER_SOURCE_BINDING.independentIssuerClosureSha256,
    sourceOwnershipSeparated: true,
    independentRuntimeIssuerCustodyBound: true,
  };
  return Object.assign(value, overrides);
}

function ledger(state = { consumed: false, generation: 0 }, options = {}) {
  const calls = [];
  return {
    calls,
    state,
    port: {
      sourceOnly: true,
      internalOnly: true,
      configured: false,
      reviewConfigured: true,
      independentlyOwned: true,
      applicationRetries: 0,
      transportRetries: 0,
      providerRetries: 0,
      async consumeExact(command) {
        calls.push(command);
        if (options.unknown) throw Error('synthetic-private-message');
        if (state.consumed) return {
          ok: false,
          code: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED',
          authorityCommitment: command.authorityCommitment,
          requestCommitment: command.requestCommitment,
          generation: state.generation,
          replayed: true,
          sourceOnly: true,
          applicationRetries: 0,
          transportRetries: 0,
          providerRetries: 0,
        };
        state.consumed = true;
        state.generation += 1;
        return {
          ok: true,
          code: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED',
          authorityCommitment: command.authorityCommitment,
          requestCommitment: command.requestCommitment,
          generation: state.generation,
          replayed: false,
          sourceOnly: true,
          applicationRetries: 0,
          transportRetries: 0,
          providerRetries: 0,
        };
      },
    },
  };
}

function verifier(options = {}) {
  const authorityEvidence = options.authorityEvidence || evidence();
  const authorityLedger = options.authorityLedger || ledger().port;
  return createCadPhase5Package8RuntimeIssuerAuthorityVerifier({
    reviewOnly: true,
    testOnly: true,
    reviewGate: VERIFIER_REVIEW_GATE,
    verifierPrincipalCommitment: options.verifierPrincipalCommitment || VERIFIER,
    authorityEvidence,
    authorityLedger,
    now: options.now || (() => NOW),
  });
}

test('default verifier is closed and exposes only verifyExact as an operation', async () => {
  const value = createCadPhase5Package8RuntimeIssuerAuthorityVerifier();
  assert.equal(value.reviewConfigured, false);
  assert.equal(value.configured, false);
  assert.equal(value.enabled, false);
  assert.equal(value.mounted, false);
  assert.equal(value.runtimeActivationAllowed, false);
  assert.deepEqual(Object.entries(value)
    .filter(([, item]) => typeof item === 'function')
    .map(([name]) => name), ['verifyExact']);
  assert.equal(await value.verifyExact(requestFromEvidence(evidence())), null);
});

test('launcher request is accepted once and yields the same authority receipt', async () => {
  const authorityEvidence = evidence();
  const owner = { userId: 'synthetic-owner', shopId: 'synthetic-shop',
    uploadSessionId: 'synthetic-upload-session' };
  const session = { sessionDigest: hash('session-digest'),
    loginSessionId: 'synthetic-login-session' };
  authorityEvidence.ownerCommitment = hash([
    owner.userId, owner.shopId, owner.uploadSessionId,
  ].join('|'));
  authorityEvidence.sessionCommitment = hash([
    session.sessionDigest, session.loginSessionId,
  ].join('|'));
  const artifact = {
    issuanceReference: authorityEvidence.issuanceReference,
    approvalIdDigest: authorityEvidence.approvalCommitment,
    owner,
    session,
    window: {
      idDigest: authorityEvidence.windowIdDigest,
      startUtc: authorityEvidence.windowStartUtc,
      endUtc: authorityEvidence.windowEndUtc,
    },
    limits: { ...QUALIFICATION_LIMITS },
    authorityExpiresAtUtc: authorityEvidence.authorityExpiresAtUtc,
    executionBinding: {
      executionHeadCommit: authorityEvidence.sourceReview.executionHeadCommit,
      executionHeadTree: authorityEvidence.sourceReview.executionHeadTree,
      runtimeDeployment: {
        deploymentId: authorityEvidence.runtimeDeployment.deploymentId,
        receiptDigest: authorityEvidence.runtimeDeployment.receiptDigest,
      },
    },
  };
  const request = runtimeAuthorityRequest(artifact, ISSUER);
  assert.deepEqual(request, requestFromEvidence(authorityEvidence));
  const durable = ledger();
  const value = verifier({ authorityEvidence, authorityLedger: durable.port });
  assert.deepEqual(await value.verifyExact(request),
    expectedRuntimeAuthorityReceipt(request));
  assert.equal(await value.verifyExact(request), null);
  assert.equal(durable.calls.length, 1);
});

test('shared ledger refuses replay after verifier restart without retry', async () => {
  const shared = { consumed: false, generation: 0 };
  const firstLedger = ledger(shared);
  const first = verifier({ authorityLedger: firstLedger.port });
  const request = requestFromEvidence(evidence());
  assert.ok(await first.verifyExact(request));
  const restartedLedger = ledger(shared);
  const restarted = verifier({ authorityLedger: restartedLedger.port });
  assert.equal(await restarted.verifyExact(request), null);
  assert.equal(await restarted.verifyExact(request), null);
  assert.equal(restartedLedger.calls.length, 1);
});

test('ownership overlap prevents review configuration and ledger access', async () => {
  for (const overlap of [ISSUER, OWNER, SESSION]) {
    const value = evidence({ verifierPrincipalCommitment: overlap });
    const durable = ledger();
    const actual = verifier({
      authorityEvidence: value,
      authorityLedger: durable.port,
      verifierPrincipalCommitment: overlap,
    });
    assert.equal(actual.reviewConfigured, false);
    assert.equal(await actual.verifyExact(requestFromEvidence(evidence())), null);
    assert.equal(durable.calls.length, 0);
  }
});

test('stale windows and mismatched runtime receipts fail before consumption', async () => {
  const staleLedger = ledger();
  const stale = verifier({ authorityLedger: staleLedger.port,
    now: () => Date.parse('2026-10-11T01:10:00.000Z') });
  assert.equal(await stale.verifyExact(requestFromEvidence(evidence())), null);
  assert.equal(staleLedger.calls.length, 0);

  const mismatchLedger = ledger();
  const value = verifier({ authorityLedger: mismatchLedger.port });
  const request = { ...requestFromEvidence(evidence()),
    runtimeReceiptDigest: hash('wrong-runtime-receipt') };
  assert.equal(await value.verifyExact(request), null);
  assert.equal(mismatchLedger.calls.length, 0);
});

test('source drift and unsupported function-equivalence claims remain closed', () => {
  const drifted = evidence();
  drifted.sourceReview.executionHeadTree = '0'.repeat(40);
  const driftedVerifier = verifier({ authorityEvidence: drifted });
  assert.equal(driftedVerifier.reviewConfigured, false);

  const overclaimed = evidence();
  overclaimed.runtimeDeployment.functionSchemaEquivalenceClaimed = true;
  const overclaimedVerifier = verifier({ authorityEvidence: overclaimed });
  assert.equal(overclaimedVerifier.reviewConfigured, false);
});

test('unknown ledger outcome latches closed with a fixed error and zero retry', async () => {
  const durable = ledger({ consumed: false, generation: 0 }, { unknown: true });
  const value = verifier({ authorityLedger: durable.port });
  const request = requestFromEvidence(evidence());
  await assert.rejects(value.verifyExact(request), {
    message: 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_OUTCOME_UNKNOWN',
  });
  assert.equal(await value.verifyExact(request), null);
  assert.equal(durable.calls.length, 1);
});

test('verifier source has no runtime, credential, network or raw-log surface', () => {
  const source = fs.readFileSync(path.join(root,
    'server/cadPhase5Package8RuntimeIssuerAuthorityVerifier.js'), 'utf8');
  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|https?\.request|child_process|console\.|secretAccessKey|private key/i);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, runtime), 'utf8'),
      /cadPhase5Package8RuntimeIssuerAuthorityVerifier/);
  }
});
