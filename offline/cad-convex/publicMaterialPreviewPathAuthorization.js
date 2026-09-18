function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectPublicMaterialPreviewPathAuthorization(packet, previewFixture) {
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-public-material-preview-path-authorization'
    && packet?.status === 'PUBLIC_MATERIAL_PREVIEW_PATH_AUTHORIZED_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.production === false
    && packet?.baseMainCommit === 'a572e9b221765091dda94a0d58631da9a66f1f78'
    && packet?.branch === 'codex/cad-public-material-preview-path';

  const decisionValid = packet?.humanProductDecision?.authorized === true
    && packet?.humanProductDecision?.publicMaterialsOnly === true
    && packet?.humanProductDecision?.pathType === 'anyone-with-link non-production Vercel preview'
    && packet?.humanProductDecision?.realUserEnrollmentAuthorized === false
    && packet?.humanProductDecision?.externalDeliveryAuthorized === false;

  const routeGuarded = packet?.route?.query === '?cadPreview=mark-dispenser-v1'
    && packet?.route?.blockedProductionHostname === 'reversr.vercel.app'
    && packet?.route?.sourceSha256 === 'fd5161b9cf966042bf3bdc36c2e08025f22f34bccf40b2544c16f5ca96a1e050'
    && packet?.route?.testSha256 === '290825107c94110e7931d0b2445650d43c679cf7ba6532078d2ed078ca3609ee';

  const fixtureManifestBound = previewFixture?.fixtureId === packet?.publicFixture?.fixtureId
    && previewFixture?.authorization?.scope === packet?.publicFixture?.redistributionScope
    && previewFixture?.source?.sha256 === packet?.publicFixture?.source?.sha256
    && previewFixture?.derivedDisplayMesh?.sha256
      === packet?.publicFixture?.derivedDisplayMesh?.sha256
    && previewFixture?.derivedDisplayMesh?.watertight === false;

  const fixtureAssetsBound = packet?.publicFixture?.source?.bytes === 701346
    && packet?.publicFixture?.source?.sha256
      === '1e52b301cf33bc241cd0d3d039691236ab45116f439197820f690b424750f0b8'
    && packet?.publicFixture?.derivedDisplayMesh?.bytes === 131784
    && packet?.publicFixture?.derivedDisplayMesh?.sourceSha256
      === packet?.publicFixture?.source?.sha256
    && packet?.publicFixture?.references?.length === 4;

  const readinessBound = packet?.boundReadiness?.integratedUploadConversionReadiness
      ?.componentEvidenceChainBound === true
    && packet?.boundReadiness?.integratedUploadConversionReadiness
      ?.readyForProductionUploadActivation === false
    && packet?.boundReadiness?.integratedUploadConversionReadiness
      ?.readyForProductionConversion === false
    && packet?.boundReadiness?.integratedUploadConversionReadiness?.sourceSha256
      === '428b71c9f161f4f8089191c7e61447c605cf8d2669e78c80eda31ec081a2e6e3'
    && packet?.boundReadiness?.internalTesterPreviewDecision?.sourceSha256
      === '10e016d4c521c507ba4debd9849ee02970b632f59dff82c8bce6190482f87d27';

  const qaEvidenceBound = packet?.boundReadiness?.phaseProgressionQa?.walkthroughSha256
      === 'dfd0e88d7678852d8fcbaaee050865e26f6c4f11b34fe8107b3aa21524e8f6be'
    && packet?.boundReadiness?.neutralGridQa?.walkthroughSha256
      === '7293c0ebcbee9d05fc61a863e79e62a91e471f190ffda7378a47d6d0763e3992'
    && packet?.boundReadiness?.phaseProgressionQa?.viewerResultsSha256
      === '8942c6cca4a87ac50b536a02dd29a54b20ca7c7f72292e209dc2115d3058c6c9'
    && packet?.boundReadiness?.neutralGridQa?.resultsSha256
      === '58da1f5c9ac94e1ef4f9c5dc212ed38d857a04fca825ada54170bb0f45f9a0fd';

  const limitsPreserved = packet?.limits?.dimensionalInspectionAuthorized === false
    && packet?.limits?.manufacturingCertificationAuthorized === false
    && packet?.limits?.arbitraryCadSupportClaimed === false
    && packet?.limits?.privateCadAuthorized === false
    && packet?.scopeConclusion?.requiresNewProviderRun === false
    && packet?.scopeConclusion?.requiresUploadActivation === false
    && packet?.scopeConclusion?.requiresProductionConversion === false
    && packet?.scopeConclusion?.requiresRealUserAccount === false;

  const authoritiesClosed = allFalse(packet?.authorityPreserved);

  return {
    structureValid,
    decisionValid,
    routeGuarded,
    fixtureManifestBound,
    fixtureAssetsBound,
    readinessBound,
    qaEvidenceBound,
    limitsPreserved,
    authoritiesClosed,
    readyForPreviewPublication: structureValid
      && decisionValid
      && routeGuarded
      && fixtureManifestBound
      && fixtureAssetsBound
      && readinessBound
      && qaEvidenceBound
      && limitsPreserved
      && authoritiesClosed,
    externalDeliveryAuthorized: false,
    realUserEnrollmentAuthorized: false,
    productionUploadActivationAuthorized: false,
    productionConversionAuthorized: false,
  };
}

module.exports = { inspectPublicMaterialPreviewPathAuthorization };
