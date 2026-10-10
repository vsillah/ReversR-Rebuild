const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  ISSUER_BASELINE,
  ISSUER_LIMITS,
  REVIEW_GATE,
  expectedSourceReviewAuthorityReceipt,
  expectedAncestryDigest,
  expectedRuntimeReceiptDigest,
  hash,
  same,
  validIssueCommand,
  verificationReceipt,
} = require('../server/cadPhase5Package8ApprovalIssuanceContract');
const { FUNCTIONS, createCadPhase5Package8ApprovalIssuerAdapter }
  = require('../server/cadPhase5Package8ApprovalIssuerAdapter');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-11T00:05:00.000Z');
const ISSUER = hash('package8-independent-approval-control');
const OWNER = hash('synthetic-owner-commitment');
const SESSION = hash('synthetic-session-commitment');
const CLOSED = Object.freeze({ sourceOnly: true, internalOnly: true, routeMounted: false,
  runtimeActivationAllowed: false, sessionIssuanceEnabled: false,
  requestBodyAdmissionAuthorized: false, providerDispatchEnabled: false,
  applicationRetries: 0, transportRetries: 0, providerRetries: 0,
  logicalOperationCalls: 1, externalSideEffectsInsideTransaction: false,
  platformOccReexecutionPossible: true, atMostOneCommittedTransition: true });

function command(overrides = {}) {
  const runtime = { schemaVersion: 1, deploymentId: 'dpl_package8_exact_development',
    state: 'READY', environment: 'development', commit: '1'.repeat(40), tree: '2'.repeat(40),
    functionEquivalence: 'VERIFIED_EXACT', receiptDigest: '' };
  runtime.receiptDigest = expectedRuntimeReceiptDigest(runtime);
  const request = {
    schemaVersion: 1,
    issuanceReference: 'package8-independent-issuance-1',
    approvalCommitment: hash('approval-artifact-1'),
    baselineCommit: ISSUER_BASELINE.reviewedMainCommit,
    baselineTree: ISSUER_BASELINE.reviewedMainTree,
    executionHeadCommit: runtime.commit,
    executionHeadTree: runtime.tree,
    runtimeDeploymentId: runtime.deploymentId,
    runtimeReceiptDigest: runtime.receiptDigest,
    ownerCommitment: OWNER,
    sessionCommitment: SESSION,
    windowIdDigest: hash('package8-window-1'),
    windowStartUtc: new Date(NOW - 60_000).toISOString(),
    windowEndUtc: new Date(NOW + 9 * 60_000).toISOString(),
    limitsCommitment: hash(JSON.stringify(ISSUER_LIMITS)),
    authorityExpiresAtUtc: new Date(NOW + 9 * 60_000).toISOString(),
  };
  const review = { schemaVersion: 1,
    baselineCommit: ISSUER_BASELINE.reviewedMainCommit,
    baselineTree: ISSUER_BASELINE.reviewedMainTree,
    executionHeadCommit: runtime.commit,
    executionHeadTree: runtime.tree,
    clean: true,
    descendantOfBaseline: true,
    ancestryReceiptDigest: '',
    productionEvidenceDeploymentId: ISSUER_BASELINE.productionEvidenceDeploymentId,
    preparationSha256: ISSUER_BASELINE.preparationSha256,
    unissuedDraftSha256: ISSUER_BASELINE.unissuedDraftSha256 };
  review.ancestryReceiptDigest = expectedAncestryDigest(review);
  const value = { schemaVersion: 1, issuerPrincipalDigest: ISSUER, request,
    sourceReview: review, runtimeDeployment: runtime, limits: { ...ISSUER_LIMITS },
    calculatedMaximumCostMicros: 8_999_999, issuedAtUtc: new Date(NOW).toISOString() };
  for (const [key, item] of Object.entries(overrides)) {
    if (key === 'request') Object.assign(value.request, item);
    else if (key === 'sourceReview') Object.assign(value.sourceReview, item);
    else if (key === 'runtimeDeployment') Object.assign(value.runtimeDeployment, item);
    else value[key] = item;
  }
  return value;
}

function backend(options = {}) {
  const state = options.state || { records: new Map(), calls: [], now: NOW };
  const base = (accepted, code, extra = {}) => ({ ...CLOSED, accepted, code, ...extra });
  const exact = (record, input) => record
    && record.issuerPrincipalDigest === input.issuerPrincipalDigest
    && record.approvalCommitment === input.request?.approvalCommitment
    && same(record.request, input.request);
  const readRecord = input => state.records.get(input.request?.issuanceReference
    || input.issuanceReference);

  async function invoke(reference, input) {
    const operation = reference.slice(4);
    state.calls.push(operation);
    if (options.throwOn === operation) throw Error('outcome unknown');
    const record = readRecord(input);
    if (operation === 'issue') {
      if (!validIssueCommand(input.command)
        || input.issuerPrincipalDigest !== input.command.issuerPrincipalDigest) {
        return base(false, 'PACKAGE8_APPROVAL_DENIED');
      }
      const prior = state.records.get(input.command.request.issuanceReference);
      if (prior) return base(false, prior.approvalCommitment
        === input.command.request.approvalCommitment
        ? 'PACKAGE8_APPROVAL_REPLAYED' : 'PACKAGE8_APPROVAL_CONFLICT');
      const receipt = verificationReceipt(input.command.request);
      state.records.set(input.command.request.issuanceReference, {
        issuerPrincipalDigest: input.issuerPrincipalDigest,
        approvalCommitment: input.command.request.approvalCommitment,
        request: structuredClone(input.command.request), receiptDigest: receipt.receiptDigest,
        status: 'active', generation: 1, issuedAtUtc: input.command.issuedAtUtc,
        expiresAt: Date.parse(input.command.request.authorityExpiresAtUtc),
      });
      return base(true, 'PACKAGE8_APPROVAL_ISSUED', {
        issuanceReference: input.command.request.issuanceReference,
        approvalCommitment: input.command.request.approvalCommitment,
        status: 'ISSUED_ACTIVE_ONE_USE', generation: 1, receiptDigest: receipt.receiptDigest,
      });
    }
    if (operation === 'verify') {
      if (!exact(record, input)) return base(false, 'PACKAGE8_APPROVAL_DENIED');
      if (state.now >= record.expiresAt) return base(false, 'PACKAGE8_APPROVAL_EXPIRED');
      if (record.status !== 'active') return base(false, record.status === 'consumed'
        ? 'PACKAGE8_APPROVAL_REPLAYED' : 'PACKAGE8_APPROVAL_DENIED');
      return base(true, 'PACKAGE8_APPROVAL_VERIFIED', {
        receipt: verificationReceipt(input.request),
      });
    }
    if (operation === 'consume') {
      if (!exact(record, input)) return base(false, 'PACKAGE8_APPROVAL_DENIED');
      if (state.now >= record.expiresAt) return base(false, 'PACKAGE8_APPROVAL_EXPIRED');
      if (record.status !== 'active') return base(false, record.status === 'consumed'
        ? 'PACKAGE8_APPROVAL_REPLAYED' : 'PACKAGE8_APPROVAL_DENIED');
      record.status = 'consumed'; record.generation += 1;
      record.consumptionReceiptDigest = hash([record.receiptDigest,
        input.request.issuanceReference, input.request.approvalCommitment,
        String(state.now), String(record.generation), 'ISSUED_CONSUMED_ONE_USE'].join('|'));
      return base(true, 'PACKAGE8_APPROVAL_CONSUMED', {
        issuanceReference: input.request.issuanceReference,
        approvalCommitment: input.request.approvalCommitment,
        status: 'ISSUED_CONSUMED_ONE_USE', generation: record.generation,
        consumptionReceiptDigest: record.consumptionReceiptDigest,
      });
    }
    if (operation === 'revoke' || operation === 'close') {
      if (!record || record.issuerPrincipalDigest !== input.issuerPrincipalDigest
        || record.approvalCommitment !== input.approvalCommitment) {
        return base(false, 'PACKAGE8_APPROVAL_DENIED');
      }
      if (record.status === operation + 'd'
        || (operation === 'close' && record.status === 'closed')) {
        return base(false, 'PACKAGE8_APPROVAL_REPLAYED');
      }
      record.status = operation === 'revoke' ? 'revoked' : 'closed';
      record.generation += 1;
      return base(true, operation === 'revoke'
        ? 'PACKAGE8_APPROVAL_REVOKED' : 'PACKAGE8_APPROVAL_CLOSED', {
        issuanceReference: input.issuanceReference,
        approvalCommitment: input.approvalCommitment,
        status: operation === 'revoke' ? 'ISSUED_REVOKED' : 'ISSUED_CLOSED',
        generation: record.generation,
      });
    }
    if (operation === 'readSanitized') {
      if (!record || record.issuerPrincipalDigest !== input.issuerPrincipalDigest
        || record.approvalCommitment !== input.approvalCommitment) {
        return base(false, 'PACKAGE8_APPROVAL_DENIED');
      }
      const expired = state.now >= record.expiresAt;
      return base(true, 'PACKAGE8_APPROVAL_VERIFIED', { evidence: {
        schemaVersion: 1, issuanceReference: input.issuanceReference,
        approvalCommitment: input.approvalCommitment,
        status: expired && record.status === 'active' ? 'ISSUED_EXPIRED'
          : `ISSUED_${record.status.toUpperCase()}`,
        generation: record.generation, issuedAtUtc: record.issuedAtUtc,
        authorityExpiresAtUtc: new Date(record.expiresAt).toISOString(),
        windowIdDigest: record.request.windowIdDigest,
        runtimeDeploymentId: record.request.runtimeDeploymentId,
        receiptDigest: record.receiptDigest,
        consumptionReceiptDigest: record.consumptionReceiptDigest || null,
        revoked: record.status === 'revoked', consumed: record.status === 'consumed',
        closed: record.status === 'closed', expired,
      } });
    }
    throw Error('unknown operation');
  }
  return { state, runMutation: invoke, runQuery: invoke };
}

function fixture(options = {}) {
  const durable = backend(options);
  const authorityCalls = [];
  const issuerAuthorityReceiptVerifier = options.omitAuthorityVerifier ? undefined : {
    sourceOnly: true, configured: false, reviewConfigured: true,
    sourceOwnershipSeparated: true, independentRuntimeIssuerCustodyBound: false,
    async verifySourceReview(request) {
      authorityCalls.push(request);
      if (options.authorityReceiptUnknown) throw Error('authority receipt unknown');
      if (options.authorityReceiptMismatch) return { verified: false };
      return expectedSourceReviewAuthorityReceipt(request);
    },
  };
  const references = Object.fromEntries(Object.keys(FUNCTIONS)
    .map(name => [name, `ref:${name}`]));
  const adapter = createCadPhase5Package8ApprovalIssuerAdapter({ reviewOnly: true,
    reviewGate: REVIEW_GATE, issuerPrincipalDigest: ISSUER,
    issuerAuthorityReceiptVerifier, references,
    runQuery: durable.runQuery, runMutation: durable.runMutation });
  return { ...durable, adapter, authorityCalls };
}

test('default state is disabled, internal-only, unmounted and incapable of issuance', async () => {
  const adapter = createCadPhase5Package8ApprovalIssuerAdapter();
  assert.equal(adapter.reviewConfigured, false);
  for (const flag of ['configured', 'enabled', 'mounted', 'routeMounted',
    'runtimeActivationAllowed', 'sessionIssuanceEnabled', 'requestBodyAdmissionAuthorized',
    'providerDispatchEnabled', 'approvalArtifactIssued']) assert.equal(adapter[flag], false, flag);
  await assert.rejects(adapter.issueExact(command()), /ISSUER_DISABLED/);
});

test('exact source, runtime, owner, session, window and cost commitments issue and verify', async () => {
  const f = fixture();
  const value = command();
  assert.equal(validIssueCommand(value), true);
  const issued = await f.adapter.issueExact(value);
  assert.equal(issued.ok, true); assert.equal(issued.code, 'PACKAGE8_APPROVAL_ISSUED');
  const verified = await f.adapter.verifyExact(value.request);
  assert.deepEqual(verified, verificationReceipt(value.request));
  assert.deepEqual(f.state.calls, ['issue', 'verify']);
  assert.equal(f.authorityCalls.length, 2);
  assert.equal(f.adapter.status().applicationRetries, 0);
  assert.equal(f.adapter.status().transportRetries, 0);
  assert.equal(f.adapter.status().providerRetries, 0);
  assert.equal(f.adapter.status().platformOccReexecutionPossible, true);
  assert.equal(f.adapter.status().atMostOneCommittedTransition, true);
  assert.equal(f.adapter.status().externalSideEffectsInsideTransaction, false);
});

test('atomic one-use consume refuses concurrent replay and survives adapter restart', async () => {
  const f = fixture(); const value = command(); await f.adapter.issueExact(value);
  const [first, second] = await Promise.all([
    f.adapter.consumeExact(value.request), f.adapter.consumeExact(value.request),
  ]);
  assert.equal([first, second].filter(result => result.ok).length, 1);
  assert.equal([first, second].filter(result => !result.ok
    && result.code === 'PACKAGE8_APPROVAL_REPLAYED').length, 1);
  const restarted = fixture({ state: f.state });
  assert.equal(await restarted.adapter.verifyExact(value.request), null);
  const replay = await restarted.adapter.consumeExact(value.request);
  assert.equal(replay.ok, false); assert.equal(replay.code, 'PACKAGE8_APPROVAL_REPLAYED');
  assert.equal(f.state.records.get(value.request.issuanceReference).generation, 2);
});

test('revocation and close are terminal, monotonic and replay-refusing', async () => {
  const revoked = fixture(); const first = command(); await revoked.adapter.issueExact(first);
  const reason = hash('revoked-before-use');
  assert.equal((await revoked.adapter.revokeExact({ issuanceReference: first.request.issuanceReference,
    approvalCommitment: first.request.approvalCommitment, reasonDigest: reason })).ok, true);
  assert.equal(await revoked.adapter.verifyExact(first.request), null);
  assert.equal((await revoked.adapter.revokeExact({ issuanceReference: first.request.issuanceReference,
    approvalCommitment: first.request.approvalCommitment, reasonDigest: reason })).code,
  'PACKAGE8_APPROVAL_REPLAYED');

  const closed = fixture(); const second = command(); await closed.adapter.issueExact(second);
  const closeReason = hash('close-first-rollback');
  const result = await closed.adapter.closeExact({ issuanceReference: second.request.issuanceReference,
    approvalCommitment: second.request.approvalCommitment, reasonDigest: closeReason });
  assert.equal(result.code, 'PACKAGE8_APPROVAL_CLOSED');
  assert.equal(await closed.adapter.verifyExact(second.request), null);
  assert.equal((await closed.adapter.consumeExact(second.request)).ok, false);
});

test('expiry rejects verification and consumption without application retry', async () => {
  const f = fixture(); const value = command(); await f.adapter.issueExact(value);
  f.state.now = Date.parse(value.request.authorityExpiresAtUtc);
  assert.equal(await f.adapter.verifyExact(value.request), null);
  const consumed = await f.adapter.consumeExact(value.request);
  assert.equal(consumed.ok, false); assert.equal(consumed.code, 'PACKAGE8_APPROVAL_EXPIRED');
  assert.equal(f.adapter.status().applicationRetries, 0);
  assert.equal(f.adapter.status().platformOccReexecutionPossible, true);
});

test('source, target, ownership, session and exclusive cost widening fail before a call', async () => {
  for (const value of [
    command({ sourceReview: { baselineTree: '0'.repeat(40) } }),
    command({ runtimeDeployment: { environment: 'production' } }),
    command({ request: { ownerCommitment: ISSUER } }),
    command({ request: { sessionCommitment: OWNER } }),
    command({ calculatedMaximumCostMicros: 9_000_000 }),
  ]) {
    const f = fixture();
    await assert.rejects(f.adapter.issueExact(value), /ISSUE_INVALID/);
    assert.deepEqual(f.state.calls, []);
  }
});

test('source ownership separation blocks cross-commitment reads without claiming runtime custody', async () => {
  const f = fixture(); const value = command(); await f.adapter.issueExact(value);
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(name => [name, `ref:${name}`]));
  const sourceReceiptVerifier = {
    sourceOnly: true, configured: false, reviewConfigured: true,
    sourceOwnershipSeparated: true, independentRuntimeIssuerCustodyBound: false,
    verifySourceReview: async request => expectedSourceReviewAuthorityReceipt(request),
  };
  const other = createCadPhase5Package8ApprovalIssuerAdapter({ reviewOnly: true,
    reviewGate: REVIEW_GATE, issuerPrincipalDigest: hash('other-issuer'),
    issuerAuthorityReceiptVerifier: sourceReceiptVerifier, references,
    runQuery: f.runQuery, runMutation: f.runMutation });
  assert.equal(await other.verifyExact(value.request), null);
  assert.equal(await other.readSanitized({ issuanceReference: value.request.issuanceReference,
    approvalCommitment: value.request.approvalCommitment }), null);
  const evidence = await f.adapter.readSanitized({
    issuanceReference: value.request.issuanceReference,
    approvalCommitment: value.request.approvalCommitment,
  });
  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /userId|shopId|loginSessionId|uploadSessionId|token|secret/i);
  assert.equal(serialized.includes(OWNER), false);
  assert.equal(serialized.includes(SESSION), false);
  assert.equal(f.adapter.sourceOwnershipSeparated, true);
  assert.equal(f.adapter.independentRuntimeIssuerCustodyBound, false);
  assert.equal(f.adapter.runtimeAuthorityReceiptVerifierConfigured, false);
});

test('a caller-supplied issuer digest alone never configures or reaches the durable ledger', async () => {
  const omitted = fixture({ omitAuthorityVerifier: true });
  assert.equal(omitted.adapter.reviewConfigured, false);
  await assert.rejects(omitted.adapter.issueExact(command()), /ISSUER_DISABLED/);
  assert.deepEqual(omitted.state.calls, []);

  const mismatched = fixture({ authorityReceiptMismatch: true });
  await assert.rejects(mismatched.adapter.issueExact(command()), /AUTHORITY_RECEIPT_INVALID/);
  assert.equal(mismatched.authorityCalls.length, 1);
  assert.deepEqual(mismatched.state.calls, []);
  assert.equal(mismatched.adapter.independentRuntimeIssuerCustodyBound, false);
});

test('unknown mutation stops after one logical call without application retry', async () => {
  const f = fixture({ throwOn: 'issue' });
  await assert.rejects(f.adapter.issueExact(command()), /outcome unknown/);
  assert.equal(f.adapter.status().stopped, true);
  assert.equal(f.adapter.status().remoteAttempts, 1);
  await assert.rejects(f.adapter.issueExact(command()), /ISSUER_DISABLED/);
  assert.equal(f.adapter.status().remoteAttempts, 1);
  assert.equal(f.adapter.status().applicationRetries, 0);
  assert.equal(f.adapter.status().transportRetries, 0);
  assert.equal(f.adapter.status().providerRetries, 0);
});

test('issuer stays absent from runtime surfaces and source contains no provider or environment access', () => {
  const issuerSources = [
    'server/cadPhase5Package8ApprovalIssuanceContract.js',
    'server/cadPhase5Package8ApprovalIssuerAdapter.js',
    'convex/cadPhase5Package8ApprovalIssuance.ts',
  ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(issuerSources,
    /process\.env|fetch\s*\(|https?\.request|CAD_R2_|VERCEL_OIDC|secretAccessKey|private key/i);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, runtime), 'utf8'),
      /cadPhase5Package8ApprovalIssuer|cadPhase5Package8ApprovalIssuance/);
  }
});
