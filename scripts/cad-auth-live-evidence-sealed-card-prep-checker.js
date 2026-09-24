// Offline preparation only. No execution or acceptance mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, RUNTIME_SOURCES, checkAcceptance } = require('./cad-auth-live-evidence-acceptance-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-evidence-sealed-card-prep.json';
const SOURCES = [PARENT, 'docs/cad-auth-live-evidence-sealed-card-prep.md',
  'scripts/cad-auth-live-evidence-sealed-card-prep-checker.js',
  'scripts/cad-auth-live-evidence-sealed-card-prep.test.js',
  'docs/cad-auth-sealed-setup-stop-runbook.md'];
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Stable JSON encoding: recursively sorted object keys, array order preserved, UTF-8, no newline.
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function plainData(value, seen = new Set(), depth = 0) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || depth > 32 || seen.has(value)) return false;
  if (![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(value))) return false;
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
function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkAcceptance(parent, { readSource }).ok) throw Error('INVALID_PARENT');
  const plan = JSON.parse(readSource('docs/cad-auth-live-evidence-plan.json'));
  const payload = {
    schemaVersion: 1, packet: 'cad-auth-live-evidence-sealed-card-prep-v1', sourceOnly: true,
    status: 'PREPARED_NON_EXECUTABLE_PENDING_REVIEW',
    acceptancePacket: parent.packet, acceptancePacketSha256: sha(readSource(PARENT)),
    candidateCommit: '0d5ae30935f399c7f3e08b7fd05b8f12dc10489d',
    deployment: {
      id: 'dpl_S2p5mUfjMnCHy9etD23Un4gNT4iy',
      url: 'https://reversr-bg0p4jccq-vsillahs-projects.vercel.app',
      productionAlias: 'https://reversr.vercel.app', target: 'production', status: 'READY',
      commit: '0d5ae30935f399c7f3e08b7fd05b8f12dc10489d',
      observedAtUtc: '2026-09-23T20:33:00Z',
      metadataProvenance: ['GitHub deployment 6623661776 and success status',
        'Vercel immutable deployment and production alias metadata; captain independently confirmed'],
      installedProviderOrInstrumentationVerified: false,
      currentAliasMustBeRecheckedBeforeCollection: true
    },
    schedule: { scheduleSha256: parent.schedule.sourceScheduleSha256,
      limitsSha256: parent.schedule.sourceLimitsSha256, limits: plan.limits,
      authorizedRuns: 0, reviewed: false },
    proposedReferences: {
      cohortRef: 'rrb-ref:cad-auth-synthetic-cohort-v1-proposed',
      custodianRef: 'rrb-ref:cad-auth-evidence-custodian-captain-proposed',
      reviewerRef: 'rrb-ref:cad-auth-evidence-independent-reviewer-proposed',
      restrictedStoreRef: 'rrb-ref:cad-auth-restricted-evidence-store-proposed',
      status: 'PROPOSED_PENDING_VERIFICATION', receiptRef: null,
      assignmentsAccepted: false, syntheticOwnershipVerified: false,
      independentReviewerVerified: false, retentionDays: 7,
      publicAccountIdentifiersAllowed: false
    },
    window: { startsAtUtc: '2026-09-24T06:00:00Z', expiresAtUtc: '2026-09-24T06:30:00Z',
      status: 'PROPOSED_NOT_APPROVED', durationMinutes: 30,
      automaticRolloverAllowed: false, freshApprovalRequired: true },
    stopRollback: { runbookRef: 'docs/cad-auth-sealed-setup-stop-runbook.md',
      runbookSha256: sha(readSource('docs/cad-auth-sealed-setup-stop-runbook.md')),
      stopConditions: [...plan.stopConditions, 'BUDGET_EXHAUSTION'],
      stopConsumesRun: true, unknownConsumesRun: true, retryAllowed: false,
      rollback: 'Stop, cancel pending reads, invalidate unused authority and discard ephemeral bindings; retain only sanitized partial evidence.',
      observerReceiptRef: null, durableRunLedgerReceiptRef: null, reviewed: false,
      providerOrDeploymentRollbackAuthorized: false },
    claims: { ...parent.claims },
    requiredBeforeSeparateApproval: [
      'Captain reviews this exact payload and all source bindings.',
      'Verify proposed cohort, custody, independent reviewer, restricted store and setup receipts.',
      'Review concrete provider implementation, installed route instrumentation, platform buffering, observer and durable consumed-run ledger.',
      'Recheck immutable target and source digests, schedule, limits and window freshness.',
      'Record separate exact user approval; any changed binding requires a regenerated packet and fresh review.'
    ],
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]))
  };
  const sealedCardSha256 = sha(canonical(payload));
  const values = { packetSha256: payload.acceptancePacketSha256, sealedCardSha256,
    candidateCommit: payload.candidateCommit, deploymentId: payload.deployment.id,
    scheduleSha256: payload.schedule.scheduleSha256, ...payload.proposedReferences, ...payload.window };
  const exactPhrase = parent.futureApproval.template.replace(/<([A-Za-z0-9]+)>/g, (_, key) => {
    if (typeof values[key] !== 'string') throw Error('UNBOUND_PHRASE');
    return values[key];
  }) + ' Limits SHA-256 ' + payload.schedule.limitsSha256 + '.';
  if (/<[^>]+>/.test(exactPhrase)) throw Error('UNRESOLVED_PHRASE_PLACEHOLDER');
  return { payload, seal: { algorithm: 'SHA-256', encoding: 'RECURSIVE_SORTED_JSON_UTF8_NO_NEWLINE',
    scope: 'payload only; excludes seal and futureApproval to avoid circular hashing',
    sha256: sealedCardSha256, executable: false, executableCommandCardIssued: false },
    futureApproval: { exactPhrase, phraseActionableNow: false, captainReviewed: false,
      userApproved: false, approvalReceiptRef: null,
      reason: 'Proposed references require verification and acceptance; source and installed prerequisite reviews remain pending. This phrase grants no authority.' } };
}
function checkPreparation(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ok, sourcePreparationValid: ok, executable: false, liveCollectionAuthorized: false,
    evidenceAccepted: false, runtimeActivationAuthorized: false, bodyAdmissionAuthorized: false,
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_CARD_PREPARATION'] };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPreparation(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, executable: false, code: 'SOURCE_PREPARATION_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, RUNTIME_SOURCES, canonical, expectedPacket, checkPreparation };
