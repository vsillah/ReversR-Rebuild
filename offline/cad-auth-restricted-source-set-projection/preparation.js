// Source-only coherent restricted source-set projection. No private source-set or receipt IO.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');

const SOURCE_MERGE_COMMIT = '3ab958f1216fa33323e1ed9b65d2408836788427';
const ACCEPTED_PROVENANCE_PACKET_SHA256 = '03be649bfab60b66700775fc00946daf9209cc9cfa4d3f741214342c1d784aec';
const ACCEPTED_PROVENANCE_SOURCE_COMMIT = '5690e016163d916096a40a9a09204c57c5a541c5';
const SOURCE_SET_RUN_ID = '20260925t182340z';
const SOURCE_SET_SHA256 = '2d437fd9e964dd1c346bb60d9d3de8d14bd845e1980a225ffeb4ca4c4b2216c4';

const RECEIPTS = Object.freeze({
  concreteProviderRuntimeBinding: {
    receiptSha256: 'a24d3cdca11913520dec27419897167592003bc15a9345047a87a661230c8985',
    byteLength: 5189,
  },
  executableCollectorCommand: {
    receiptSha256: 'dbe9adfcfc09a061a38722f090b48c8fdabcc4dd2597218587a94ffbedc51470',
    byteLength: 6196,
  },
  restrictedSyntheticCohortReceipt: {
    receiptSha256: '04aa1e7e9a1e22d1384eec0b2a7e41c5a0abfa8ea50796f3ad585c2b6d82ddc2',
    byteLength: 4857,
  },
  custodyReviewerReceipt: {
    receiptSha256: 'a9525ef592033a38c4b931783ae5b784f7b5fe1a81d5c71b9edf7e0d538fb830',
    byteLength: 6243,
  },
  durableConsumedRunLedger: {
    receiptSha256: '2b2998396fc0d60e326a2098e96f65b163d1c8545e9c682f0219a3185ab6f662',
    byteLength: 6247,
  },
  installedRouteBodyObserver: {
    receiptSha256: 'a6422672df981f80baa776e13c784efded4ba2be65e6a1fedc31d08dc89fbdb6',
    byteLength: 6145,
  },
  lateGrantObserver: {
    receiptSha256: 'e6efeb497c8662b549a436c5648a7cd8bf1aff2921477126fc1ba93999180c42',
    byteLength: 4840,
  },
  immutableTargetRecheckReceipt: {
    receiptSha256: 'e7b725815d6e4ab8dc74b1b1023e49687f66a0c1de072d032e86afd883067add',
    byteLength: 7693,
  },
});

function sourceSetActivationReadinessPhraseTemplate() {
  return `I approve a bounded source-only CAD Auth production upload-admission readiness rollup gate for ReversR-Rebuild, bound to coherent restricted source-set projection packet <projectionPacketSha256> at source commit <projectionSourceCommit>, private restricted source-set SHA-256 ${SOURCE_SET_SHA256}, run id ${SOURCE_SET_RUN_ID}, and accepted provenance projection packet ${ACCEPTED_PROVENANCE_PACKET_SHA256}. Scope: prepare only source-only docs/tests/checkers/manifests that roll up accepted provenance, eight-artifact receipt supply, coherent restricted source-set coverage, closed-control status, rollback/stop conditions, and the exact later production upload-admission approval phrase. Commit only sanitized opaque refs, SHA-256 digests, byte counts, counts, statuses, controls, and gate templates. No private receipt values, private paths, key listings, provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD payload use, live evidence collection, runtime activation, executable command-card issuance, external messages, retry, second run, real-user commercialization, or commercial-readiness claim. Stop on failing checks, failing smoke, unknown outcome, or any need for runtime credentials/provider configuration.`;
}

function categoryProjection() {
  return Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => {
    const receipt = RECEIPTS[category];
    const requiredFieldCount = RECEIPT_FIELDS[category].length;
    return [category, {
      receiptRef: `rrb-ref:cad-auth-restricted-source-set:${SOURCE_SET_RUN_ID}:${category}:${receipt.receiptSha256.slice(0, 12)}`,
      receiptSha256: receipt.receiptSha256,
      byteLength: receipt.byteLength,
      requiredFieldCount,
      presentFieldCount: requiredFieldCount,
      complete: true,
      fieldPresenceProjectedAsCountsOnly: true,
      privateValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    }];
  }));
}

function restrictedSourceSetProjection() {
  const categories = categoryProjection();
  const requiredFieldCount = Object.values(categories)
    .reduce((sum, category) => sum + category.requiredFieldCount, 0);
  const presentFieldCount = Object.values(categories)
    .reduce((sum, category) => sum + category.presentFieldCount, 0);
  return {
    schemaVersion: 1,
    projection: 'cad-auth-coherent-restricted-source-set-projection-v1',
    sourceOnly: true,
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
    acceptedProvenanceProjection: {
      packet: 'cad-auth-accepted-provenance-review-projection-v1',
      sha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
      sourceCommit: ACCEPTED_PROVENANCE_SOURCE_COMMIT,
      projectedByOpaqueRefAndDigestOnly: true,
      privateReviewBytesReadByThisPacket: false,
      privateReviewReceiptBytesReadByThisPacket: false,
      repairedScheduleBytesReadByThisPacket: false,
    },
    restrictedSourceSet: {
      ref: `rrb-ref:cad-auth-restricted-source-set-output-${SOURCE_SET_RUN_ID}`,
      sha256: SOURCE_SET_SHA256,
      runId: SOURCE_SET_RUN_ID,
      status: 'COHERENT_EIGHT_CATEGORY_SOURCE_SET_PROJECTED',
      privateSourceSetBytesReadByThisPacket: false,
      privateSourceSetPathProjected: false,
      privateReceiptValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    },
    categoryCoverage: {
      complete: true,
      categoryCount: REQUIRED_LIVE_BINDINGS.length,
      completeCategoryCount: REQUIRED_LIVE_BINDINGS.length,
      missingCategoryCount: 0,
      incompleteCategoryCount: 0,
      requiredFieldCount,
      presentFieldCount,
      acceptedFieldRatio: `${presentFieldCount}/${requiredFieldCount}`,
    },
    categories,
    closedControlStatus: {
      allRuntimeControlsClosed: true,
      uploadControlsRemainClosed: true,
      requestBodyAdmissionReadRemainsClosed: true,
      runtimeActivationRemainsClosed: true,
      uploadSessionIssuanceRemainsClosed: true,
      conversionRemainsClosed: true,
      sandboxDispatchRemainsClosed: true,
      retryOrSecondRunRemainsClosed: true,
      commercialReadinessRemainsUnclaimed: true,
    },
    nextReadinessRollupGate: {
      authorized: false,
      exactPhraseTemplate: sourceSetActivationReadinessPhraseTemplate(),
      phraseFields: {
        projectionPacketSha256: null,
        projectionSourceCommit: null,
      },
      productionUploadAdmissionRequiresSeparateApproval: true,
      runtimeCredentialsOrProviderConfigurationRequireSeparateApproval: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    stopConditions: {
      sourceSetDigestMismatch: true,
      acceptedProvenancePacketDigestMismatch: true,
      missingCategory: true,
      incompleteCategory: true,
      receiptDigestMismatch: true,
      receiptByteCountMismatch: true,
      controlsNotClosed: true,
      unknownOutcome: true,
      failingCheck: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
    },
    controls: {
      ...ZERO_ACTIONS,
      privateReceiptReadAuthorized: false,
      privateReceiptDiscoveryAuthorized: false,
      secretReadAuthorized: false,
      privateValueDisclosureAuthorized: false,
      privatePathDisclosureAuthorized: false,
      keyListingDisclosureAuthorized: false,
      providerEnvResourceBillingChangeAuthorized: false,
      receiptCreationAuthorized: false,
      receiptSupplyAuthorized: false,
      sourceSetGenerationAuthorized: false,
      publicSourceSetProjectionAuthorized: true,
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
    },
  };
}

function checkRestrictedSourceSetProjection(input) {
  let ok = false;
  try {
    ok = plainData(input) && isDeepStrictEqual(input, restrictedSourceSetProjection());
  } catch { /* sanitized */ }
  return {
    ...restrictedSourceSetProjection().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_SOURCE_SET_PROJECTION_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_SET_PROJECTION',
  };
}

module.exports = {
  SOURCE_MERGE_COMMIT,
  ACCEPTED_PROVENANCE_PACKET_SHA256,
  ACCEPTED_PROVENANCE_SOURCE_COMMIT,
  SOURCE_SET_RUN_ID,
  SOURCE_SET_SHA256,
  RECEIPTS,
  categoryProjection,
  restrictedSourceSetProjection,
  checkRestrictedSourceSetProjection,
};
