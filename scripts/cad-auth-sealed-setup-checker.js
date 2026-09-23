// Fixed-source generator/checker only. Never seals or emits a live command card.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkCard } = require('./cad-auth-sealed-evidence-card-checker');
const { getSchedule, scheduleSha256, limitsSha256 } = require('../offline/cad-auth-sealed-setup/receiptCollector');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-sealed-setup.json';
const BINDINGS = 'offline/cad-auth-sealed-setup/binding-manifests.json';
const SOURCES = Object.freeze([
  PARENT, BINDINGS, 'docs/cad-auth-sealed-setup.md', 'docs/cad-auth-sealed-setup-stop-runbook.md',
  'offline/cad-auth-sealed-setup/providerAdapter.js', 'offline/cad-auth-sealed-setup/providerAdapter.d.ts',
  'offline/cad-auth-sealed-setup/receiptCollector.js', 'offline/cad-auth-sealed-setup/routeInstrumentation.js',
  'scripts/cad-auth-sealed-setup-checker.js', 'scripts/cad-auth-sealed-setup.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedBindings() {
  return {
    schemaVersion: 1, sourceOnly: true, status: 'UNBOUND_NO_LIVE_AUTHORITY',
    provider: { sourceCommit: null, deployedVersionRef: null, sdkPolicyDigest: null,
      issuerAudienceAlgorithmPolicy: null, authSdkVersion: null, authCoreVersion: null,
      providerPolicyRef: null, cacheInvalidationPolicyRef: null },
    collector: { collectorCommit: null, receiptValidatorCommit: null,
      caseScheduleSha256: scheduleSha256, limitsSha256, liveTransportBound: false,
      durableRunLedgerRef: null },
    immutableTarget: { deploymentUrl: null, deploymentCommit: null, deploymentProviderRef: null,
      sourceMapDigest: null, mutableAliasAllowed: false, historicalDeploymentReusable: false },
    syntheticCohort: { cohortRef: null, aliasMapRef: null, lifecycleSetupReceiptRef: null,
      noRealUserReceiptRef: null, aliases: ['U1/L1', 'U1/L2', 'U2/L3'], creationAuthorized: false },
    custodyReviewer: { custodianRef: null, reviewerRef: null, restrictedStoreRef: null,
      retentionDeletionRef: null, retentionDays: 7, publicationAllowed: false,
      rawCredentialsAllowed: false, independentReviewRequired: true },
    instrumentation: { instrumentationCommit: null, entrypointRef: null,
      bodyAccessCounterRef: null, platformBufferingReviewRef: null, installed: false },
    rollback: { stopRunbookRef: 'docs/cad-auth-sealed-setup-stop-runbook.md',
      lateGrantObserverRef: null, partialEvidencePolicyRef: null, remediationEscalationRef: null,
      reviewed: false },
    approval: { startsAtUtc: null, expiresAtUtc: null, exactApprovalReceiptRef: null,
      sealedCardSha256: null, historicalApprovalReusable: false },
  };
}
function expectedSetup(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkCard(parent, { readSource }).ok) throw Error('PARENT_CARD_INVALID');
  const bindings = JSON.parse(readSource(BINDINGS));
  if (!isDeepStrictEqual(bindings, expectedBindings())) throw Error('UNREVIEWED_BINDING_CHANGE');
  return {
    schemaVersion: 1, packet: 'cad-auth-sealed-setup-v1', sourceOnly: true,
    status: 'SOURCE_IMPLEMENTED_LIVE_BINDINGS_BLOCKED',
    parentCardSha256: sha(readSource(PARENT)),
    card: { id: 'cad-auth-sealed-evidence-card-v1', sealed: false, sha256: null,
      executable: false, exactCommandLine: null, dryRunCommandLine: null,
      liveApprovalPhrase: null, liveApprovalPhraseActionable: false },
    implementation: {
      providerAdapterInterface: 'offline/cad-auth-sealed-setup/providerAdapter.d.ts',
      disabledProviderAdapter: 'offline/cad-auth-sealed-setup/providerAdapter.js',
      syntheticCollectorAndReceiptValidator: 'offline/cad-auth-sealed-setup/receiptCollector.js',
      unmountedInstrumentation: 'offline/cad-auth-sealed-setup/routeInstrumentation.js',
      manifests: BINDINGS, stopRunbook: 'docs/cad-auth-sealed-setup-stop-runbook.md',
      generator: 'scripts/cad-auth-sealed-setup-checker.js',
    },
    bindings,
    proposedSchedule: { caseCount: parent.proposedSealedFields.caseCount,
      slotCount: getSchedule().length, scheduleSha256, limitsSha256,
      reviewed: false, executable: false, slots: getSchedule() },
    limits: parent.proposedSealedFields.limits,
    stopConditions: parent.proposedSealedFields.stopConditions,
    claims: parent.claims,
    remainingGates: ['CONCRETE_PROVIDER_IMPLEMENTATION_AND_POLICY_REVIEW',
      'LIVE_COLLECTOR_TRANSPORT_AND_RECEIPT_REVIEW', 'ACTUAL_ROUTE_INSTRUMENTATION_REVIEW',
      'IMMUTABLE_TARGET_BINDING', 'RESTRICTED_COHORT_LIFECYCLE_MAPPING',
      'CUSTODIAN_AND_INDEPENDENT_REVIEWER', 'REVIEWED_STOP_AND_LATE_GRANT_OBSERVER',
      'SEALED_CARD_AND_FRESH_EXPLICIT_WINDOW'],
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkSetup(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedSetup(readSource)); } catch { /* sanitized denial */ }
  return { ok, sourceSetupValid: ok, sealed: false, executable: false,
    liveCollectionAuthorized: false, runtimeActivationAuthorized: false,
    uploadSessionIssuanceEnabled: false, bodyAdmissionAuthorized: false,
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_SETUP'] };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedSetup(), null, 2) + '\n');
    const result = checkSetup(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, executable: false, code: 'SOURCE_SETUP_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, BINDINGS, SOURCES, expectedBindings, expectedSetup, checkSetup };
