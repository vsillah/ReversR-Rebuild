// Synthetic in-memory receipts are test doubles, never durable adapter evidence.
const { createHash } = require('node:crypto');
const { METHODS, EXECUTABLE_COMMAND_CARD_ARTIFACT } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const deploymentReference = 'rrb-ref:synthetic-immutable-deployment';
const startUtc = '2030-01-01T00:00:00Z';
const expiresUtc = '2030-01-01T00:30:00Z';
const sessionId = 'synthetic-live-opening-session';

function commandCard() {
  return {
    schemaVersion: 1,
    artifact: EXECUTABLE_COMMAND_CARD_ARTIFACT,
    sourceOnly: false,
    executable: true,
    issued: true,
    authorizedForLiveUse: true,
    productionUploadAdmissionOpeningAuthorized: true,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionReadAuthorized: true,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    externalMessagesAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    productionDeploymentReference: deploymentReference,
    productionOrigin: 'https://reversr.vercel.app',
    productionRoute: 'POST /api/cad/user-import',
    cohortRef: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
    sessionId,
    durableEvidenceSha256: createHash('sha256').update('durable-evidence').digest('hex'),
    openingWindow: {
      startUtc,
      expiresUtc,
      startInclusiveExpiryExclusive: true,
    },
    ceilings: {
      concurrentSessions: 1,
      uploadAttempts: 1,
      retries: 0,
      secondLiveRuns: 0,
    },
    liveExecutionControls: {
      independentExpiryCheckBeforeEveryEffect: true,
      atomicDurableRunClaimRequired: true,
      atomicDurableAttemptClaimRequired: true,
      rollbackImmediatelyAfterWindow: true,
      postRollbackFailClosedSmokeRequired: true,
      unknownOutcomeStopsWithoutRetry: true,
    },
  };
}

function harness({ ledger = new Set(), mutate = () => {}, now } = {}) {
  const card = commandCard();
  const commandCardBytes = JSON.stringify(card);
  const commandCardSha256 = createHash('sha256').update(commandCardBytes).digest('hex');
  const events = [];
  const adapter = Object.fromEntries(METHODS.map(operation => [operation, async input => {
    events.push({ operation, input });
    const receipt = {
      ...input,
      operation,
      ok: true,
      durable: true,
      expiryCheckedAtomically: true,
      explicitLiveGateApproved: true,
      evidenceSha256: card.durableEvidenceSha256,
      independentExpiryEnforced: true,
      atomicClaims: true,
      durableRollbackEnforced: true,
      immutableCurrent: true,
      failClosed: true,
      armed: true,
      bounded: true,
      concurrentSessions: 1,
      open: true,
      consumed: true,
      closed: true,
      revoked: true,
      bodyReads: 0,
      sessionGrants: 0,
      fenceClosed: true,
    };
    if (operation === 'claimRun' || operation === 'claimAttempt') {
      const key = `${input.runFenceKey}:${operation}`;
      receipt.claimed = !ledger.has(key);
      ledger.add(key);
    }
    await mutate(operation, receipt, input);
    return receipt;
  }]));
  const principal = Object.freeze({
    schemaVersion: 1,
    userId: 'synthetic-user',
    shopId: 'synthetic-shop',
    sessionId,
    cadUploadAllowed: true,
  });
  return {
    card,
    commandCardBytes,
    commandCardSha256,
    events,
    adapter,
    principal,
    options: {
      enabled: true,
      commandCardBytes,
      commandCardSha256,
      currentDeploymentReference: deploymentReference,
      adapter,
      now: now || (() => Date.parse(startUtc) + 1000),
    },
  };
}

module.exports = { harness, startUtc, expiresUtc };
