// Source-only sealed-card validator. No collector, provider client, env reader or runtime gate.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PLAN_PACKET, checkPlan } = require('./cad-auth-live-evidence-plan-checker');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-sealed-evidence-card.json';
const PLAN_MERGE = '06468abb5424aea56f4f89dd9cd05a9602864806';
const CANDIDATE = 'dc7d733cff6d94841725e721cc8e7b0da7be4cff';
const SOURCES = Object.freeze([
  'docs/cad-auth-sealed-evidence-card.md',
  'scripts/cad-auth-sealed-evidence-card-checker.js',
  'scripts/cad-auth-sealed-evidence-card.test.js',
  'docs/cad-auth-live-evidence-plan.md',
  'docs/cad-auth-live-evidence-plan.json',
  'scripts/cad-auth-live-evidence-plan-checker.js',
  'scripts/cad-auth-live-evidence-plan.test.js',
  'docs/cad-production-auth-verifier-acceptance.json',
  'docs/cad-production-verifier-evidence-template.json',
  'offline/cad-convex/productionVerifierCandidate.js',
  'server/cadProductionSessionVerifierBinding.js',
  'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js',
  'server/uploadSession.js',
  'server/uploadSessionStore.js',
  'server/cadUserUploadRouter.js',
  'server/index.js',
  'api/[...path].js',
  'vercel.json',
  'package-lock.json',
]);
const CLAIMS = Object.freeze({
  sealedCommandCardReady: false,
  concreteProviderAdapterBound: false,
  collectorAndReceiptValidatorBound: false,
  routeInstrumentationBound: false,
  immutableCollectionTargetBound: false,
  syntheticCohortMappingBound: false,
  custodyReviewerBound: false,
  freshWindowBound: false,
  liveProviderTestsAuthorized: false,
  liveCollectionAuthorized: false,
  uploadSessionIssuanceEnabled: false,
  bodyAdmissionAuthorized: false,
  runtimeActivationAuthorized: false,
  providerEnvResourceBillingChanges: false,
  secretReads: false,
  externalMessagesAuthorized: false,
  secondRunOrRetryAuthorized: false,
  commercialReadinessClaim: false,
});
const PREREQUISITES = Object.freeze({
  providerAdapter: {
    status: 'MISSING_SOURCE_IMPLEMENTATION',
    mustBind: ['sourceCommit', 'deployedVersionRef', 'sdkPolicyDigest', 'issuerAudienceAlgorithmPolicy'],
    evidenceRef: null,
  },
  providerPolicyAndVersions: {
    status: 'MISSING_PROVIDER_RECEIPT',
    mustBind: ['authSdkVersion', 'authCoreVersion', 'providerPolicyRef', 'cacheInvalidationPolicyRef'],
    evidenceRef: null,
  },
  collectorAndReceiptValidator: {
    status: 'MISSING_SOURCE_IMPLEMENTATION',
    mustBind: ['collectorCommit', 'receiptValidatorCommit', 'caseScheduleSha256', 'limitsSha256'],
    evidenceRef: null,
  },
  actualRouteInstrumentation: {
    status: 'MISSING_SOURCE_IMPLEMENTATION',
    mustBind: ['instrumentationCommit', 'entrypointRef', 'bodyAccessCounterRef', 'platformBufferingReviewRef'],
    evidenceRef: null,
  },
  immutableCollectionTarget: {
    status: 'MISSING_DEPLOYMENT_REF',
    mustBind: ['deploymentUrl', 'deploymentCommit', 'deploymentProviderRef', 'sourceMapDigest'],
    evidenceRef: null,
  },
  syntheticCohortMapping: {
    status: 'MISSING_RESTRICTED_MAPPING_REF',
    mustBind: ['cohortRef', 'aliasMapRef', 'lifecycleSetupReceiptRef', 'noRealUserReceiptRef'],
    evidenceRef: null,
  },
  custodyAndReviewer: {
    status: 'MISSING_CUSTODY_RECEIPT',
    mustBind: ['custodianRef', 'reviewerRef', 'restrictedStoreRef', 'retentionDeletionRef'],
    evidenceRef: null,
  },
  rollbackAndStopControls: {
    status: 'MISSING_REVIEWED_RUNBOOK',
    mustBind: ['stopRunbookRef', 'lateGrantObserverRef', 'partialEvidencePolicyRef', 'remediationEscalationRef'],
    evidenceRef: null,
  },
  freshExplicitApprovalWindow: {
    status: 'MISSING_FRESH_APPROVAL',
    mustBind: ['startsAtUtc', 'expiresAtUtc', 'exactApprovalReceiptRef', 'sealedCardSha256'],
    evidenceRef: null,
  },
});
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = file => createHash('sha256').update(read(file)).digest('hex');

function expectedCard(readSource = read) {
  const plan = JSON.parse(readSource(PLAN_PACKET));
  if (!checkPlan(plan, { readSource }).ok) throw Error('SOURCE_PLAN_INVALID');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-sealed-evidence-card-v1',
    sourceOnly: true,
    status: 'BLOCKED_CARD_NOT_SEALED',
    parentPlan: {
      packet: plan.packet,
      mergeCommit: PLAN_MERGE,
      candidateCommit: CANDIDATE,
      planDoc: 'docs/cad-auth-live-evidence-plan.md',
      planJson: PLAN_PACKET,
      planSha256: createHash('sha256').update(readSource(PLAN_PACKET)).digest('hex'),
      livePhraseFromPlanReusableNow: false,
      reason: 'Provider, collector, instrumentation, deployment target, cohort mapping, custody and fresh approval are unbound.',
    },
    claims: CLAIMS,
    card: {
      id: 'cad-auth-sealed-evidence-card-v1',
      sealed: false,
      sha256: null,
      executable: false,
      liveApprovalPhrase: null,
      liveApprovalPhraseActionable: false,
      exactCommandLine: null,
      dryRunCommandLine: null,
      canBeExecutedByThisPacket: false,
      requiresNewReviewAfterAnySourceOrTargetDrift: true,
    },
    prerequisites: PREREQUISITES,
    proposedSealedFields: {
      candidateCommit: CANDIDATE,
      planMergeCommit: PLAN_MERGE,
      providerAdapterCommit: null,
      providerPolicyDigest: null,
      collectorCommit: null,
      receiptValidatorCommit: null,
      instrumentationCommit: null,
      immutableCollectionTarget: null,
      syntheticCohortMappingRef: null,
      custodyRef: null,
      reviewerRef: null,
      window: { startsAtUtc: null, expiresAtUtc: null, durationMinutes: 30, freshAtSealTime: false },
      limits: plan.limits,
      stopConditions: plan.stopConditions,
      approvedObservationTypes: [...new Set(plan.cases.map(c => c.observationType))].sort(),
      caseCount: plan.cases.length,
      route: plan.route,
      custodyPolicy: plan.custody.policy,
    },
    evidenceFormat: {
      publicProjectionFields: [
        'caseId', 'path', 'phase', 'candidateCommit', 'deploymentRef', 'syntheticAlias',
        'expectedCode', 'observedCode', 'disposition', 'sanitizedEvidenceSha256', 'reviewerRef',
      ],
      restrictedFieldsOnly: [
        'operatorAccountRef', 'providerAccountRef', 'loginSessionRef', 'membershipRef',
        'rawProviderResponseRef', 'rawNetworkTraceRef',
      ],
      forbiddenEverywhere: ['tokens', 'cookies', 'rawHeaders', 'secretValues', 'privateCad', 'rawExceptionPayloads'],
      receiptPublicationAllowed: false,
      rawCredentialCaptureAllowed: false,
      rawAccountRecordCaptureAllowed: false,
    },
    nextNonLiveGate: {
      status: 'SOURCE_SETUP_REVIEW_REQUIRED',
      exactApprovalPhrase: 'I approve a bounded source-only CAD Auth sealed evidence setup implementation gate for ReversR-Rebuild. Scope: implement and review only the missing provider-adapter interface, collector/receipt-validator source, route/body instrumentation source, immutable-target binding manifest, synthetic-cohort mapping manifest, custody/reviewer manifest, rollback/stop runbook, and sealed-card generator needed to populate cad-auth-sealed-evidence-card-v1. Allow local validation, draft PR, green-check merge, normal Vercel deployment from main, production fail-closed smoke, and cleanup. No live Auth/provider tests, provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request body admission/read, conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, second run/retry, or commercial-readiness claim. Stop before any live evidence collection, runtime activation, env installation, credential generation, or executable command-card issuance.',
      phraseActionableNow: false,
      phraseActionableReason: 'This PR only records the sealed-card prerequisites. It does not implement the missing setup artifacts.',
    },
    completion: {
      cardSealed: false,
      prerequisitesBound: false,
      approvalReceived: false,
      liveCollectionExecutable: false,
      liveCollectionRun: false,
      productionVerifierAccepted: false,
      runtimeActivationAuthorized: false,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file,
      createHash('sha256').update(readSource(file)).digest('hex')])),
  };
}

function checkCard(packet, { readSource = read } = {}) {
  let valid = false;
  try { valid = isDeepStrictEqual(packet, expectedCard(readSource)); } catch { /* fail closed */ }
  return {
    ok: valid,
    sourceCardValid: valid,
    sealed: false,
    executable: false,
    liveCollectionAuthorized: false,
    prerequisitesBound: false,
    runtimeActivationAuthorized: false,
    uploadSessionIssuanceEnabled: false,
    bodyAdmissionAuthorized: false,
    problems: valid ? [] : ['INVALID_SOURCE_ONLY_SEALED_EVIDENCE_CARD'],
  };
}

if (require.main === module) {
  let packet;
  try { packet = JSON.parse(read(PACKET)); } catch { /* closed result */ }
  const result = checkCard(packet);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { PACKET, SOURCES, PREREQUISITES, expectedCard, checkCard };
