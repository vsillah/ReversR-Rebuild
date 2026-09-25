// Source-only planning data. No private input, receipt creation, or execution capability.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const { gapClosurePlan } = require('../cad-auth-restricted-receipt-gap-closure/preparation');
const CATEGORY_PLANS = {
  "concreteProviderRuntimeBinding": {
    "sourceSystem": "Provider/runtime installation records",
    "custodian": "Runtime records custodian",
    "reviewer": "Independent runtime binding reviewer",
    "allowedEvidenceSource": "Previously approved installation and provider-binding receipts plus reviewed adapter source digest",
    "creationOrSupplyPlan": "Supply a dedicated receipt linking the existing installation and provider binding to the reviewed adapter. Source code alone cannot attest installation."
  },
  "executableCollectorCommand": {
    "sourceSystem": "Disabled collector source review records",
    "custodian": "Collector source custodian",
    "reviewer": "Independent command safety reviewer",
    "allowedEvidenceSource": "Reviewed collector source digest, disabled card digest and existing command review receipt",
    "creationOrSupplyPlan": "Supply the disabled-card review receipt; record review provenance without issuing or embedding an executable command card."
  },
  "restrictedSyntheticCohortReceipt": {
    "sourceSystem": "Synthetic cohort ownership register",
    "custodian": "Synthetic cohort custodian",
    "reviewer": "Independent synthetic ownership reviewer",
    "allowedEvidenceSource": "Existing restricted synthetic cohort and ownership attestations",
    "creationOrSupplyPlan": "Supply a dedicated cohort receipt linking synthetic scope and ownership attestations; exclude identities and cohort values from public output."
  },
  "custodyReviewerReceipt": {
    "sourceSystem": "Restricted evidence custody register",
    "custodian": "Restricted evidence custodian",
    "reviewer": "Independent custody reviewer distinct from custodian",
    "allowedEvidenceSource": "Existing custodian, independent reviewer and restricted-store attestations",
    "creationOrSupplyPlan": "Prepare a dedicated custody receipt from approved role assignments and store attestations; unresolved assignments remain missing."
  },
  "durableConsumedRunLedger": {
    "sourceSystem": "Durable run-ledger qualification records",
    "custodian": "Run-ledger records custodian",
    "reviewer": "Independent ledger semantics reviewer",
    "allowedEvidenceSource": "Existing ledger, atomic consume and stop-or-unknown consume qualification receipts",
    "creationOrSupplyPlan": "Supply prior qualification receipts for atomic consumption and stop/unknown outcomes; do not create or consume a run to fill this gap."
  },
  "installedRouteBodyObserver": {
    "sourceSystem": "Route observer installation and boundary review records",
    "custodian": "Route observer records custodian",
    "reviewer": "Independent request-boundary reviewer",
    "allowedEvidenceSource": "Existing installed observer, earliest boundary and platform buffering receipts",
    "creationOrSupplyPlan": "Supply existing installation and boundary attestations including platform buffering coverage; source fixtures alone cannot prove installed behavior."
  },
  "lateGrantObserver": {
    "sourceSystem": "Late-grant observer qualification records",
    "custodian": "Late-grant observer records custodian",
    "reviewer": "Independent grant-denial reviewer",
    "allowedEvidenceSource": "Existing installed observer and late-grant denial receipts",
    "creationOrSupplyPlan": "Supply existing installed-observer and late-grant denial attestations; do not issue sessions or exercise a live grant to manufacture evidence."
  },
  "immutableTargetRecheckReceipt": {
    "sourceSystem": "Immutable deployment provenance register",
    "custodian": "Deployment provenance custodian",
    "reviewer": "Independent target provenance reviewer",
    "allowedEvidenceSource": "Existing approved candidate commit, immutable deployment reference, source digest receipt and recheck timestamp",
    "creationOrSupplyPlan": "Supply the prior target recheck receipt binding the same candidate and immutable deployment to its source digest and timestamp; stale or mismatched evidence stops review."
  }
};
const MERGE_COMMIT = 'db8baa46aeaf8fb2005cc5fe240d51389f86abc5';

function categoryStopConditions() {
  return {
    missingNamedPrivateReceiptSource: true,
    missingRequiredFieldPresence: true,
    missingCustodianOrReviewer: true,
    custodianIsReviewer: true,
    sourceSystemMismatch: true,
    retentionBoundaryViolation: true,
    evidenceNotPreviouslyApproved: true,
    privateValueWouldBeDisclosed: true,
    localPathWouldBeDisclosed: true,
    secretOrRuntimeCredentialNeeded: true,
    providerEnvResourceBillingChangeNeeded: true,
    uploadSessionIssuanceOrActivationNeeded: true,
    requestBodyAdmissionOrReadNeeded: true,
    executableCommandCardNeeded: true,
    liveEvidenceCollectionNeeded: true,
    retryOrSecondRunNeeded: true,
    privateCadOrCommercializationNeeded: true,
  };
}

function privateReadApprovalPhrase(category) {
  return [
    `Approve one CAD Auth restricted receipt artifact private read for category ${category}`,
    'from <exactPrivateReceiptSource> into a sanitized ignored projection bound to <candidateCommit>',
    'using source system <sourceSystem>, custodian <custodian>, independent reviewer <reviewer>,',
    'allowed evidence source <allowedEvidenceSource>, and retention boundary <retentionBoundary>.',
    'Read only that named receipt, recompute SHA-256 digest and byte count locally, inspect only required field presence,',
    'and commit only sanitized opaque refs, digest, byte count, coverage/disposition status, and next-gate stop status.',
    'No provider/env/resource/billing changes, secrets or secret-value disclosure, upload-session issuance, production upload activation,',
    'request-body admission/read, conversion, Sandbox dispatch, private CAD payload use, real-user commercialization, external messages,',
    'runtime activation, executable command-card issuance, live evidence collection, retry, second run, or commercial-readiness claim.'
  ].join(' ');
}

function artifactPreparation() {
  const parent = gapClosurePlan();
  return {
    schemaVersion: 1,
    plan: 'cad-auth-missing-receipt-artifact-prep-v1',
    sourceOnly: true,
    parentContract: parent.plan,
    sourceMergeCommit: MERGE_COMMIT,
    requiredCategories: Object.fromEntries(Object.entries(parent.requiredCategories).map(([category, contract]) => [category, {
      category,
      ...contract,
      ...CATEGORY_PLANS[category],
      status: 'MISSING_NOT_CREATED_OR_SUPPLIED',
      assignmentStatus: 'ROLE_REQUIREMENTS_ONLY_NAMED_ASSIGNMENTS_PENDING',
      retentionBoundary: 'Future approved ignored restricted store only; name retention duration and deletion owner before supply. No public values, private paths, key listings or derived projection before separate approval.',
      supplyMethod: 'After separate artifact approval, custodian may assemble a dedicated JSON receipt from existing approved evidence. Independent reviewer must verify provenance and category fields in a separately approved private review. If evidence does not exist, stop for a separate proposal; never substitute synthetic fixtures for installed evidence.',
      categoryStopConditions: categoryStopConditions(),
      futurePrivateReadApprovalPhrase: privateReadApprovalPhrase(category),
      approvalFields: { sourceSystem: null, custodian: null, reviewer: null, category, allowedEvidenceSource: null, retentionBoundary: null },
      accepted: false,
    }])),
    sourceAndProvenanceBoundary: parent.sourceAndProvenanceBoundary,
    stopConditions: {
      ...parent.stopConditions,
      missingNamedAssignmentOrRetention: true,
      custodianIsReviewer: true,
      evidenceNotPreviouslyApproved: true,
      staleOrMismatchedTarget: true,
      sourceFixtureClaimedAsInstalledEvidence: true,
      executableCommandCardNeeded: true,
      providerEnvResourceBillingChangeNeeded: true,
      uploadSessionIssuanceOrActivationNeeded: true,
      conversionOrSandboxDispatchNeeded: true,
      externalMessageNeeded: true,
      retryOrSecondRunNeeded: true,
      privateCadOrCommercializationNeeded: true,
      unresolvedApprovalPlaceholder: true,
    },
    futureApprovalGates: {
      artifactSupply: {
        authorized: false,
        exactPhraseTemplate: 'Approve CAD Auth receipt artifact supply for category <category> from <sourceSystem>, custodian <custodian>, independent reviewer <reviewer>, using only <allowedEvidenceSource>, retained under <retentionBoundary>. Existing approved evidence only; no live collection or runtime changes.',
        mustName: parent.futureApprovalGates.receiptCreationOrCollection.mustName,
      },
      privateRead: {
        authorized: false,
        exactPhraseTemplate: 'Approve one CAD Auth restricted source-set private read from <exactSourceFolder> to <exactOutputFile> for run <runId>, bound to <candidateCommit> and preparation packet <packetSha256>, custodian <custodian>, independent reviewer <reviewer>, retained under <retentionBoundary>. Eight approved receipt files only; no discovery, live collection, retry, second run, runtime activation or public projection release.',
        phraseFields: { exactSourceFolder: null, exactOutputFile: null, runId: null, candidateCommit: null, packetSha256: null, custodian: null, reviewer: null, retentionBoundary: null },
        requiresAllEightArtifactsSuppliedAndReviewed: true,
        unresolvedPlaceholdersAreNotApproval: true,
        templateIsNotExecutableOrAuthorization: true,
        previousApprovalReusable: false,
      },
      sanitizedProjectionReview: parent.futureApprovalGates.sanitizedProjectionReview,
      liveEvidenceCollection: parent.futureApprovalGates.liveEvidenceCollection,
    },
    controls: {
      ...parent.controls,
      privateReadAuthorized: false,
      artifactCreationOrSupplyAuthorized: false,
      privateReceiptsLoaded: false,
      artifactsCreatedOrSupplied: 0,
      realUserCommercializationAuthorized: false,
    },
  };
}

function checkArtifactPreparation(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, artifactPreparation()); } catch { /* sanitized */ }
  return { ...artifactPreparation().controls, ok,
    code: ok ? 'SOURCE_ONLY_MISSING_RECEIPT_ARTIFACT_PREP_VALID' : 'INVALID_SOURCE_ONLY_MISSING_RECEIPT_ARTIFACT_PREP' };
}
module.exports = { MERGE_COMMIT, artifactPreparation, checkArtifactPreparation };
