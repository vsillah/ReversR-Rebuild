const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  PACKAGE8_APPROVAL_ISSUER_LIMITS,
  PACKAGE8_QUALIFICATION_LIMITS,
  PACKAGE8_QUALIFICATION_LIMITS_JSON,
} = require('../server/cadPhase5Package8Limits');
const {
  ISSUER_LIMITS,
  QUALIFICATION_LIMITS,
  hash,
} = require('../server/cadPhase5Package8ApprovalIssuanceContract');
const {
  classifyPackage8SetupFailure,
  createPackage8SetupTerminalGuard,
  requirePackage8ApprovalIssued,
  sanitizePackage8ReconciliationResult,
} = require('../server/cadPhase5Package8SetupTerminal');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-11T02:30:00.000Z');

test('server and deployed mutation share one qualification limits commitment', () => {
  assert.equal(QUALIFICATION_LIMITS, PACKAGE8_QUALIFICATION_LIMITS);
  assert.equal(ISSUER_LIMITS, PACKAGE8_APPROVAL_ISSUER_LIMITS);
  assert.equal(PACKAGE8_QUALIFICATION_LIMITS_JSON,
    JSON.stringify(PACKAGE8_QUALIFICATION_LIMITS));
  assert.equal(hash(PACKAGE8_QUALIFICATION_LIMITS_JSON),
    '3d2345619690dd3d33df8494af8e6dc33aa3816d08b430a5ecbe89f698faedf3');

  const deployed = fs.readFileSync(path.join(root,
    'convex/cadPhase5Package8ApprovalIssuance.ts'), 'utf8');
  assert.match(deployed, /sha256\(QUALIFICATION_LIMITS_JSON\)/);
  assert.doesNotMatch(deployed,
    /request\.limitsCommitment\s*===\s*await sha256\(JSON\.stringify\(LIMITS\)\)/);
});

test('approval setup preserves accepted, denied, replay and unknown classifications', () => {
  const issued = { ok: true, code: 'PACKAGE8_APPROVAL_ISSUED' };
  assert.equal(requirePackage8ApprovalIssued(issued), issued);
  for (const code of ['PACKAGE8_APPROVAL_DENIED', 'PACKAGE8_APPROVAL_EXPIRED',
    'PACKAGE8_APPROVAL_REPLAYED', 'PACKAGE8_APPROVAL_CONFLICT']) {
    assert.throws(() => requirePackage8ApprovalIssued({ ok: false, code }), error => {
      assert.equal(error.code, code);
      assert.equal(classifyPackage8SetupFailure(error), code);
      return true;
    });
  }
  assert.throws(() => requirePackage8ApprovalIssued({ ok: true, code: 'unexpected' }),
    error => error.code === 'PACKAGE8_APPROVAL_OUTCOME_UNKNOWN');
  assert.equal(classifyPackage8SetupFailure(Error('private detail')),
    'PACKAGE8_INTERNAL_BINDING_LOAD_UNKNOWN');
});

test('post-sign-in setup failure signs out once, verifies closure and writes sanitized evidence',
  async () => {
    const calls = [];
    let evidence;
    const guard = createPackage8SetupTerminalGuard({
      async signOut() { calls.push('sign-out'); },
      async verifySignedOut() { calls.push('verify'); return true; },
      async writeTerminalEvidence(value) { calls.push('write'); evidence = value; },
      now: () => NOW,
    });
    await assert.rejects(guard.run(async ({ markSessionObserved }) => {
      markSessionObserved();
      const error = Error('PACKAGE8_APPROVAL_DENIED');
      error.code = 'PACKAGE8_APPROVAL_DENIED';
      throw error;
    }), error => error.code === 'PACKAGE8_APPROVAL_DENIED');
    assert.deepEqual(calls, ['sign-out', 'verify', 'write']);
    assert.deepEqual(evidence, {
      schemaVersion: 1,
      status: 'SIGNED_OUT_AFTER_SETUP_FAILURE',
      setupCode: 'PACKAGE8_APPROVAL_DENIED',
      signOutAttempts: 1,
      signOutVerified: true,
      observedAtUtc: '2026-10-11T02:30:00.000Z',
      rawCredentialPersisted: false,
      rawTokenPersisted: false,
    });
    assert.equal(guard.applicationRetries, 0);
    assert.equal(guard.providerRetries, 0);
  });

test('setup failure refuses to claim closure when sign-out or evidence is uncertain', async () => {
  const unknownSignOut = createPackage8SetupTerminalGuard({
    async signOut() { throw Error('suppressed private transport'); },
    async verifySignedOut() { return false; },
    async writeTerminalEvidence() { throw Error('must not write'); },
  });
  await assert.rejects(unknownSignOut.run(async ({ markSessionObserved }) => {
    markSessionObserved();
    throw Error('PACKAGE8_APPROVAL_DENIED');
  }), error => error.code === 'PACKAGE8_SETUP_SESSION_TERMINAL_UNKNOWN');

  const unknownEvidence = createPackage8SetupTerminalGuard({
    async signOut() {},
    async verifySignedOut() { return true; },
    async writeTerminalEvidence() { throw Error('local write failed'); },
    now: () => NOW,
  });
  await assert.rejects(unknownEvidence.run(async ({ markSessionObserved }) => {
    markSessionObserved();
    throw Error('PACKAGE8_APPROVAL_DENIED');
  }), error => error.code === 'PACKAGE8_SETUP_SESSION_EVIDENCE_UNKNOWN');
});

test('pre-session failure performs no sign-out and remains single-use', async () => {
  let signOuts = 0;
  const guard = createPackage8SetupTerminalGuard({
    async signOut() { signOuts += 1; },
    async verifySignedOut() { return true; },
    async writeTerminalEvidence() {},
  });
  await assert.rejects(guard.run(async () => {
    const error = Error('PACKAGE8_APPROVAL_CONFLICT');
    error.code = 'PACKAGE8_APPROVAL_CONFLICT';
    throw error;
  }), error => error.code === 'PACKAGE8_APPROVAL_CONFLICT');
  assert.equal(signOuts, 0);
  await assert.rejects(guard.run(async () => null),
    error => error.code === 'PACKAGE8_INTERNAL_BINDING_LOAD_UNKNOWN');
});

test('reconciliation diagnostics retain fixed categories and never raw output', () => {
  const secret = 'raw-private-value';
  const cases = [
    sanitizePackage8ReconciliationResult({ exitCode: 1, stdout: secret,
      stderrPresent: true, observedAtMs: NOW }),
    sanitizePackage8ReconciliationResult({ exitCode: 0, stdout: '{',
      observedAtMs: NOW }),
    sanitizePackage8ReconciliationResult({ exitCode: 0, stdout: '[]',
      observedAtMs: NOW }),
    sanitizePackage8ReconciliationResult({ exitCode: 0,
      stdout: JSON.stringify([{ _creationTime: NOW - 1_000, status: 'closed', raw: secret }]),
      observedAtMs: NOW }),
  ];
  assert.deepEqual(cases.map(value => value.classification), [
    'PROCESS_EXIT_NONZERO', 'RESPONSE_JSON_INVALID', 'ABSENT', 'RECENT_PRESENT',
  ]);
  assert.equal(cases[2].state, 'NONE');
  assert.equal(cases[3].state, 'CLOSED');
  for (const value of cases) {
    assert.equal(value.rawOutputRetained, false);
    assert.doesNotMatch(JSON.stringify(value), new RegExp(secret));
  }
});

test('runner reports allowlisted setup codes without rendering exception details', () => {
  const runner = fs.readFileSync(path.join(root,
    'scripts/run-cad-phase5-package8-internal-qualification.js'), 'utf8');
  assert.match(runner, /classifyPackage8SetupFailure\(error\)/);
  assert.match(runner, /createPackage8QualificationCommandInputs\(Object\.freeze\(\{/);
  assert.match(runner, /createGuard:\s*createPackage8SetupTerminalGuard/);
  assert.match(runner, /requireApprovalIssued:\s*requirePackage8ApprovalIssued/);
  assert.doesNotMatch(runner, /error\.(stack|cause)|String\(error\)|console\.(error|log)/);
});
