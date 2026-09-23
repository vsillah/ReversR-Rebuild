// Fixed source-only acceptance requirements. No live collection or promotion mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, RUNTIME_SOURCES, checkCompletion } = require('./cad-auth-live-evidence-prereq-completion-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-evidence-acceptance.json';
const SOURCES = Object.freeze([PARENT,
  'docs/cad-auth-live-evidence-acceptance.md',
  'scripts/cad-auth-live-evidence-acceptance-checker.js',
  'scripts/cad-auth-live-evidence-acceptance.test.js',
  'docs/cad-auth-live-evidence-plan.json',
  'docs/cad-auth-sealed-setup.json',
  'docs/cad-auth-sealed-evidence-card.json',
  'docs/cad-production-auth-verifier-acceptance.json',
  'docs/cad-auth-sealed-setup-stop-runbook.md']);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const APPROVAL_TEMPLATE = 'Approve one read-only synthetic CAD Auth evidence collection for acceptance packet cad-auth-live-evidence-acceptance-v1, reviewed packet SHA-256 <packetSha256>, sealed card SHA-256 <sealedCardSha256>, candidate <candidateCommit>, immutable deployment <deploymentId>, schedule SHA-256 <scheduleSha256>, restricted cohort <cohortRef>, custodian <custodianRef>, independent reviewer <reviewerRef>, during <startsAtUtc> through <expiresAtUtc>. Only the sealed observations and ceilings are authorized. No setup changes, upload sessions, request-body reads, activation, retries or second run.';
const requirements = {
  providerPolicy: [
    'Review concrete readAuthenticatedSession/readAuthorization implementation and deployed SDK versions; disabled adapters and local doubles are not provider evidence.',
    'Bind cryptographic issuer, audience, algorithm, signing-key rotation and cache invalidation policies; signed token validity alone cannot prove exact live login.',
    'Use request-local bearer only; reject cookies, mixed transport, service credentials and caller identity fallback.',
    'Read fresh exact session owner/method and shop membership/permission on resolve and refresh; preserve permission-loss refresh denial downstream.',
    'Prove nonblocking I/O, cancellation and an operation deadline no greater than 800 ms; reserve every HTTP request including discovery/key metadata; disable SDK retries.'
  ],
  routeBodyInstallation: [
    'Review installed earliest-boundary instrumentation across api/[...path].js, server/index.js and POST /api/cad/user-import before middleware/provider calls.',
    'Observe body getter, read/resume/pipe/iterator, data/readable subscription and parser attempts without consuming the stream; stop before the original operation.',
    'Require zero attempted body access, parser calls and application bytes on denied/malformed/cancelled/timed-out paths; null means unobserved, never zero.',
    'Independently review platform pre-handler buffering; unknown hosting boundary blocks that claim. Bodyless requests do not establish nonempty-stream safety.',
    'Keep BODY_ADMISSION_AUTHORIZED false. Login bearer candidate tests do not prove the upload-session route positive path; missing integration remains blocked without issuance.'
  ],
  immutableTarget: [
    'Independently bind immutable deployment ID/URL, candidate commit, provider deployment reference and exact adapter/collector/validator/instrumentation source digests.',
    'Compare installed versions and source map against reviewed sources; mutable aliases and historical success receipts cannot substitute.',
    'Any target/source drift invalidates review and requires a new packet, sealed card and fresh approval.'
  ],
  syntheticCohort: [
    'Use only restricted internal cohort mapping U1/L1, U1/L2, U2/L3 with S1 permitted and S2 unauthorized; verify synthetic ownership without public account identifiers.',
    'Require separately authorized setup receipts, same-login correlated before/after revocation, expiry/deletion and permission-loss observations on resolve and refresh.',
    'Deny same-user different-login and different-user substitution. A preprovisioned dead credential proves current denial only.',
    'Pre-review teardown plan and separate authority; post-run teardown/deletion receipts remain post-run acceptance requirements, not impossible pre-run evidence.',
    'No account creation, sign-in, revocation, membership change, teardown or real-user enrollment is authorized by collection approval.'
  ],
  custodyReviewer: [
    'Assign distinct custodian and independent reviewer and a restricted user-owned store; approve seven-day retention and separately authorized deletion disposition.',
    'Sanitize at capture; bind case/path/phase, evidence type, expected and observed result, source/deployment, UTC timing, monotonic duration and sanitized digest.',
    'Keep lifecycle mapping and permitted restricted references outside repository; never capture tokens, cookies, raw headers, secrets, request bodies, private CAD or raw exceptions.',
    'Label local replay, injected fault, inspection and provider observation distinctly. Source success cannot fill live receipts.',
    'Review every production verifier acceptance category separately. Missing, failed or unknown observations block acceptance; no automatic public projection.'
  ],
  lateGrantObserver: [
    'Review installed observer and durable consumed-run ledger before collection; reserve the single attempt before dispatch.',
    'On stop invalidate unused authority, cancel pending reads and prevent further dispatch/grant publication; observe pending settlement within reviewed schedule and budget.',
    'Record sanitized partial receipts separately from independent disposition. Unverified settlement is UNKNOWN and consumes the run.',
    'No post-stop diagnostics, resumed attempt, second run or retries; local zero counters do not prove provider cancellation or absence of side effects.'
  ],
  stopRollback: [
    'Stop on missing prerequisite, source/target drift, expired or unopened window, cohort mismatch, sensitive capture, body access, parser attempt, issuance/write or unexpected authority.',
    'Stop on deadline/cancellation failure, case failure, interruption, unknown outcome, budget exhaustion or retry request; mark run consumed.',
    'Rollback means stop and discard ephemeral collector bindings; retain only sanitized partial evidence in approved custody.',
    'Provider mutation, environment toggles, credential remediation, deployment rollback, external reporting and resource/billing changes require separate authority.'
  ],
  collectionGate: [
    'Review concrete provider, collector and receipt validator, installed route/observer, immutable target, restricted cohort and custody bindings before presenting a sealed card.',
    'Bind exact schedule and limits digests: at most 160 logical operations, 320 reader invocations, 640 provider HTTP requests and zero retries; these are ceilings, not permission for unscheduled calls.',
    'Bind a fresh explicit UTC window and exact human approval receipt to the sealed card digest; placeholders, old phrases and generic proceed cannot authorize execution.',
    'Keep setup approval, collection approval, evidence acceptance, runtime activation and upload-body admission separate; this source checker has no accepted or executable mode.'
  ]
};
function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkCompletion(parent, { readSource }).ok) throw Error('INVALID_PARENT');
  const setup = JSON.parse(readSource('docs/cad-auth-sealed-setup.json'));
  return {
    schemaVersion: 1, packet: 'cad-auth-live-evidence-acceptance-v1', sourceOnly: true,
    status: 'ACCEPTANCE_REQUIREMENTS_BOUND_LIVE_REVIEW_PENDING',
    parent: { packet: parent.packet, mergeCommit: 'b826e3c7572c914235e552dee2d76623ed107d13', sha256: sha(readSource(PARENT)) },
    claims: { ...parent.claims, evidenceAccepted: false },
    card: { ...parent.card },
    categories: Object.fromEntries(Object.entries(requirements).map(([id, requiredEvidence]) => [id, {
      requiredEvidence, status: 'NOT_COLLECTED', implementationRef: null, observationRef: null,
      sanitizedEvidenceSha256: null, reviewerRef: null, dispositionRef: null, accepted: false
    }])),
    reviewSequence: ['SOURCE_REQUIREMENTS_REVIEW', 'SEPARATE_IMPLEMENTATION_AND_SETUP_REVIEW',
      'PRE_COLLECTION_BINDINGS_REVIEW', 'FRESH_SEALED_CARD_AND_EXACT_HUMAN_APPROVAL',
      'SEPARATELY_AUTHORIZED_COLLECTION', 'POST_COLLECTION_INDEPENDENT_ACCEPTANCE',
      'SEPARATE_RUNTIME_AND_BODY_ADMISSION_GATES'],
    schedule: { sourceScheduleSha256: setup.proposedSchedule.scheduleSha256,
      sourceLimitsSha256: setup.proposedSchedule.limitsSha256,
      logicalOperationCeiling: 160, readerInvocationCeiling: 320, providerHttpCeiling: 640,
      requestBodyBytesToSend: 0, authorizedRuns: 0, retriesAllowed: false, reviewed: false },
    futureApproval: { template: APPROVAL_TEMPLATE, actionable: false,
      packetSha256: null, sealedCardSha256: null, candidateCommit: null, deploymentId: null,
      scheduleSha256: null, cohortRef: null, custodianRef: null, reviewerRef: null,
      startsAtUtc: null, expiresAtUtc: null, exactApprovalReceiptRef: null,
      historicalApprovalReusable: false },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]))
  };
}
function plainData(value, seen = new Set(), depth = 0) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || depth > 32 || seen.has(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) return false;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return false;
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !Object.hasOwn(d, 'value')) return false;
    if (!d.enumerable && !(Array.isArray(value) && key === 'length')) return false;
    if (!plainData(d.value, seen, depth + 1)) return false;
  }
  seen.delete(value);
  return true;
}

function checkAcceptance(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ok, sourceAcceptanceRequirementsValid: ok, evidenceAccepted: false,
    livePrerequisitesSatisfied: false, liveCollectionAuthorized: false, executable: false,
    runtimeActivationAuthorized: false, uploadSessionIssuanceEnabled: false,
    bodyAdmissionAuthorized: false, commercialReadiness: false,
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_ACCEPTANCE_PACKET'] };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkAcceptance(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, executable: false, code: 'SOURCE_ACCEPTANCE_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, RUNTIME_SOURCES, expectedPacket, checkAcceptance };
