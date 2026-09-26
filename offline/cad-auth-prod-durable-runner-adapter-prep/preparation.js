// Source-only durable adapter preparation. No runtime mount, provider calls or body IO.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData, preparation: openingPreparation } =
  require('../cad-auth-prod-opening-prep/preparation');
const { prepareCommandCard, adapterContract } =
  require('../cad-auth-prod-executable-runner/preparation');
const { runnerSourcePacket } =
  require('../cad-auth-prod-executable-runner-source/preparation');

const SOURCE_COMMIT = 'ac6534162a6ef0057ee945b15a9079218f4431ba';
const EXECUTABLE_RUNNER_PACKET_SHA256 = '5d613e1c1064fecf3c14a7810dc4c3453a45be82905cc7060f8cf1ae1a67603b';
const EXECUTABLE_RUNNER_SOURCE_PACKET_SHA256 = 'f0d9db455a4cdeb7924e80a162a27730878f55efcd7d189c363d13b42efa0ed2';

const DURABLE_RECEIPTS = Object.freeze([
  'freshApprovalReviewReceipt',
  'immutableTargetReceipt',
  'closedBaselineReceipt',
  'adapterSourceReviewReceipt',
  'independentExpiryReceipt',
  'atomicLedgerReceipt',
  'sessionAdmissionReceipt',
  'rollbackSmokeReceipt',
]);
const CLOSED_FLAGS = Object.freeze({
  sourceOnly: true,
  enabled: false,
  runtimeMounted: false,
  defaultAdapterMounted: false,
  liveExecutionReady: false,
  liveExecutionAuthorized: false,
  commandCardIssuanceAuthorized: false,
  uploadSessionIssuanceAuthorized: false,
  productionUploadActivationAuthorized: false,
  requestBodyAdmissionReadAuthorized: false,
  cleanupAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  privateCadUseAuthorized: false,
  retryAuthorized: false,
  secondRunAuthorized: false,
  realUserCommercializationAuthorized: false,
  effectsExecuted: 0,
});
const EXACT_KEYS = Object.freeze([
  'digests',
  'startUtc',
  'expiresUtc',
  'maxDurationSeconds',
  'runLedgerKey',
  'attemptLedgerKey',
]);
const DIGEST_KEYS = Object.freeze([
  'approval',
  'source',
  'packet',
  'rollup',
  'provenance',
  'receipts',
  'deployment',
  'route',
  'cohort',
  'run',
  'session',
  'reviewer',
  'custody',
  'rollback',
]);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const utc = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

function validBinding(input) {
  return plainContractData(input)
    && exact(input, EXACT_KEYS)
    && exact(input.digests, DIGEST_KEYS)
    && DIGEST_KEYS.every(key => digest(input.digests[key]))
    && utc(input.startUtc)
    && utc(input.expiresUtc)
    && Number.isSafeInteger(input.maxDurationSeconds)
    && input.maxDurationSeconds > 0
    && Date.parse(input.expiresUtc) > Date.parse(input.startUtc)
    && Date.parse(input.expiresUtc) - Date.parse(input.startUtc) <= input.maxDurationSeconds * 1000
    && id(input.runLedgerKey)
    && id(input.attemptLedgerKey)
    && input.runLedgerKey !== input.attemptLedgerKey;
}
function canonicalBinding(input) {
  return {
    digests: Object.fromEntries(DIGEST_KEYS.map(key => [key, input.digests[key]])),
    startUtc: input.startUtc,
    expiresUtc: input.expiresUtc,
    maxDurationSeconds: input.maxDurationSeconds,
    runLedgerKey: input.runLedgerKey,
    attemptLedgerKey: input.attemptLedgerKey,
  };
}
function durableAdapterContract() {
  return {
    implemented: 'source-only-preparation',
    mounted: false,
    runtimeAdapter: null,
    callbacksAccepted: false,
    storage: 'durable-ledger-required-but-not-installed-by-this-packet',
    atomicity: {
      runClaim: { key: 'runLedgerKey', maxWinners: 1, compareAndSetRequired: true },
      attemptClaim: { key: 'attemptLedgerKey', maxWinners: 1, compareAndSetRequired: true },
      unknownMutationOutcome: 'retain tombstone, close fence, no retry',
      crossProcessDurabilityRequired: true,
      crashRecoveryRequired: true,
    },
    expiry: {
      independentClockRequired: true,
      startInclusive: true,
      expiryExclusive: true,
      recheckBeforeEveryEffect: true,
      crashClosureReceiptRequired: true,
      closureAllowedAfterExpiry: true,
    },
    rollback: {
      idempotentCloseRequired: true,
      idempotentSessionRevokeRequired: true,
      lateGrantObserverRequired: true,
      retainedRunAndAttemptTombstonesRequired: true,
      postRollbackFailClosedSmokeRequired: true,
    },
    receiptRequirements: DURABLE_RECEIPTS,
    forbiddenByDefault: [
      'provider/env/resource/billing changes',
      'secret reads',
      'upload-session issuance',
      'production upload activation',
      'request body admission or read',
      'conversion',
      'Sandbox dispatch',
      'private CAD payload use',
      'runtime activation',
      'live command-card issuance',
      'external messages',
      'retry or second live run',
      'commercial-readiness claim',
    ],
  };
}
function durableRunnerAdapterPacket() {
  const opening = openingPreparation();
  const runnerSource = runnerSourcePacket();
  return {
    schemaVersion: 1,
    packet: 'cad-auth-prod-durable-runner-adapter-prep-v1',
    sourceCommit: SOURCE_COMMIT,
    sourceOnly: true,
    parentPackets: {
      executableRunnerPacketSha256: EXECUTABLE_RUNNER_PACKET_SHA256,
      executableRunnerSourcePacketSha256: EXECUTABLE_RUNNER_SOURCE_PACKET_SHA256,
      runnerSourceStatus: runnerSource.sourceImplementationStatus,
    },
    ...CLOSED_FLAGS,
    durableAdapter: durableAdapterContract(),
    commandCardIssuancePreparation: {
      templateOnly: true,
      issued: false,
      issuer: null,
      requiredBindingKeys: EXACT_KEYS,
      requiredDigestKeys: DIGEST_KEYS,
      requiredDurableReceipts: DURABLE_RECEIPTS,
      draftMayBeComputedLocally: true,
      draftIsNotExecutable: true,
      separateLiveOpeningApprovalRequired: true,
    },
    rollback: opening.rollback,
    postRollbackSmoke: opening.postRollbackSmoke,
    nextGate: {
      authorized: false,
      requiredGate: 'bounded-source-only-durable-adapter-evidence-and-command-card-review',
      exactApprovalPhraseNeeded: true,
      mustBindFreshAdapterPacketSha256: true,
      mustBindImmutableProductionDeployment: true,
      mustBindIndependentExpiryEvidence: true,
      mustBindDurableLedgerEvidence: true,
      mustBindPostRollbackSmokeEvidence: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
  };
}
function prepareDurableCommandCardDraft(input) {
  try {
    if (!validBinding(input)) throw Error();
    const binding = canonicalBinding(input);
    const sourceBinding = {
      digests: binding.digests,
      startUtc: binding.startUtc,
      expiresUtc: binding.expiresUtc,
      maxDurationSeconds: binding.maxDurationSeconds,
    };
    const sourceCandidate = prepareCommandCard(sourceBinding).candidate;
    if (!sourceCandidate) throw Error();
    const bindingSha256 = sha(binding);
    return {
      ...CLOSED_FLAGS,
      code: 'DURABLE_COMMAND_CARD_DRAFT_ONLY',
      bindingSha256,
      draft: {
        kind: 'non-executable-durable-adapter-command-card-draft',
        binding,
        bindingSha256,
        sourceCandidateSha256: sourceCandidate.bindingSha256,
        durableAdapterContractSha256: sha(durableAdapterContract()),
        oneSession: true,
        oneAttempt: true,
        retries: 0,
        issued: false,
        executable: false,
        requiredReceipts: DURABLE_RECEIPTS,
        closeoutRequiredBeforeCleanup: true,
      },
    };
  } catch {
    return { ...CLOSED_FLAGS, code: 'INVALID_DURABLE_COMMAND_CARD_DRAFT', bindingSha256: null, draft: null };
  }
}
function validateDurableReceiptPlan(input) {
  try {
    if (!plainContractData(input) || !exact(input, ['bindingSha256', 'receipts', 'observerDeltas'])) throw Error();
    if (!digest(input.bindingSha256) || !exact(input.receipts, DURABLE_RECEIPTS)) throw Error();
    for (const key of DURABLE_RECEIPTS) if (!digest(input.receipts[key])) throw Error();
    if (!isDeepStrictEqual(input.observerDeltas, {
      bodyReads: 0,
      sessionsIssued: 0,
      conversions: 0,
      sandboxDispatches: 0,
      retries: 0,
      secondRuns: 0,
    })) throw Error();
    return { ...CLOSED_FLAGS, code: 'DURABLE_RECEIPT_PLAN_VALID', receiptPlanSha256: sha(input) };
  } catch {
    return { ...CLOSED_FLAGS, code: 'INVALID_DURABLE_RECEIPT_PLAN', receiptPlanSha256: null };
  }
}

module.exports = {
  SOURCE_COMMIT,
  EXECUTABLE_RUNNER_PACKET_SHA256,
  EXECUTABLE_RUNNER_SOURCE_PACKET_SHA256,
  DURABLE_RECEIPTS,
  DIGEST_KEYS,
  EXACT_KEYS,
  CLOSED_FLAGS,
  durableAdapterContract,
  durableRunnerAdapterPacket,
  prepareDurableCommandCardDraft,
  validateDurableReceiptPlan,
};
