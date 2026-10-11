const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  LIMITS,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const {
  EXECUTION_BASELINE,
  expectedAncestryDigest,
  expectedRuntimeReceiptDigest,
} = require('../server/cadPhase5Package8OneUseCoordinator');
const {
  FUNCTIONS,
  REVIEW_GATE,
  createCadPhase5Package8RuntimeIssuerAuthorityAdapter,
} = require('../server/cadPhase5Package8RuntimeIssuerAuthorityAdapter');
const {
  VERIFIER_SOURCE_BINDING,
  hash,
  requestFromEvidence,
} = require('../server/cadPhase5Package8RuntimeIssuerAuthorityVerifier');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-11T02:00:00.000Z');
const VERIFIER = hash('runtime-authority-verifier');
const ISSUER = hash('runtime-authority-issuer');

function evidence() {
  const sourceReview = { schemaVersion: 1,
    baselineCommit: EXECUTION_BASELINE.mergedMainCommit,
    baselineTree: EXECUTION_BASELINE.mergedMainTree,
    executionHeadCommit: VERIFIER_SOURCE_BINDING.runtimeInstallRootCommit,
    executionHeadTree: VERIFIER_SOURCE_BINDING.runtimeInstallRootTree,
    clean: true, descendantOfBaseline: true, ancestryReceiptDigest: '' };
  sourceReview.ancestryReceiptDigest = expectedAncestryDigest(sourceReview);
  const runtimeDeployment = { schemaVersion: 1,
    deploymentId: 'dpl_package8_development_runtime', state: 'READY',
    environment: 'development', commit: sourceReview.executionHeadCommit,
    tree: sourceReview.executionHeadTree, identityMetadataSupported: true,
    functionSchemaEquivalenceClaimed: false, receiptDigest: '' };
  runtimeDeployment.receiptDigest = expectedRuntimeReceiptDigest(runtimeDeployment);
  return { schemaVersion: 1, verifierPrincipalCommitment: VERIFIER,
    issuerPrincipalCommitment: ISSUER, issuanceReference: 'authority-once',
    approvalCommitment: hash('approval-once'), sourceReview, runtimeDeployment,
    ownerCommitment: hash('owner'), sessionCommitment: hash('session'),
    windowIdDigest: hash('window'),
    windowStartUtc: new Date(NOW - 60_000).toISOString(),
    windowEndUtc: new Date(NOW + 9 * 60_000).toISOString(),
    limitsCommitment: hash(JSON.stringify(LIMITS)),
    authorityExpiresAtUtc: new Date(NOW + 9 * 60_000).toISOString(),
    sourceClosureSha256: VERIFIER_SOURCE_BINDING.independentIssuerClosureSha256,
    sourceOwnershipSeparated: true, independentRuntimeIssuerCustodyBound: true };
}

function backend(options = {}) {
  const state = options.state || { record: null, calls: [] };
  const base = (accepted, code, extra = {}) => ({ sourceOnly: true, internalOnly: true,
    routeMounted: false, runtimeActivationAllowed: false,
    requestBodyAdmissionAuthorized: false, providerDispatchEnabled: false,
    applicationRetries: 0, transportRetries: 0, providerRetries: 0,
    logicalOperationCalls: 1, externalSideEffectsInsideTransaction: false,
    platformOccReexecutionPossible: true, atMostOneCommittedTransition: true,
    accepted, code, ...extra });
  async function invoke(reference, input) {
    const operation = reference.slice(4);
    state.calls.push(operation);
    if (options.throwOn === operation) throw Error('private provider output');
    if (operation === 'register') {
      if (state.record) return base(false,
        state.record.authorityCommitment === input.authorityCommitment
          ? 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED'
          : 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONFLICT');
      state.record = { ...input, issuerPrincipalCommitment: input.request.issuerPrincipalCommitment,
        issuanceReference: input.request.issuanceReference,
        approvalCommitment: input.request.approvalCommitment, status: 'active', generation: 1,
        expiresAt: Date.parse(input.request.authorityExpiresAtUtc) };
      return base(true, 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED', {
        authorityCommitment: input.authorityCommitment,
        requestCommitment: input.requestCommitment, generation: 1, replayed: false });
    }
    const record = state.record;
    if (!record || record.verifierPrincipalCommitment !== input.verifierPrincipalCommitment
      || record.issuerPrincipalCommitment !== input.issuerPrincipalCommitment
      || record.authorityCommitment !== input.authorityCommitment
      || record.requestCommitment !== input.requestCommitment) {
      return base(false, 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED');
    }
    if (operation === 'consume') {
      if (record.status !== 'active') {
        return base(false, 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED');
      }
      record.status = 'consumed'; record.generation += 1; record.consumed = true;
      return base(true, 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED', {
        authorityCommitment: record.authorityCommitment,
        requestCommitment: record.requestCommitment,
        generation: record.generation, replayed: false });
    }
    if (operation === 'revoke' || operation === 'close') {
      if (record.status === 'closed' || record.status === operation + 'd') {
        return base(false, 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED');
      }
      record.status = operation === 'revoke' ? 'revoked' : 'closed';
      record.generation += 1;
      return base(true, operation === 'revoke'
        ? 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED'
        : 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED', {
        authorityCommitment: record.authorityCommitment,
        requestCommitment: record.requestCommitment,
        generation: record.generation, replayed: false });
    }
    const expired = NOW >= record.expiresAt;
    return base(true, 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIED', { evidence: {
      schemaVersion: 1, authorityCommitment: record.authorityCommitment,
      requestCommitment: record.requestCommitment,
      issuanceReference: record.issuanceReference,
      approvalCommitment: record.approvalCommitment,
      status: expired && record.status === 'active' ? 'EXPIRED' : record.status.toUpperCase(),
      generation: record.generation,
      authorityExpiresAtUtc: new Date(record.expiresAt).toISOString(),
      consumed: record.consumed === true, revoked: record.status === 'revoked',
      closed: record.status === 'closed', expired } });
  }
  return { state, runMutation: invoke, runQuery: invoke };
}

function fixture(options = {}) {
  const transport = backend(options);
  const references = Object.fromEntries(Object.keys(FUNCTIONS)
    .map(name => [name, `ref:${name}`]));
  const adapter = createCadPhase5Package8RuntimeIssuerAuthorityAdapter({
    reviewOnly: true, reviewGate: REVIEW_GATE,
    verifierPrincipalCommitment: VERIFIER, references,
    runQuery: transport.runQuery, runMutation: transport.runMutation,
  });
  return { ...transport, adapter };
}

test('adapter is disabled by default and exposes no runtime authority', async () => {
  const adapter = createCadPhase5Package8RuntimeIssuerAuthorityAdapter();
  assert.equal(adapter.reviewConfigured, false);
  assert.equal(adapter.configured, false);
  assert.equal(adapter.mounted, false);
  await assert.rejects(adapter.consumeExact({}), /INPUT_INVALID/);
});

test('durable authority registers once, consumes atomically and survives adapter restart', async () => {
  const value = evidence();
  const request = requestFromEvidence(value);
  const f = fixture();
  const registered = await f.adapter.registerExact({ authorityEvidence: value, request,
    issuedAtUtc: new Date(NOW).toISOString() });
  assert.equal(registered.ok, true);
  const locator = { issuerPrincipalCommitment: ISSUER,
    authorityCommitment: registered.authorityCommitment,
    requestCommitment: registered.requestCommitment };
  const [first, second] = await Promise.all([
    f.adapter.consumeExact(locator), f.adapter.consumeExact(locator),
  ]);
  assert.equal([first, second].filter(result => result.ok).length, 1);
  assert.equal([first, second].filter(result => result.code
    === 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED').length, 1);
  const restarted = fixture({ state: f.state });
  const replay = await restarted.adapter.consumeExact(locator);
  assert.equal(replay.code, 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED');
  const closed = await restarted.adapter.closeExact({ ...locator,
    reasonDigest: hash('terminal-close') });
  assert.equal(closed.ok, true);
  const terminal = await restarted.adapter.readSanitized(locator);
  assert.equal(terminal.status, 'CLOSED');
  assert.equal(terminal.consumed, true);
});

test('uncertain mutation stops the adapter without retry or raw error leakage', async () => {
  const value = evidence();
  const f = fixture({ throwOn: 'register' });
  await assert.rejects(f.adapter.registerExact({ authorityEvidence: value,
    request: requestFromEvidence(value), issuedAtUtc: new Date(NOW).toISOString() }),
  /OUTCOME_UNKNOWN/);
  assert.equal(f.state.calls.length, 1);
  assert.equal(f.adapter.status().stopped, true);
  assert.equal(JSON.stringify(f.adapter.status()).includes('private provider output'), false);
});

test('Convex ledger is internal-only, indexed and not reachable from HTTP or app routes', () => {
  const schema = fs.readFileSync(path.join(root, 'convex/schema.ts'), 'utf8');
  const source = fs.readFileSync(path.join(root,
    'convex/cadPhase5Package8RuntimeIssuerAuthority.ts'), 'utf8');
  assert.match(schema, /cadPackage8RuntimeIssuerAuthorities: defineTable/);
  for (const index of ['by_authorityCommitment', 'by_requestCommitment',
    'by_issuanceReference', 'by_status_and_authorityExpiresAtMs']) {
    assert.match(schema, new RegExp(`\\.index\\('${index}'`));
  }
  assert.doesNotMatch(source,
    /export const \w+\s*=\s*(query|mutation|action)\s*\(/);
  assert.equal(/process\.env|fetch\(|httpAction|setTimeout/.test(source), false);
  const routed = ['server/index.js', 'convex/http.ts'].filter(file => fs.existsSync(path.join(root, file)))
    .map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(routed, /cadPhase5Package8RuntimeIssuerAuthority/);
});
