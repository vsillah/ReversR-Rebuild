// Unmounted one-use Package 8 qualification command. All durable and provider
// ports are injected explicitly; constructing this command does not issue an
// approval/session, read environment values, or activate an HTTP route.
const { createHash } = require('node:crypto');
const {
  LAUNCH_REVIEW_GATE,
  createCadPhase5Package8IndependentQualificationLauncher,
  runtimeAuthorityRequest,
} = require('./cadPhase5Package8IndependentQualificationLauncher');
const {
  VERIFIER_REVIEW_GATE,
  createCadPhase5Package8RuntimeIssuerAuthorityVerifier,
  requestFromEvidence,
} = require('./cadPhase5Package8RuntimeIssuerAuthorityVerifier');

const COMMAND_REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'SOURCE_ONLY_PACKAGE8_INTERNAL_QUALIFICATION_COMMAND_REVIEW',
  runtimeInstallRootCommit: 'c9dfd22a230869ef618c3c8fdfcc95ab86b8aaa0',
  runtimeInstallRootTree: '6db5b4f3c774e79aabb51ffa97d24d1d54c1e5dd',
  mounted: false,
  routeMounted: false,
  sessionIssuanceAuthorized: false,
  approvalIssuanceAuthorized: false,
});
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const deny = code => Object.freeze({ ok: false, code, sourceOnly: true,
  developmentOnly: true, authorityRegistered: false, authorityConsumed: false,
  authorityClosed: false, applicationRetries: 0, transportRetries: 0,
  providerRetries: 0, routeMounted: false, runtimeActivationAllowed: false });

function validRuntimeLedger(value) {
  return Boolean(value?.sourceOnly === true && value.internalOnly === true
    && value.configured === false && value.reviewConfigured === true
    && value.independentlyOwned === true && value.applicationRetries === 0
    && value.transportRetries === 0 && value.providerRetries === 0
    && ['registerExact', 'consumeExact', 'revokeExact', 'closeExact', 'readSanitized']
      .every(operation => typeof value[operation] === 'function'));
}

function createCadPhase5Package8InternalQualificationCommand({
  reviewOnly = false,
  commandGate,
  verifierPrincipalCommitment,
  issuerPrincipalDigest,
  authorityEvidence,
  approvalArtifact,
  runtimeAuthorityLedger,
  approvalIssuer,
  qualificationSources,
  qualificationBindingFactory,
  lifecycleMonitor,
  now = Date.now,
} = {}) {
  const expectedRequest = authorityEvidence ? requestFromEvidence(authorityEvidence) : null;
  const artifactRequest = approvalArtifact && digest(issuerPrincipalDigest)
    ? runtimeAuthorityRequest(approvalArtifact, issuerPrincipalDigest) : null;
  const reviewConfigured = reviewOnly === true && same(commandGate, COMMAND_REVIEW_GATE)
    && digest(verifierPrincipalCommitment) && digest(issuerPrincipalDigest)
    && verifierPrincipalCommitment !== issuerPrincipalDigest
    && authorityEvidence?.verifierPrincipalCommitment === verifierPrincipalCommitment
    && authorityEvidence?.issuerPrincipalCommitment === issuerPrincipalDigest
    && same(expectedRequest, artifactRequest)
    && validRuntimeLedger(runtimeAuthorityLedger)
    && approvalIssuer?.sourceOnly === true && approvalIssuer.reviewConfigured === true
    && qualificationSources && typeof qualificationSources === 'object'
    && (qualificationBindingFactory === undefined
      || typeof qualificationBindingFactory === 'function')
    && typeof now === 'function';
  let attempted = false;

  async function execute({ signal } = {}) {
    if (!reviewConfigured || attempted || signal?.aborted === true) {
      return deny('PACKAGE8_INTERNAL_QUALIFICATION_COMMAND_DISABLED');
    }
    attempted = true;
    let nowMs;
    try { nowMs = now(); } catch {
      return deny('PACKAGE8_INTERNAL_QUALIFICATION_TIME_UNKNOWN');
    }
    if (!Number.isSafeInteger(nowMs)) return deny('PACKAGE8_INTERNAL_QUALIFICATION_TIME_UNKNOWN');

    let registration;
    try {
      registration = await runtimeAuthorityLedger.registerExact({
        authorityEvidence,
        request: expectedRequest,
        issuedAtUtc: new Date(nowMs).toISOString(),
      });
    } catch {
      return deny('PACKAGE8_RUNTIME_AUTHORITY_REGISTRATION_UNKNOWN');
    }
    if (registration?.ok !== true
      || registration.code !== 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED') {
      return deny('PACKAGE8_RUNTIME_AUTHORITY_REGISTRATION_REJECTED');
    }

    const locator = Object.freeze({
      issuerPrincipalCommitment: issuerPrincipalDigest,
      authorityCommitment: registration.authorityCommitment,
      requestCommitment: registration.requestCommitment,
    });
    const verifier = createCadPhase5Package8RuntimeIssuerAuthorityVerifier({
      reviewOnly: true,
      reviewGate: VERIFIER_REVIEW_GATE,
      verifierPrincipalCommitment,
      authorityEvidence,
      authorityLedger: runtimeAuthorityLedger,
      now,
    });
    const launcher = createCadPhase5Package8IndependentQualificationLauncher({
      reviewOnly: true,
      launchGate: LAUNCH_REVIEW_GATE,
      issuerPrincipalDigest,
      issuerAuthorityVerifier: verifier,
      approvalIssuer,
      qualificationSources,
      qualificationBindingFactory,
      lifecycleMonitor,
      now,
    });
    let qualification;
    try {
      qualification = await launcher.runOneUse({ approvalArtifact, signal });
    } catch {
      qualification = Object.freeze({
        ok: false,
        code: 'PACKAGE8_INTERNAL_QUALIFICATION_OUTCOME_UNKNOWN',
      });
    }

    let authority;
    try {
      authority = await runtimeAuthorityLedger.readSanitized(locator);
      if (!authority) throw Error('unknown');
      if (authority.status === 'ACTIVE') {
        const reasonDigest = hash('package8-runtime-authority-close-first');
        const revoked = await runtimeAuthorityLedger.revokeExact({ ...locator, reasonDigest });
        if (revoked?.ok !== true
          || revoked.code !== 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED') {
          throw Error('unknown');
        }
      } else if (authority.status !== 'CONSUMED') {
        throw Error('unknown');
      }
      const closed = await runtimeAuthorityLedger.closeExact({
        ...locator,
        reasonDigest: hash('package8-runtime-authority-terminal-close'),
      });
      if (closed?.ok !== true || closed.code !== 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED') {
        throw Error('unknown');
      }
      authority = await runtimeAuthorityLedger.readSanitized(locator);
    } catch {
      return Object.freeze({ ...deny('PACKAGE8_RUNTIME_AUTHORITY_TERMINAL_UNKNOWN'),
        authorityRegistered: true,
        authorityConsumed: authority?.status === 'CONSUMED',
      });
    }
    if (!authority || authority.status !== 'CLOSED' || authority.closed !== true) {
      return Object.freeze({ ...deny('PACKAGE8_RUNTIME_AUTHORITY_TERMINAL_UNKNOWN'),
        authorityRegistered: true,
        authorityConsumed: authority?.consumed === true,
      });
    }
    const qualified = qualification?.ok === true
      && qualification.code === 'PACKAGE8_INDEPENDENT_QUALIFICATION_QUALIFIED_CLOSED';
    const qualificationUnknown = qualification?.code
      === 'PACKAGE8_INTERNAL_QUALIFICATION_OUTCOME_UNKNOWN';
    return Object.freeze({
      ok: qualified,
      code: qualified ? 'PACKAGE8_INTERNAL_QUALIFICATION_QUALIFIED_CLOSED'
        : qualificationUnknown ? 'PACKAGE8_INTERNAL_QUALIFICATION_OUTCOME_UNKNOWN_CLOSED'
          : 'PACKAGE8_INTERNAL_QUALIFICATION_CLOSED_AFTER_FAILURE',
      sourceOnly: true,
      developmentOnly: true,
      authorityRegistered: true,
      authorityConsumed: authority.consumed === true,
      authorityClosed: true,
      approvalConsumed: qualification?.approvalConsumed === true,
      approvalClosed: qualification?.approvalClosed === true,
      applicationRetries: 0,
      transportRetries: 0,
      providerRetries: 0,
      routeMounted: false,
      runtimeActivationAllowed: false,
    });
  }

  return Object.freeze({
    sourceOnly: true,
    internalOnly: true,
    configured: false,
    reviewConfigured,
    enabled: false,
    mounted: false,
    routeMounted: false,
    sessionIssuanceAuthorized: false,
    approvalIssuanceAuthorized: false,
    requestBodyAdmissionAuthorized: false,
    runtimeActivationAllowed: false,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
    execute,
  });
}

module.exports = {
  COMMAND_REVIEW_GATE,
  createCadPhase5Package8InternalQualificationCommand,
};
