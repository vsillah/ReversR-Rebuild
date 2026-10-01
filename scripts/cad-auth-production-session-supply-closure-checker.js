const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
} = require('../server/cadProductionExecutionBindingInstallation');
const {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  CREDENTIAL_DERIVATION_STOP_DISPOSITION_SHA256,
  CREDENTIAL_SUPPLY_STOP_DISPOSITION_SHA256,
  DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE,
  PRIVATE_CREDENTIAL_PLACEHOLDER_PATH_REF,
  PRIVATE_CREDENTIAL_READ_STOP_DISPOSITION_SHA256,
  REVIEWED_COHORT_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DIGEST_BOUND_SESSION_CREDENTIAL_PRECONDITION_SHA256,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createProductionSessionSupplyClosure,
  createSanitizedCredentialProof,
} = require('../server/cadProductionSessionSupplyClosure');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-production-session-supply-closure.json';
const SOURCES = Object.freeze([
  'server/cadProductionSessionSupplyClosure.js',
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/cadStartupLiveGateSourceInstallClosure.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/uploadSession.js',
  'server/uploadSessionStore.js',
  'server/cadUserUploadRouter.js',
  'server/index.js',
  'scripts/cad-auth-production-session-supply-closure-checker.js',
  'scripts/cad-auth-production-session-supply-closure.test.js',
  'docs/cad-auth-production-session-supply-closure.md',
  '.github/workflows/release-local-ci.yml',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function defaultClosureProof() {
  const closure = createProductionSessionSupplyClosure();
  return Object.freeze({
    sourceAccepted: closure.sourceAccepted === true,
    credentialDerivationRejected: closure.credentialDerivationRejected === true,
    existingDigestSupplyAccepted: closure.existingDigestSupplyAccepted === true,
    futurePrivateGenerationRebindRequired:
      closure.futurePrivateGenerationRebindRequired === true,
    credentialValueIncluded: closure.credentialValueIncluded === true,
    credentialValueDisclosed: closure.credentialValueDisclosed === true,
    credentialValueStoredInSource: closure.credentialValueStoredInSource === true,
    uploadSessionIssued: closure.uploadSessionIssued === true,
    productionUploadActivated: closure.productionUploadActivated === true,
    requestBodyAdmittedOrRead: closure.requestBodyAdmittedOrRead === true,
    runtimeActivated: closure.runtimeActivated === true,
    effectsExecuted: closure.effectsExecuted,
  });
}

function sanitizedSupplyProof() {
  const closure = createProductionSessionSupplyClosure({
    credentialProof: createSanitizedCredentialProof({
      credentialSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
    }),
  });
  return Object.freeze({
    sourceAccepted: closure.sourceAccepted === true,
    sanitizedDigestProofAccepted: closure.existingDigestSupplyAccepted === true,
    futurePrivateGenerationRebindRequired:
      closure.futurePrivateGenerationRebindRequired === true,
    credentialValueIncluded: closure.credentialValueIncluded === true,
    uploadSessionIssued: closure.uploadSessionIssued === true,
    requestBodyAdmittedOrRead: closure.requestBodyAdmittedOrRead === true,
    effectsExecuted: closure.effectsExecuted,
  });
}

function secretLeakRejectionProof() {
  const closure = createProductionSessionSupplyClosure({
    credentialProof: {
      ...createSanitizedCredentialProof({
        credentialSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      }),
      credential: 'PRIVATE_SENTINEL',
    },
  });
  const sourceClosure = createProductionSessionSupplyClosure({
    source: {
      ...DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE,
      token: 'PRIVATE_SENTINEL',
    },
  });
  return Object.freeze({
    credentialProofWithPrivateFieldAccepted:
      closure.existingDigestSupplyAccepted === true,
    sourceWithPrivateFieldAccepted: sourceClosure.sourceAccepted === true,
    uploadSessionIssued: closure.uploadSessionIssued === true || sourceClosure.uploadSessionIssued === true,
    requestBodyAdmittedOrRead:
      closure.requestBodyAdmittedOrRead === true
      || sourceClosure.requestBodyAdmittedOrRead === true,
    effectsExecuted: closure.effectsExecuted + sourceClosure.effectsExecuted,
  });
}

function staleDigestRejectionProof() {
  const closure = createProductionSessionSupplyClosure({
    credentialProof: createSanitizedCredentialProof({
      credentialSha256: '0'.repeat(64),
    }),
  });
  return Object.freeze({
    staleDigestAccepted: closure.existingDigestSupplyAccepted === true,
    derivationRejected: closure.credentialDerivationRejected === true,
    uploadSessionIssued: closure.uploadSessionIssued === true,
    effectsExecuted: closure.effectsExecuted,
  });
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosureProof();
  const sanitizedProof = sanitizedSupplyProof();
  const leakProof = secretLeakRejectionProof();
  const staleProof = staleDigestRejectionProof();
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-production-session-supply-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'PRODUCTION_SESSION_SUPPLY_CLOSURE_PREPARED_DEFAULT_CLOSED',
    purpose:
      'prepare the source-owned production session credential supply contract after the approved live-opening attempt stopped because no private bearer credential value existed for the digest-bound precondition',
    boundInputs: Object.freeze({
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
      credentialSupplyStopDispositionSha256: CREDENTIAL_SUPPLY_STOP_DISPOSITION_SHA256,
      privateCredentialReadStopDispositionSha256:
        PRIVATE_CREDENTIAL_READ_STOP_DISPOSITION_SHA256,
      credentialDerivationStopDispositionSha256:
        CREDENTIAL_DERIVATION_STOP_DISPOSITION_SHA256,
      mainCommit: REVIEWED_MAIN_COMMIT,
      vercelDeploymentReference: REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
      sourceOwnedDeploymentReference: REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
      productionTarget: REVIEWED_PRODUCTION_TARGET,
      productionAlias: 'https://reversr.vercel.app',
      commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
      installationSha256: REVIEWED_INSTALLATION_SHA256,
      boundedSessionRef: BOUNDED_SESSION_REF,
      sessionId: BOUNDED_SESSION_REF,
      cohortRef: REVIEWED_COHORT_REF,
      durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
      durableServiceRef: DURABLE_SERVICE_REF,
      sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      digestBoundSessionCredentialPreconditionSha256:
        REVIEWED_DIGEST_BOUND_SESSION_CREDENTIAL_PRECONDITION_SHA256,
      privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
      privateCredentialFileRef: PRIVATE_CREDENTIAL_PLACEHOLDER_PATH_REF,
      privateSupplyReceiptSha256: REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
      reviewedWindow: REVIEWED_WINDOW,
    }),
    supplyPolicy: Object.freeze({
      credentialDerivationFromDigestPermitted: false,
      publicSourceCredentialEmbeddingPermitted: false,
      privateCredentialValueDisclosurePermitted: false,
      uploadSessionIssuanceAuthorized: false,
      productionUploadActivationAuthorized: false,
      requestBodyAdmissionAuthorized: false,
      acceptedModes: DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE.acceptedSupplyModes,
      rejectedModes: DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE.rejectedSupplyModes,
    }),
    defaultClosureProof: defaultProof,
    sanitizedSupplyProof: sanitizedProof,
    secretLeakRejectionProof: leakProof,
    staleDigestRejectionProof: staleProof,
    productionSessionSupplyClosurePrepared:
      defaultProof.sourceAccepted === true
      && defaultProof.credentialDerivationRejected === true
      && defaultProof.existingDigestSupplyAccepted === false
      && defaultProof.futurePrivateGenerationRebindRequired === true
      && defaultProof.credentialValueIncluded === false
      && defaultProof.credentialValueDisclosed === false
      && defaultProof.credentialValueStoredInSource === false
      && defaultProof.uploadSessionIssued === false
      && defaultProof.productionUploadActivated === false
      && defaultProof.requestBodyAdmittedOrRead === false
      && defaultProof.runtimeActivated === false
      && defaultProof.effectsExecuted === 0
      && sanitizedProof.sourceAccepted === true
      && sanitizedProof.sanitizedDigestProofAccepted === true
      && sanitizedProof.futurePrivateGenerationRebindRequired === false
      && sanitizedProof.credentialValueIncluded === false
      && sanitizedProof.uploadSessionIssued === false
      && sanitizedProof.requestBodyAdmittedOrRead === false
      && sanitizedProof.effectsExecuted === 0
      && leakProof.credentialProofWithPrivateFieldAccepted === false
      && leakProof.sourceWithPrivateFieldAccepted === false
      && leakProof.uploadSessionIssued === false
      && leakProof.requestBodyAdmittedOrRead === false
      && leakProof.effectsExecuted === 0
      && staleProof.staleDigestAccepted === false
      && staleProof.derivationRejected === true
      && staleProof.uploadSessionIssued === false
      && staleProof.effectsExecuted === 0,
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    runtimeInstallationActivated: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    effectsExecuted: 0,
    unresolvedForLiveOpening: Object.freeze([
      'private bearer credential value for current digest was not found',
      'digest-only credential preimage cannot be derived',
      'future live gate must either supply the exact private value or generate a new private bearer and rebind its digest',
      'new production window and fail-closed smoke remain required after merge',
    ]),
    nextGate: Object.freeze({
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebindRefresh: true,
      requiresPrivateCredentialSupplyOrGenerationApprovalBeforeLiveOpening: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge production session supply closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to production session supply closure packet SHA-256 <sessionSupplyClosurePacketSha256> at source commit <sessionSupplyClosureSourceCommit>, stopped live-opening disposition SHA-256 b9b92d6832892c64c8ad4dc2889d81297d4afb9d03e93f10792e2fc8d1770036, approved live-opening refresh SHA-256 e4cf5425e1d4459acc24f5580e96d98ae9829cf2b298cf6861df5c5f859e79ad, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed source-owned production session supply contract remains default-closed, rejects credential derivation and public credential embedding, preserves the exact private credential supply requirement, and recomputes current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply or generation requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the remaining credential supply blocker is explicit and source-owned without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved production session supply closure, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply or generation requirement, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    }),
    stopConditions: Object.freeze([
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'unresolvedProductionSessionSupplyClosure',
      'unresolvedDigest',
      'privateDataLeakageRisk',
      'missingExactPrivateCredentialSupplyOrGenerationRequirement',
      'missingInstallationSha256',
      'runtimeCredentialsOrProviderConfigurationNeeded',
    ]),
    sourceBindings: sourceBindings(readSource),
  });
}

function checkPacket(packet, readSource = read) {
  let ok = false;
  try {
    ok = isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch {
    ok = false;
  }
  return Object.freeze({
    ok,
    code: ok
      ? 'PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_VALID_DEFAULT_CLOSED'
      : 'PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_BLOCKED',
    effectsExecuted: 0,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
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
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  checkPacket,
  defaultClosureProof,
  expectedPacket,
  sanitizedSupplyProof,
  secretLeakRejectionProof,
  sourceBindings,
  staleDigestRejectionProof,
};
