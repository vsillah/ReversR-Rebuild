// Source-only durable adapter evidence review. No live runner, provider calls or body IO.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');
const {
  DURABLE_RECEIPTS,
  DIGEST_KEYS,
  durableRunnerAdapterPacket,
} = require('../cad-auth-prod-durable-runner-adapter-prep/preparation');
const {
  SOURCE_SET_PROJECTION_PACKET_SHA256,
  PRODUCTION_TARGET_ORIGIN,
  PRODUCTION_UPLOAD_ROUTE,
  INTERNAL_TEST_COHORT_REF,
} = require('../cad-auth-upload-admission-readiness-rollup/preparation');
const {
  ACCEPTED_PROVENANCE_PACKET_SHA256,
  SOURCE_SET_SHA256,
  SOURCE_SET_RUN_ID,
} = require('../cad-auth-restricted-source-set-projection/preparation');

const SOURCE_COMMIT = '22f3b8d72064c47de0a5afeb1043602671474dd0';
const DURABLE_ADAPTER_PACKET_SHA256 = '783fc44dc5b052f7f6d2da933e8d32c09ab11a872ba3f9d2a027db173a16d285';
const UPLOAD_READINESS_ROLLUP_PACKET_SHA256 =
  '9c85cdef9841a16f8400e1ba960c16cbbc3e83e6d63130324287266733dc204b';
const PRODUCTION_DEPLOYMENT_REF =
  'https://vercel.com/vsillahs-projects/reversr/4M1gc2XktVXbNYXwVfLsgbSaUGTG';
const ZERO_ACTIONS = Object.freeze({
  providerEnvResourceBillingChangeAuthorized: false,
  secretReadAuthorized: false,
  uploadSessionIssuanceAuthorized: false,
  productionUploadActivationAuthorized: false,
  requestBodyAdmissionReadAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  privateCadUseAuthorized: false,
  liveEvidenceCollectionAuthorized: false,
  runtimeActivationAuthorized: false,
  executableCommandCardIssuanceAuthorized: false,
  externalMessagesAuthorized: false,
  retryAuthorized: false,
  secondRunAuthorized: false,
  realUserCommercializationAuthorized: false,
  commercialReadinessClaimed: false,
  effectsExecuted: 0,
});
const NEXT_PHRASE_FIELDS = Object.freeze([
  'evidencePacketSha256',
  'evidenceSourceCommit',
  'startUtc',
  'expiresUtc',
  'commandCardSha256',
]);
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function productionFailClosedSmokeEvidence() {
  return {
    evidenceKind: 'production-fail-closed-smoke-after-durable-adapter-prep',
    productionOrigin: PRODUCTION_TARGET_ORIGIN,
    deploymentReference: PRODUCTION_DEPLOYMENT_REF,
    sourceCommit: SOURCE_COMMIT,
    cadPayloadBytesSent: 0,
    privateCadUsed: false,
    uploadSessionIssued: false,
    bodyAdmissionReadAuthorized: false,
    postRollbackLiveOpeningOccurred: false,
    rollbackExecutedByThisGate: false,
    routeCases: [
      {
        method: 'GET',
        path: `/?qa=pr425-prod-smoke&commit=${SOURCE_COMMIT}`,
        expectedStatus: 200,
        observedStatus: 200,
        expectedClosed: false,
      },
      {
        method: 'GET',
        path: '/api/cad/capabilities',
        expectedStatus: 200,
        observedStatus: 200,
        expectedClosed: false,
      },
      {
        method: 'POST',
        path: '/api/cad/user-import',
        expectedStatus: 401,
        observedStatus: 401,
        expectedCode: 'USER_SESSION_REQUIRED',
        expectedClosed: true,
      },
      {
        method: 'POST',
        path: '/api/cad/import',
        expectedStatus: 401,
        observedStatus: 401,
        expectedCode: 'UNAUTHORIZED',
        expectedClosed: true,
      },
      {
        method: 'POST',
        path: '/api/cad/import-source-record',
        expectedStatus: 404,
        observedStatus: 404,
        expectedCode: 'Cannot POST /api/cad/import-source-record',
        expectedClosed: true,
      },
    ],
    observerDeltas: {
      uploadSessionsIssued: 0,
      uploadAdmissionsOpened: 0,
      cadPayloadBodyReads: 0,
      conversions: 0,
      sandboxDispatches: 0,
      retries: 0,
      secondRuns: 0,
    },
  };
}

function commandCardDigestRequirements() {
  return {
    digestKeys: DIGEST_KEYS,
    durableReceiptKeys: DURABLE_RECEIPTS,
    requiredFutureBindingKeys: [
      'freshApprovalReviewReceipt',
      'immutableTargetReceipt',
      'closedBaselineReceipt',
      'adapterSourceReviewReceipt',
      'independentExpiryReceipt',
      'atomicLedgerReceipt',
      'sessionAdmissionReceipt',
      'rollbackSmokeReceipt',
      'commandCardSha256',
      'startUtc',
      'expiresUtc',
      'runLedgerKey',
      'attemptLedgerKey',
    ],
    unresolvedPlaceholdersAreNotApproval: true,
    commandCardIssuedByThisGate: false,
    executableCommandCardPreparedForLiveExecution: false,
  };
}

function nextLiveOpeningApprovalPhraseTemplate() {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source-only durable adapter evidence command-card review packet <evidencePacketSha256> at source commit <evidenceSourceCommit>, durable adapter packet ${DURABLE_ADAPTER_PACKET_SHA256}, production deployment reference ${PRODUCTION_DEPLOYMENT_REF}, source-only upload-admission readiness rollup packet ${UPLOAD_READINESS_ROLLUP_PACKET_SHA256}, coherent restricted source-set projection packet ${SOURCE_SET_PROJECTION_PACKET_SHA256}, private restricted source-set SHA-256 ${SOURCE_SET_SHA256}, run id ${SOURCE_SET_RUN_ID}, and accepted provenance projection packet ${ACCEPTED_PROVENANCE_PACKET_SHA256}. Scope: against ${PRODUCTION_TARGET_ORIGIN} ${PRODUCTION_UPLOAD_ROUTE}, for cohort ${INTERNAL_TEST_COHORT_REF}, starting <startUtc> and expiring <expiresUtc>; issue and use only one bounded executable command-card with SHA-256 <commandCardSha256> for admission-only body validation for public, synthetic, or explicitly authorized internal tester CAD; one concurrent session; one upload attempt; independent expiry checks before every effect; atomic durable run and attempt claims; stop on unknown outcome; rollback immediately after the window; and run post-rollback fail-closed smoke before cleanup. No conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, provider/env/resource/billing changes, second run, retry, or commercial-readiness claim.`;
}

function evidenceBindings() {
  const durablePacket = durableRunnerAdapterPacket();
  const smoke = productionFailClosedSmokeEvidence();
  return {
    freshAdapterPacketEvidence: {
      packet: durablePacket.packet,
      sha256: DURABLE_ADAPTER_PACKET_SHA256,
      sourceCommit: durablePacket.sourceCommit,
      expectedSourceCommit: 'ac6534162a6ef0057ee945b15a9079218f4431ba',
      reviewedAtCommit: SOURCE_COMMIT,
      defaultFailClosed: durablePacket.enabled === false
        && durablePacket.runtimeMounted === false
        && durablePacket.productionUploadActivationAuthorized === false,
      missingAdapterEvidenceStops: true,
    },
    immutableProductionDeploymentEvidence: {
      deploymentReference: PRODUCTION_DEPLOYMENT_REF,
      deploymentReferenceType: 'vercel-deployment-url',
      sourceCommit: SOURCE_COMMIT,
      productionOrigin: PRODUCTION_TARGET_ORIGIN,
      productionRoute: PRODUCTION_UPLOAD_ROUTE,
      providerMutationByThisGate: false,
      immutableDplIdRequiredForLaterLiveOpeningIfAvailable: true,
      targetDriftStops: true,
    },
    independentExpiryEvidence: {
      sourceRef: 'offline/cad-auth-prod-durable-runner-adapter-prep/transactionAdapter.js#checkIndependentFence',
      testRef: 'scripts/cad-auth-prod-durable-runner-adapter-prep.test.js#rollback-is-idempotent-and-independent-fence-never-grants-admission',
      trustedClockRequired: true,
      startInclusiveExpiryExclusive: true,
      recheckBeforeEveryEffect: true,
      admissionAllowedByThisGate: false,
      liveIndependentExpiryReceiptRequiredLater: true,
      missingExpiryEvidenceStops: true,
    },
    durableLedgerEvidence: {
      sourceRef: 'offline/cad-auth-prod-durable-runner-adapter-prep/transactionAdapter.js#proposeDurableTransition',
      testRef: 'scripts/cad-auth-prod-durable-runner-adapter-prep.test.js#durable-transition-source-enforces-ordered-one-session-and-one-attempt-claims',
      runClaimMaxWinners: 1,
      sessionClaimMaxWinners: 1,
      attemptClaimMaxWinners: 1,
      unknownMutationOutcome: 'close fence, revoke, no retry',
      liveAtomicLedgerReceiptRequiredLater: true,
      missingLedgerEvidenceStops: true,
    },
    postRollbackFailClosedSmokeEvidence: {
      ...smoke,
      smokeEvidenceSha256: sha(smoke),
      livePostRollbackSmokeRequiredLater: true,
      responsesAloneProveClosure: false,
      observerRequiredForLiveOpening: true,
      missingSmokeEvidenceStops: true,
    },
  };
}

function durableEvidenceCommandCardReview() {
  const bindings = evidenceBindings();
  return {
    schemaVersion: 1,
    packet: 'cad-auth-durable-adapter-evidence-command-card-review-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_DURABLE_ADAPTER_EVIDENCE_REVIEW_NO_LIVE_COMMAND_CARD',
    sourceCommit: SOURCE_COMMIT,
    parentPackets: {
      durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
      uploadReadinessRollupPacketSha256: UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
      coherentRestrictedSourceSetProjectionPacketSha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
      acceptedProvenanceProjectionPacketSha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
    },
    evidenceBindings: bindings,
    evidenceSummary: {
      categoryCount: Object.keys(bindings).length,
      sourceOnlyCategoriesBound: Object.keys(bindings).length,
      productionDeploymentReferenceBound: true,
      failClosedSmokeCaseCount: bindings.postRollbackFailClosedSmokeEvidence.routeCases.length,
      closedRouteCaseCount: bindings.postRollbackFailClosedSmokeEvidence.routeCases
        .filter(routeCase => routeCase.expectedClosed).length,
      observerDeltaTotal: Object.values(bindings.postRollbackFailClosedSmokeEvidence.observerDeltas)
        .reduce((sum, count) => sum + count, 0),
      allControlsClosed: true,
      privateValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    },
    commandCardDigestRequirements: commandCardDigestRequirements(),
    stopConditions: {
      failingCheck: true,
      failingSmoke: true,
      unknownOutcome: true,
      missingAdapterEvidence: true,
      deploymentTargetDrift: true,
      durableAdapterPacketDigestMismatch: true,
      uploadReadinessRollupDigestMismatch: true,
      independentExpiryEvidenceMissing: true,
      durableLedgerEvidenceMissing: true,
      postRollbackSmokeEvidenceMissing: true,
      observerUnavailable: true,
      credentialOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
      unresolvedCommandCardDigest: true,
    },
    nextLiveOpeningGate: {
      authorized: false,
      exactPhraseTemplate: nextLiveOpeningApprovalPhraseTemplate(),
      phraseFields: Object.fromEntries(NEXT_PHRASE_FIELDS.map(field => [field, null])),
      liveOpeningRequiresSeparateApproval: true,
      executableCommandCardIssuanceRequiresSeparateApproval: true,
      uploadSessionIssuanceRequiresSeparateApproval: true,
      requestBodyAdmissionReadRequiresSeparateApproval: true,
      runtimeActivationRequiresSeparateApproval: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    controls: {
      ...ZERO_ACTIONS,
      sourceOnlyDurableAdapterEvidenceReviewAuthorized: true,
      commandCardReviewPreparationAuthorized: true,
      privateReceiptReadAuthorized: false,
      privateReceiptDiscoveryAuthorized: false,
      sourceSetGenerationAuthorized: false,
      publicProjectionReleaseAuthorized: false,
      cleanupAuthorized: false,
    },
  };
}

function checkDurableEvidenceCommandCardReview(input) {
  let ok = false;
  try {
    ok = plainContractData(input) && isDeepStrictEqual(input, durableEvidenceCommandCardReview());
  } catch { /* sanitized */ }
  return {
    ...durableEvidenceCommandCardReview().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_DURABLE_ADAPTER_EVIDENCE_COMMAND_CARD_REVIEW_VALID'
      : 'INVALID_DURABLE_ADAPTER_EVIDENCE_COMMAND_CARD_REVIEW',
  };
}

module.exports = {
  SOURCE_COMMIT,
  DURABLE_ADAPTER_PACKET_SHA256,
  UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
  PRODUCTION_DEPLOYMENT_REF,
  ZERO_ACTIONS,
  NEXT_PHRASE_FIELDS,
  productionFailClosedSmokeEvidence,
  commandCardDigestRequirements,
  nextLiveOpeningApprovalPhraseTemplate,
  evidenceBindings,
  durableEvidenceCommandCardReview,
  checkDurableEvidenceCommandCardReview,
};
