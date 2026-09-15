// Source-only transport diagnostics for the bounded qualification operator bridge.
// No provider client, environment lookup, shell execution or network transport.
const packet = require('./boundedDevQualificationExecutor.json');

const MUTATION_METHODS = new Set(['initialize', 'transact', 'changeAuthority', 'claim', 'scanPage', 'stop']);
const FAILURE_CLASSES = Object.freeze([
  'CLI_TIMEOUT',
  'CLI_INTERRUPTED',
  'CLI_NETWORK_UNAVAILABLE',
  'CLI_OUTPUT_PARSE_FAILED',
  'CLI_FUNCTION_ERROR',
  'CLI_EXIT_NONZERO',
  'CLI_TRANSPORT_UNKNOWN',
  'CLI_MUTATION_NO_COMMIT_OBSERVED',
  'CLI_MUTATION_COMMIT_OBSERVED',
  'READ_ONLY_RECONCILIATION_INCONCLUSIVE',
]);
const DIGEST = /^[a-f0-9]{64}$/;
const SAFE_TEXT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safe = value => typeof value === 'string' && SAFE_TEXT.test(value) ? value : null;
const digest = value => typeof value === 'string' && DIGEST.test(value) ? value : null;
const integer = value => Number.isSafeInteger(value) ? value : null;
const bool = value => value === true || value === false ? value : null;

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach(item => collectStrings(item, output));
  else if (isObject(value)) Object.values(value).forEach(item => collectStrings(item, output));
  return output;
}

function leaksPrivatePattern(value) {
  return collectStrings(value).some(text => /\/Users\//.test(text)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)
    || /(?:sk_live_|ghp_|github_pat_)[A-Za-z0-9_]{16,}/.test(text)
    || /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(text));
}

function methodKind(method) {
  const name = safe(method);
  if (!name) return 'unknown';
  return MUTATION_METHODS.has(name) ? 'mutation' : 'query';
}

function rawDiagnosticText(input) {
  return collectStrings({
    stdout: input.stdout,
    stderr: input.stderr,
    errorMessage: input.errorMessage,
    cause: input.cause,
  }).join('\n').toLowerCase();
}

function inferTransportFailureClass(input = {}) {
  const text = rawDiagnosticText(input);
  const errorCode = safe(input.errorCode);
  const signal = safe(input.signal);
  if (input.timedOut === true || errorCode === 'ETIMEDOUT' || /timed out|timeout/.test(text))
    return 'CLI_TIMEOUT';
  if (signal) return 'CLI_INTERRUPTED';
  if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(errorCode)
    || /fetch failed|network|socket|connection|econnreset|enotfound|eai_again|econnrefused/.test(text))
    return 'CLI_NETWORK_UNAVAILABLE';
  if (input.parseError === true || /unexpected token|json parse|invalid json|not valid json/.test(text))
    return 'CLI_OUTPUT_PARSE_FAILED';
  if (safe(input.functionCode) || /engine_invalid|function.*not found|could not find function/.test(text))
    return 'CLI_FUNCTION_ERROR';
  if (Number.isSafeInteger(input.exitCode) && input.exitCode !== 0) return 'CLI_EXIT_NONZERO';
  return 'CLI_TRANSPORT_UNKNOWN';
}

function classifyConvexCliTransportFailure(input = {}) {
  const operation = safe(input.operation);
  const method = safe(input.method);
  const kind = methodKind(method);
  const failureClass = inferTransportFailureClass(input);
  const rawPresent = collectStrings({
    stdout: input.stdout,
    stderr: input.stderr,
    errorMessage: input.errorMessage,
    cause: input.cause,
  }).length > 0;
  return Object.freeze({
    schemaVersion: 1,
    mode: 'bounded-development-qualification-transport-diagnostic',
    operation,
    method,
    functionName: safe(input.functionName),
    methodKind: kind,
    transportFailureClass: failureClass,
    commitState: kind === 'mutation' ? 'UNRECONCILED' : 'NOT_APPLICABLE',
    engineCode: kind === 'mutation' ? 'OUTCOME_UNKNOWN' : 'ENGINE_UNAVAILABLE',
    exitCode: integer(input.exitCode),
    signal: safe(input.signal),
    errorCode: safe(input.errorCode),
    timedOut: bool(input.timedOut) === true,
    rawOutputIncluded: false,
    redactionApplied: rawPresent,
    privatePatternObserved: leaksPrivatePattern(input),
    sanitized: true,
    reconciliationRequired: kind === 'mutation',
    automaticRetry: false,
    secondRun: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
  });
}

function acceptedBindingMatches(input, evidence) {
  return digest(input.projectionSha256) === evidence.projectionSha256
    && digest(input.acceptanceReceiptSha256) === evidence.acceptanceReceiptSha256
    && digest(input.privateRestrictedRegisterDigest) === evidence.privateRestrictedRegisterDigest
    && digest(input.restrictedCommandSetDigest) === evidence.restrictedCommandSetDigest
    && digest(input.commandCardProjectionDigest) === evidence.commandCardProjectionDigest;
}

function classifyReconciliation(input = {}) {
  const ledgerFound = bool(input.ledgerFound);
  const exactMatches = integer(input.exactMatches);
  const classification = safe(input.classification);
  if (classification === 'NO_LEDGER_FOUND' || ledgerFound === false || exactMatches === 0)
    return { transportFailureClass: 'CLI_MUTATION_NO_COMMIT_OBSERVED', commitState: 'NO_COMMIT_OBSERVED' };
  if (classification === 'LEDGER_FOUND' || ledgerFound === true || (exactMatches !== null && exactMatches > 0))
    return { transportFailureClass: 'CLI_MUTATION_COMMIT_OBSERVED', commitState: 'COMMIT_OBSERVED_STOP_FOR_REVIEW' };
  return { transportFailureClass: 'READ_ONLY_RECONCILIATION_INCONCLUSIVE', commitState: 'UNRECONCILED' };
}

function classifyStoppedEarlierWindowTransportDiagnostic(input = {}) {
  const evidence = packet.acceptedRebuiltSuccessorEvidence;
  const cli = classifyConvexCliTransportFailure(input.cli || input);
  const reconciled = classifyReconciliation(input.reconciliation);
  return Object.freeze({
    schemaVersion: 1,
    mode: 'earlier-window-transport-diagnostic-hardening',
    acceptedEvidenceKey: 'acceptedRebuiltSuccessorEvidence',
    acceptedEvidenceMatches: acceptedBindingMatches(input, evidence),
    acceptedProjectionSha256: evidence.projectionSha256,
    acceptanceReceiptSha256: evidence.acceptanceReceiptSha256,
    privateRestrictedRegisterDigest: evidence.privateRestrictedRegisterDigest,
    restrictedCommandSetDigest: evidence.restrictedCommandSetDigest,
    commandCardProjectionDigest: evidence.commandCardProjectionDigest,
    stoppedRunEvidenceSha256: digest(input.stoppedRunEvidenceSha256),
    stoppedRunReceiptSha256: digest(input.stoppedRunReceiptSha256),
    initiatedLogicalOperations: integer(input.initiatedLogicalOperations),
    operation: cli.operation,
    method: cli.method,
    functionName: cli.functionName,
    immediateTransportFailureClass: cli.transportFailureClass,
    transportFailureClass: reconciled.transportFailureClass,
    commitState: reconciled.commitState,
    readOnlyReconciliationClass: safe(input.reconciliation?.classification),
    ledgerFound: bool(input.reconciliation?.ledgerFound),
    exactMatches: integer(input.reconciliation?.exactMatches),
    engineCode: cli.engineCode,
    rawOutputIncluded: false,
    redactionApplied: cli.redactionApplied,
    privatePatternObserved: cli.privatePatternObserved,
    sanitized: true,
    automaticRetry: false,
    secondRun: false,
    noDeleteRollbackPreserved: true,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    nextGate: reconciled.commitState === 'NO_COMMIT_OBSERVED'
      ? 'FRESH_WINDOW_EVIDENCE_REQUIRED'
      : 'STOP_FOR_OPERATOR_REVIEW',
  });
}

module.exports = {
  FAILURE_CLASSES,
  classifyConvexCliTransportFailure,
  classifyStoppedEarlierWindowTransportDiagnostic,
};
