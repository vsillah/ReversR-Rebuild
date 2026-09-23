// Fixed local sources only; no evidence collection or runtime acceptance mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { checkAcceptance } = require('./cad-production-auth-verifier-acceptance-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-production-verifier-evidence-template.json';
const CASES = Object.freeze({
  provider: ['verified-user-context', 'service-credential-is-not-login', 'sdk-issuer-audience-algorithms'],
  identity: ['missing-owner', 'deleted-session', 'owner-mismatch', 'supplied-principal', 'opaque-login-reference'],
  exactLogin: ['two-same-user-logins', 'cross-login-refresh', 'cross-user-refresh', 'method-substitution', 'concurrent-credential-isolation'],
  authorization: ['selected-shop-membership', 'removed-membership', 'permission-loss', 'shop-substitution', 'fresh-resolve-and-refresh'],
  expiry: ['exact-expiry', 'expiry-during-read', 'minimum-expiry', 'invalid-timestamp', 'clock-rollback', 'cached-query-liveness'],
  lifecycle: ['logout', 'revocation', 'session-deletion', 'replacement-login', 'provider-cache-invalidation'],
  tokens: ['forged-signature', 'unsigned-token', 'disallowed-algorithm', 'wrong-issuer', 'wrong-audience', 'expired-token', 'not-yet-valid-token', 'malformed-token', 'oversized-token', 'missing-token', 'duplicate-authorization', 'unavailable-verification'],
  cancellation: ['abort-before-read', 'abort-between-reads', 'abort-during-authorization', 'hung-reader', 'late-result', 'no-late-side-effects'],
  transport: ['actual-router-bearer-normalization', 'cookie-rejected', 'mixed-transport-rejected', 'middleware-order'],
  body: ['denied-zero-bytes', 'malformed-zero-bytes', 'cancelled-zero-bytes', 'timed-out-zero-bytes', 'closed-after-valid-verifier'],
  isolation: ['request-local-credentials', 'no-envelope-credentials', 'no-binding-credentials', 'no-log-or-evidence-credentials', 'sanitized-provider-failure'],
  review: ['exact-candidate-deployment-test-version', 'sanitized-digest-reference', 'utc-execution-time', 'reviewer-disposition'],
});
const SOURCES = Object.freeze([
  'offline/cad-convex/productionVerifierCandidate.js',
  'scripts/cad-production-verifier-candidate.test.js',
  'scripts/cad-production-verifier-evidence-checker.js',
  'scripts/cad-production-verifier-evidence.test.js',
  'docs/cad-production-auth-verifier-acceptance.json',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
function expectedEvidence(readSource = read) {
  const acceptance = JSON.parse(readSource('docs/cad-production-auth-verifier-acceptance.json'));
  if (!checkAcceptance(acceptance, { readSource }).ok
    || !isDeepStrictEqual(Object.keys(CASES), Object.keys(acceptance.evidence))) throw Error('SOURCE_INVALID');
  return {
    schemaVersion: 1, packet: 'cad-production-verifier-evidence-template',
    baseCommit: 'b885f1f9a569b5bfa5627858cbb1542342b7da43',
    sourceOnly: true, status: 'PENDING_SEPARATE_PROVIDER_EVIDENCE_GATE',
    claims: acceptance.claims,
    activation: acceptance.activation,
    localSynthetic: { scope: 'SOURCE_BEHAVIOR_ONLY', testCommand: 'node --test scripts/cad-production-verifier-candidate.test.js',
      provesProviderAuth: false, provesActualRouteBodyOrdering: false, storedRunReceipt: null },
    futureProviderEvidence: Object.fromEntries(Object.entries(CASES).map(([category, cases]) => [category, {
      required: acceptance.evidence[category].required,
      status: 'NOT_COLLECTED', accepted: false,
      cases: cases.map(id => ({ id, paths: ['resolve', 'refresh'],
        expected: 'REQUIRES_SEPARATELY_REVIEWED_CASE_PLAN', observed: null,
        candidateCommit: null, deploymentRef: null, testVersion: null, executedAtUtc: null,
        evidenceRef: null, evidenceSha256: null, reviewerDisposition: null,
        status: 'NOT_COLLECTED' })),
    }])),
    bodyOrdering: { requiredUploadBytesBeforeAcceptance: 0, observedUploadBytesBeforeAcceptance: null,
      actualRouteInstrumented: false, status: 'NOT_COLLECTED' },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, createHash('sha256').update(readSource(file)).digest('hex')])),
  };
}
function checkEvidence(packet, { readSource = read } = {}) {
  let valid = false;
  try { valid = isDeepStrictEqual(packet, expectedEvidence(readSource)); } catch { /* Fixed diagnostics only. */ }
  return { ok: valid, sourceTemplateValid: valid, productionVerifierAccepted: false,
    uploadSessionIssuanceEnabled: false, bodyAdmissionAuthorized: false,
    runtimeActivationAuthorized: false, providerEvidenceCollected: false,
    problems: valid ? [] : ['INVALID_SOURCE_ONLY_EVIDENCE_TEMPLATE'] };
}
if (require.main === module) {
  let packet;
  try { packet = JSON.parse(read(PACKET)); } catch { /* Closed result. */ }
  const result = checkEvidence(packet);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { CASES, SOURCES, PACKET, expectedEvidence, checkEvidence };
