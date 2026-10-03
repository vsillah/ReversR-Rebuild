#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256,
  APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256,
  DIGEST_DRIFT_REPAIR_MAIN_COMMIT,
  DIGEST_DRIFT_REPAIR_PRODUCTION_TARGET,
  DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  DIGEST_DRIFT_REPAIR_WINDOW,
  OBSERVED_DIGEST_DRIFT_COMMAND_CARD_SHA256,
  OBSERVED_DIGEST_DRIFT_INSTALLATION_SHA256,
  STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_ATTEMPT_UTC,
  createCadControlledUploadDigestDriftRepairReview,
} = require('../server/cadControlledUploadDigestDriftRepair');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-controlled-upload-digest-drift-repair.json';
const SOURCES = Object.freeze([
  '.github/workflows/release-local-ci.yml',
  'server/index.js',
  'server/cadControlledUploadDigestDriftRepair.js',
  'server/cadControlledUploadObservableGateWiringRepair.js',
  'server/cadControlledInternalUploadActivation.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadLiveOpeningCredentialClosureMetadataPolicy.js',
  'server/cadUserUploadRouter.js',
  'docs/cad-auth-controlled-upload-digest-drift-repair.md',
  'scripts/cad-auth-controlled-upload-digest-drift-repair-checker.js',
  'scripts/cad-auth-controlled-upload-digest-drift-repair.test.js',
]);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function proofDeploymentMetadata() {
  return Object.freeze({
    schemaVersion: 1,
    source: 'vercel-system-environment',
    deploymentReference: 'dpl_SourceOwnedDigestDriftRepair123',
    deploymentTarget: DIGEST_DRIFT_REPAIR_PRODUCTION_TARGET,
    projectProductionTarget: 'https://reversr.vercel.app',
    gitCommitSha: DIGEST_DRIFT_REPAIR_MAIN_COMMIT,
    gitCommitRef: 'main',
    gitRepo: 'ReversR-Rebuild',
    gitOwner: 'vsillah',
    vercelEnv: 'production',
    secretBearing: false,
  });
}

function serverStartupUsesDigestDriftRepair(readSource = read) {
  const index = readSource('server/index.js').toString('utf8');
  const repair = readSource('server/cadControlledUploadDigestDriftRepair.js').toString('utf8');
  return /createCadControlledUploadDigestDriftRepairActivationMount/.test(index)
    && /controlledInternalUploadActivationMount:\s*\(\{ baseRuntimeMount \}\)\s*=>/.test(index)
    && /createCadControlledUploadDigestDriftRepairActivationMount\(\{ baseRuntimeMount \}\)/.test(index)
    && /createSourceOwnedControlledUploadDeploymentMetadata/.test(repair)
    && /createDerivedDeploymentReference/.test(repair)
    && /providerDeploymentIdIsProvenanceOnly/.test(repair);
}

function expectedPacket(readSource = read) {
  const review = createCadControlledUploadDigestDriftRepairReview({
    deploymentMetadata: proofDeploymentMetadata(),
  });
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-controlled-upload-digest-drift-repair-packet-v1',
    sourceOnly: true,
    roadmap: 'Phase 7 controlled internal upload activation digest drift repair',
    status: review.status,
    purpose:
      'repair the deployed startup/default controlled upload path so observable proof headers use the same source-owned deployment reference bound by the live activation approval phrase',
    stoppedAttempt: Object.freeze({
      observedAtUtc: STOPPED_CONTROLLED_UPLOAD_DIGEST_DRIFT_ATTEMPT_UTC,
      terminalCode: 'USER_UPLOADS_DISABLED',
      observedCommandCardSha256: OBSERVED_DIGEST_DRIFT_COMMAND_CARD_SHA256,
      observedInstallationSha256: OBSERVED_DIGEST_DRIFT_INSTALLATION_SHA256,
      postRollbackFailClosedSmokePassed: true,
    }),
    expectedReboundProof: Object.freeze({
      sourceOwnedDeploymentReference:
        DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
      openingWindow: DIGEST_DRIFT_REPAIR_WINDOW,
      commandCardSha256: APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256,
      installationSha256: APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256,
    }),
    review,
    serverStartupUsesDigestDriftRepair: serverStartupUsesDigestDriftRepair(readSource),
    authorizes: Object.freeze({
      sourceOnlyDocsTestsCheckersManifests: true,
      localValidation: true,
      draftPrAfterExplicitApproval: true,
      greenCheckMergeAfterExplicitApproval: true,
      normalVercelDeploymentFromMainAfterExplicitApproval: true,
      productionFailClosedSmokeAfterExplicitApproval: true,
      productionUploadActivation: false,
      requestBodyAdmissionOrRead: false,
      privateCredentialRead: false,
      uploadSessionIssuance: false,
      conversionDispatch: false,
      sandboxDispatch: false,
      privateCadUse: false,
      runtimeInstallationActivation: false,
      executableCommandCardIssuance: false,
      externalMessages: false,
      liveRetry: false,
      secondLiveRun: false,
      realUserCommercialization: false,
      commercialReadinessClaim: false,
    }),
    sourceBindings: sourceBindings(readSource),
  });
}

function checkPacket(packet, readSource = read) {
  let matches = false;
  try {
    matches = isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch {
    matches = false;
  }
  const resolved = packet?.status === 'CONTROLLED_UPLOAD_DIGEST_DRIFT_REPAIR_READY_SOURCE_ONLY'
    && packet?.review?.repair?.sourceOwnedDeploymentReferenceResolved === true
    && packet?.review?.repair?.commandCardDigestReboundToSourceOwnedReference === true
    && packet?.review?.repair?.installationDigestReboundToSourceOwnedReference === true
    && packet?.serverStartupUsesDigestDriftRepair === true;
  const closed = packet?.authorizes?.productionUploadActivation === false
    && packet?.authorizes?.requestBodyAdmissionOrRead === false
    && packet?.authorizes?.privateCredentialRead === false
    && packet?.authorizes?.uploadSessionIssuance === false
    && packet?.authorizes?.conversionDispatch === false
    && packet?.authorizes?.sandboxDispatch === false
    && packet?.authorizes?.liveRetry === false
    && packet?.authorizes?.secondLiveRun === false
    && packet?.authorizes?.commercialReadinessClaim === false;
  const serialized = JSON.stringify(packet || {});
  const noPrivateLeakage =
    !/PRIVATE_SENTINEL|CAD_SENTINEL|\/Users\/|\.local\/|private-session-credential|contentBase64/i
      .test(serialized);
  const ok = matches && resolved && closed && noPrivateLeakage;
  return Object.freeze({
    ok,
    code: ok
      ? 'CAD_AUTH_CONTROLLED_UPLOAD_DIGEST_DRIFT_REPAIR_VALID_SOURCE_ONLY'
      : 'CAD_AUTH_CONTROLLED_UPLOAD_DIGEST_DRIFT_REPAIR_BLOCKED',
    resolved,
    serverStartupUsesDigestDriftRepair:
      packet?.serverStartupUsesDigestDriftRepair === true,
    sourceOwnedDeploymentReferenceResolved:
      packet?.review?.repair?.sourceOwnedDeploymentReferenceResolved === true,
    commandCardDigestReboundToSourceOwnedReference:
      packet?.review?.repair?.commandCardDigestReboundToSourceOwnedReference === true,
    installationDigestReboundToSourceOwnedReference:
      packet?.review?.repair?.installationDigestReboundToSourceOwnedReference === true,
    privateLeakageDetected: !noPrivateLeakage,
  });
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) {
      throw Error('INVALID_MODE');
    }
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), `${JSON.stringify(expectedPacket(), null, 2)}\n`);
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({
      ...result,
      ...(result.ok ? { packetSha256: sha(bytes) } : {}),
    }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ok: false,
      code: 'CAD_AUTH_CONTROLLED_UPLOAD_DIGEST_DRIFT_REPAIR_CHECKER_ERROR',
      resolved: false,
    }));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  checkPacket,
  expectedPacket,
  proofDeploymentMetadata,
  serverStartupUsesDigestDriftRepair,
  sourceBindings,
};
