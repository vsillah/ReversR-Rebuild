// Offline source contract only. Reads a fixed allowlist of repository sources.
// A valid packet is pending evidence, never an acceptance or activation decision.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-production-auth-verifier-acceptance.json';
const BASE_COMMIT = 'a2613c956ac6bd20637ffda6d020f128f065119b';
const SOURCES = Object.freeze([
  'server/cadProductionSessionVerifierBinding.js',
  'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js',
  'server/uploadSessionStore.js',
  'server/cadUserUploadRouter.js',
  'convex/librarySession.ts',
  'convex/cadUploadSessionGateway.ts',
]);
const REQUIREMENTS = Object.freeze({
  provider: 'Identify the concrete verifier source commit, provider and SDK versions, trusted issuer/audience and allowed algorithms by sanitized references. Prove cryptographic verification in the authenticated user context; gateway service credentials and caller claims cannot supply login authority. Development-only password assumptions are not production evidence.',
  identity: 'Derive user and exact login session IDs from the provider-verified context, point-read the live session and existing owner, and prove ownership matches. Reject missing/deleted owners, missing sessions, cross-user substitutions, supplied principals and opaque loginSessionRef mappings.',
  exactLogin: 'Use two simultaneous logins for one user. Resolve each independently, then attempt to refresh login A binding using login B: deny despite matching user/shop. Also reject cross-user and auth-method substitution and concurrent request credential crossover.',
  authorization: 'Freshly read current selected-shop membership and CAD permission on resolve and every refresh. Match user, login session, auth method and shop; shop selection is not authority. Membership removal, shop substitution and permission loss must deny new grants and invalidate refresh authority without stale cached success.',
  expiry: 'Deny expired login or authorization grants before and after asynchronous reads, including exact expiry boundaries and expiry during a read. Use the minimum expiry; reject invalid timestamps and clock rollback. Cached query results must not extend liveness.',
  lifecycle: 'After logout, revocation, session deletion or replacement, repeat resolve and refresh with the old credential and deny. A replacement login cannot inherit an old upload-session binding. Record sanitized before/after observations and provider invalidation semantics, including token/session cache behavior.',
  tokens: 'Reject forged signatures, unsigned/disallowed algorithms, wrong issuer/audience, expired or not-yet-valid tokens, malformed/truncated/oversized credentials, missing credentials, duplicate or conflicting Authorization headers, and unavailable provider/key verification. Return only sanitized denial; no credential or private exception logging.',
  cancellation: 'Prove bounded completion with an explicit operation deadline and propagated AbortSignal: abort before reads, between reads, during authorization, and after delayed completion. Hung or cancellation-ignoring dependencies must never yield late authority or side effects. The binding alone supplies no timer; direct callers need a reviewed deadline owner and service composition needs bounded-operation evidence.',
  transport: 'Accept only an unambiguous bearer header on the reviewed request path. Reject cookies and mixed cookie/bearer headers. Inspect the actual router/header normalization and middleware order, not only a fabricated request. Cookie support remains rejected pending separate origin, CSRF, SameSite and credential-scope review; a caller transport label cannot authorize cookies.',
  body: 'Instrument the actual user-upload route and middleware for getters, stream listeners, parsing and byte reads. Denied, malformed, cancelled and timed-out requests must read zero upload-body bytes before session acceptance. This packet keeps body admission closed even after a valid verifier result; separate body-admission approval is still required. Service-envelope JSON is not proof of upload-body admission.',
  isolation: 'Prove credentials stay request-local and never enter gateway envelopes, stored bindings, evidence artifacts or logs. Provider failures produce fail-closed sanitized errors; no fallback to client profiles, development verifier assumptions or service-envelope refreshAuthorization as login proof.',
  review: 'For every case provide sanitized expected/observed outcome, exact candidate commit/deployment, test version, UTC execution time, evidence digest/reference and reviewer disposition in a separately authorized evidence packet. Synthetic doubles and historical smoke establish source behavior only. No live collection is authorized here.',
});
const FALSE_FLAGS = Object.freeze([
  'productionVerifierAccepted', 'uploadSessionIssuanceEnabled', 'bodyAdmissionAuthorized',
  'runtimeValuesInstalled', 'runtimeActivationAuthorized', 'liveProviderTestsAuthorized',
  'providerEnvResourceBillingChanges', 'secretReads', 'deploymentAuthorized',
  'conversionAuthorized', 'sandboxDispatchAuthorized', 'privateCadAuthorized',
  'realUserCommercializationAuthorized', 'externalMessagesAuthorized',
  'secondRunOrRetryAuthorized', 'commercialReadinessClaim',
]);
function expectedPacket(readSource) {
  return {
    schemaVersion: 1,
    packet: 'cad-production-auth-verifier-acceptance',
    baseCommit: BASE_COMMIT,
    sourceOnly: true,
    status: 'PENDING_PRODUCTION_VERIFIER_EVIDENCE',
    claims: Object.fromEntries(FALSE_FLAGS.map(key => [key, false])),
    candidate: { providerRef: null, verifierCommit: null, deploymentRef: null, reviewer: null, acceptanceReceipt: null },
    transport: { bearer: 'REQUIRES_PROVIDER_EVIDENCE', cookie: 'REJECTED_SEPARATE_CSRF_ORIGIN_REVIEW_REQUIRED' },
    activation: { separateApprovalRequired: true, historicalWindowReusable: false,
      historicalApprovalReusable: false, approvalRef: null, startsAtUtc: null, expiresAtUtc: null },
    evidence: Object.fromEntries(Object.entries(REQUIREMENTS).map(([id, required]) => [id,
      { required, status: 'NOT_COLLECTED', accepted: false, receipt: null }])),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file,
      createHash('sha256').update(readSource(file)).digest('hex')])),
  };
}
function checkAcceptance(packet, { readSource = file => fs.readFileSync(path.join(ROOT, file)) } = {}) {
  const problems = [];
  try {
    // Strict closed schema rejects extra/nested authority claims as well as omissions.
    // Compare each top-level field without echoing untrusted packet values.
    const expected = expectedPacket(readSource);
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) problems.push('invalid packet');
    else {
      if (!isDeepStrictEqual(Object.keys(packet).sort(), Object.keys(expected).sort())) problems.push('unexpected packet fields');
      for (const key of Object.keys(expected)) {
        if (!isDeepStrictEqual(packet[key], expected[key])) problems.push(`invalid source-only field: ${key}`);
      }
    }
  } catch { problems.push('required source unavailable'); }
  return { ok: problems.length === 0, sourceContractValid: problems.length === 0,
    productionVerifierAccepted: false, uploadSessionIssuanceEnabled: false,
    bodyAdmissionAuthorized: false, runtimeActivationAuthorized: false, problems };
}
if (require.main === module) {
  let result;
  try { result = checkAcceptance(JSON.parse(fs.readFileSync(path.join(ROOT, PACKET), 'utf8'))); }
  catch { result = checkAcceptance(null); }
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { checkAcceptance, PACKET, SOURCES };
