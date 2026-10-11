const APPROVAL_FAILURE_CODES = new Set([
  'PACKAGE8_APPROVAL_DENIED',
  'PACKAGE8_APPROVAL_EXPIRED',
  'PACKAGE8_APPROVAL_REPLAYED',
  'PACKAGE8_APPROVAL_CONFLICT',
]);
const SETUP_FAILURE_CODES = new Set([
  ...APPROVAL_FAILURE_CODES,
  'PACKAGE8_APPROVAL_OUTCOME_UNKNOWN',
  'PACKAGE8_SETUP_SESSION_TERMINAL_UNKNOWN',
  'PACKAGE8_SETUP_SESSION_EVIDENCE_UNKNOWN',
]);

function setupError(code) {
  const error = Error(code);
  error.code = code;
  return error;
}

function classifyPackage8SetupFailure(error) {
  const code = typeof error?.code === 'string' ? error.code : error?.message;
  return SETUP_FAILURE_CODES.has(code) ? code : 'PACKAGE8_INTERNAL_BINDING_LOAD_UNKNOWN';
}

function requirePackage8ApprovalIssued(result) {
  if (result?.ok === true && result.code === 'PACKAGE8_APPROVAL_ISSUED') return result;
  if (result?.ok === false && APPROVAL_FAILURE_CODES.has(result.code)) {
    throw setupError(result.code);
  }
  throw setupError('PACKAGE8_APPROVAL_OUTCOME_UNKNOWN');
}

function createPackage8SetupTerminalGuard({
  signOut,
  verifySignedOut,
  writeTerminalEvidence,
  now = Date.now,
} = {}) {
  const configured = typeof signOut === 'function'
    && typeof verifySignedOut === 'function'
    && typeof writeTerminalEvidence === 'function'
    && typeof now === 'function';
  let attempted = false;

  async function run(setup) {
    if (!configured || attempted || typeof setup !== 'function') {
      throw setupError('PACKAGE8_INTERNAL_BINDING_LOAD_UNKNOWN');
    }
    attempted = true;
    let sessionObserved = false;
    try {
      return await setup(Object.freeze({
        markSessionObserved() { sessionObserved = true; },
      }));
    } catch (error) {
      const setupCode = classifyPackage8SetupFailure(error);
      if (!sessionObserved) throw setupError(setupCode);

      let signOutVerified = false;
      try {
        await signOut();
        signOutVerified = await verifySignedOut() === true;
      } catch {
        signOutVerified = false;
      }
      if (!signOutVerified) {
        throw setupError('PACKAGE8_SETUP_SESSION_TERMINAL_UNKNOWN');
      }

      const observedAt = now();
      if (!Number.isSafeInteger(observedAt) || observedAt < 0) {
        throw setupError('PACKAGE8_SETUP_SESSION_EVIDENCE_UNKNOWN');
      }
      const evidence = Object.freeze({
        schemaVersion: 1,
        status: 'SIGNED_OUT_AFTER_SETUP_FAILURE',
        setupCode,
        signOutAttempts: 1,
        signOutVerified: true,
        observedAtUtc: new Date(observedAt).toISOString(),
        rawCredentialPersisted: false,
        rawTokenPersisted: false,
      });
      try {
        await writeTerminalEvidence(evidence);
      } catch {
        throw setupError('PACKAGE8_SETUP_SESSION_EVIDENCE_UNKNOWN');
      }
      throw setupError(setupCode);
    }
  }

  return Object.freeze({
    sourceOnly: true,
    configured,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
    run,
  });
}

function sanitizePackage8ReconciliationResult({
  exitCode,
  stdout,
  stderrPresent = false,
  observedAtMs,
  maximumAgeMs = 15 * 60_000,
} = {}) {
  const fixed = (classification, state = 'UNKNOWN') => Object.freeze({
    classification,
    state,
    stderrPresent: stderrPresent === true,
    rawOutputRetained: false,
  });
  if (!Number.isSafeInteger(exitCode) || exitCode !== 0) {
    return fixed('PROCESS_EXIT_NONZERO');
  }
  let rows;
  try { rows = JSON.parse(stdout); } catch { return fixed('RESPONSE_JSON_INVALID'); }
  if (!Array.isArray(rows)) return fixed('RESPONSE_SHAPE_INVALID');
  if (rows.length === 0) return fixed('ABSENT', 'NONE');
  if (rows.length !== 1) return fixed('RESPONSE_CARDINALITY_INVALID');
  const record = rows[0];
  const createdAt = Number(record?._creationTime);
  if (!record || !['active', 'consumed', 'revoked', 'closed'].includes(record.status)
    || !Number.isSafeInteger(observedAtMs) || !Number.isFinite(createdAt)
    || !Number.isSafeInteger(maximumAgeMs) || maximumAgeMs <= 0) {
    return fixed('RESPONSE_SHAPE_INVALID');
  }
  const age = observedAtMs - createdAt;
  if (!Number.isFinite(age) || age < 0) return fixed('RESPONSE_TIME_INVALID');
  return fixed(age <= maximumAgeMs ? 'RECENT_PRESENT' : 'STALE_PRESENT',
    record.status.toUpperCase());
}

module.exports = {
  classifyPackage8SetupFailure,
  createPackage8SetupTerminalGuard,
  requirePackage8ApprovalIssued,
  sanitizePackage8ReconciliationResult,
};
