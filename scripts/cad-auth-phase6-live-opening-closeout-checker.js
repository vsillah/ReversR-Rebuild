#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-phase6-live-opening-closeout.json';
const SOURCES = Object.freeze([
  'server/cadProductionSessionCredentialAcceptanceRepair.js',
  'server/cadStartupLiveGateSourceInstallClosure.js',
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'scripts/cad-auth-production-session-credential-acceptance-repair-checker.js',
  'scripts/cad-auth-production-session-credential-acceptance-repair.test.js',
  'scripts/cad-auth-phase6-live-opening-closeout-checker.js',
  'scripts/cad-auth-phase6-live-opening-closeout.test.js',
  'docs/cad-auth-phase6-live-opening-closeout.md',
  '.github/workflows/release-local-ci.yml',
]);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function expectedPacket(readSource = read) {
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-phase6-live-opening-closeout-v1',
    sourceOnlyCloseout: true,
    roadmap: '6/6 complete for bounded admission-path validation',
    status: 'PHASE_6_BOUNDED_ADMISSION_PATH_VALIDATED_DEFAULT_CLOSED',
    purpose:
      'record the final bounded CAD Auth live-opening admission-path result without authorizing upload activation, conversion, Sandbox dispatch, private CAD use, or commercial readiness',
    boundInputs: Object.freeze({
      postMergeRebindRefreshSha256:
        '729138e1933a9c4b3dbed4c532d0b219e607779262e96724cefb5627518cfb6f',
      mainCommit: '8ff2f1fada73b12829c5acfd6950391a96fbe27a',
      productionSessionCredentialAcceptanceRepairPacketSha256:
        'c7b5c97363ac773bf10407640c47ed5ab1b8714be4a2aecf5a0c4b0760b759ab',
      productionSessionCredentialAcceptanceRepairSourceCommit:
        '03cd5f6189b779a1571ad1dfb351edbe9f920d68',
      generatedPrivateCredentialDigestSha256:
        '76c7cb47f616bc2e6a1ca99ad35d534d5c0cdaaba460f26717d79e100d90d87e',
      generatedPrivateCredentialFileRef:
        'rrb-ref:cad-auth-generated-private-session-credential-20261001T190508Z',
      privateSupplyReceiptSha256:
        '6da997122386aefce6c31cd86f060af1a848bae80bfd763eb47b94f61399f150',
      githubProductionDeployment: '6807614500',
      sourceOwnedDeploymentReference:
        'vercel-target:reversr-j5xd23oe3-vsillahs-projects.vercel.app@8ff2f1fada73b12829c5acfd6950391a96fbe27a',
      productionTarget:
        'https://reversr-j5xd23oe3-vsillahs-projects.vercel.app',
      productionAlias: 'https://reversr.vercel.app',
      preOpeningFailClosedSmoke: Object.freeze({
        status: 401,
        code: 'USER_SESSION_REQUIRED',
        observedAtUtc: '2026-10-02T11:44:40Z',
      }),
      durableServiceRef: 'rrb-ref:cad-auth-durable-service-20260928T161754Z',
      boundedSessionRef: 'rrb-ref:cad-upload-internal-mark-test-session-v1',
      sessionId: 'rrb-ref:cad-upload-internal-mark-test-session-v1',
      cohortRef: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
      durableEvidenceDigest:
        '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7',
      privateCredentialSupplyRef:
        'rrb-ref:cad-auth-live-opening-private-session-credential-supply-v1',
      commandCardSha256:
        'bfec248cf98e7202f8d926a519e924a49b280abe214959d90662a8fcbc3cc0ba',
      installationSha256:
        '0f116bf72acd16e3fa1a694ab65f62771a408c7dab4d5d301b1af2036fea5032',
      approvedWindow: Object.freeze({
        startUtc: '2026-10-02T12:30:00Z',
        expiresUtc: '2026-10-02T13:00:00Z',
      }),
    }),
    liveOpeningResult: Object.freeze({
      startedAtUtc: '2026-10-02T12:32:07.220Z',
      afterLiveAttemptAtUtc: '2026-10-02T12:32:07.674Z',
      completedAtUtc: '2026-10-02T12:32:07.912Z',
      insideApprovedWindow: true,
      credentialDigestVerified: true,
      credentialValuePrinted: false,
      credentialValueCommitted: false,
      credentialValueDisclosed: false,
      uploadAttemptCount: 1,
      retryCount: 0,
      secondLiveRun: false,
      admissionOnlyBodyValidation: true,
      publicSyntheticOrAuthorizedTesterCadOnly: true,
      requestBodyContentRecorded: false,
      response: Object.freeze({
        status: 503,
        code: 'USER_UPLOADS_DISABLED',
        responseStatus: 'error',
      }),
      expectedTerminalReached: true,
    }),
    rollbackAndPostSmoke: Object.freeze({
      rollbackFirstControlsAvailable: true,
      runtimeActivationWasFalse: true,
      uploadSessionIssued: false,
      cleanupRequired: false,
      postRollbackFailClosedSmoke: Object.freeze({
        status: 401,
        code: 'USER_SESSION_REQUIRED',
        responseStatus: 'error',
        observedAtUtc: '2026-10-02T12:32:07.912Z',
      }),
      productionDefaultClosedAfterAttempt: true,
    }),
    unauthorizedEffects: Object.freeze({
      providerEnvResourceBillingChanged: false,
      secretsReadBeyondApprovedPrivateCredential: false,
      privateEvidenceRead: false,
      uploadSessionIssued: false,
      productionUploadActivated: false,
      conversionRun: false,
      sandboxDispatched: false,
      privateCadUsed: false,
      externalMessagesSent: false,
      runtimeInstallationActivated: false,
      runtimeActivated: false,
      executableCommandCardIssuedForLiveExecution: false,
      realUserCommercializationClaimed: false,
      commercialReadinessClaimed: false,
    }),
    phase6Closed: true,
    remainingWork: Object.freeze({
      nextRoadmapPhaseRequiredForProductionUploadActivation: true,
      uploadActivationStillClosed: true,
      conversionStillClosed: true,
      sandboxDispatchStillClosed: true,
      privateCadStillClosed: true,
      commercialReadinessStillUnclaimed: true,
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
  const terminal = packet?.liveOpeningResult?.response?.code === 'USER_UPLOADS_DISABLED'
    && packet?.rollbackAndPostSmoke?.postRollbackFailClosedSmoke?.code
      === 'USER_SESSION_REQUIRED';
  const safe = packet?.liveOpeningResult?.credentialValuePrinted === false
    && packet?.liveOpeningResult?.credentialValueDisclosed === false
    && packet?.unauthorizedEffects?.conversionRun === false
    && packet?.unauthorizedEffects?.sandboxDispatched === false
    && packet?.unauthorizedEffects?.privateCadUsed === false
    && packet?.unauthorizedEffects?.commercialReadinessClaimed === false;
  const ok = matches && terminal && safe && packet?.phase6Closed === true;
  return Object.freeze({
    ok,
    code: ok
      ? 'CAD_AUTH_PHASE6_LIVE_OPENING_CLOSEOUT_VALID_DEFAULT_CLOSED'
      : 'CAD_AUTH_PHASE6_LIVE_OPENING_CLOSEOUT_BLOCKED',
    phase6Closed: ok,
    terminalReached: terminal === true,
    privateCredentialValuePrinted: false,
    uploadAttemptCount: packet?.liveOpeningResult?.uploadAttemptCount ?? null,
    retryCount: packet?.liveOpeningResult?.retryCount ?? null,
    secondLiveRun: packet?.liveOpeningResult?.secondLiveRun ?? null,
    postRollbackFailClosed: packet?.rollbackAndPostSmoke?.postRollbackFailClosedSmoke?.code
      === 'USER_SESSION_REQUIRED',
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
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  checkPacket,
  expectedPacket,
  sourceBindings,
};
