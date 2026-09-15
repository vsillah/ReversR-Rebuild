const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const closeout = JSON.parse(fs.readFileSync('docs/cad-dev-auth-session-run-closeout.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('docs/cad-dev-upload-session-qualification-plan.json', 'utf8'));
const packet = JSON.parse(fs.readFileSync('docs/cad-dev-upload-session-qualification-executor.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-upload-session-qualification-executor.md', 'utf8');
const route = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const source = fs.readFileSync('scripts/cad-dev-upload-session-qualification-executor.js', 'utf8');
const {
  validateRegister,
  runWithAdapters,
  createFixtureRegister,
  createFixtureAdapters,
  runFixture,
} = require('./cad-dev-upload-session-qualification-executor');

test('executor packet binds to upload-session plan and completed Auth/session closeout', () => {
  assert.equal(packet.mode, 'source-only-cad-dev-upload-session-qualification-executor');
  assert.equal(packet.status, 'SOURCE_ONLY_UPLOAD_SESSION_QUALIFICATION_EXECUTOR_READY');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.liveRunAuthorizedByThisPacket, false);
  assert.equal(packet.dependsOn.authSessionCloseout.status, closeout.status);
  assert.equal(packet.dependsOn.authSessionCloseout.evidenceSha256,
    closeout.sanitizedRunEvidence.evidenceSha256);
  assert.equal(packet.dependsOn.uploadSessionPlan.status, plan.status);
  assert.equal(packet.dependsOn.uploadSessionPlan.branch, plan.nextExecutableSlice.branch);
});

test('fixture register validates only inside the bounded development window', () => {
  const register = createFixtureRegister();
  assert.equal(validateRegister(register, { now: () => Date.parse(register.windowStartUtc) + 1 }).start,
    Date.parse(register.windowStartUtc));
  assert.throws(() => validateRegister({ ...register, deploymentName: 'production' },
    { now: () => Date.parse(register.windowStartUtc) + 1 }), /REGISTER_TARGET_INVALID/);
  assert.throws(() => validateRegister({ ...register, runKeySha256: 'bad' },
    { now: () => Date.parse(register.windowStartUtc) + 1 }), /REGISTER_DIGEST_INVALID/);
  assert.throws(() => validateRegister({ ...register, authSessionCloseout: { ...register.authSessionCloseout,
    evidenceSha256: '0'.repeat(64) } }, { now: () => Date.parse(register.windowStartUtc) + 1 }),
  /REGISTER_AUTH_CLOSEOUT_MISMATCH/);
  assert.throws(() => validateRegister(register, { now: () => Date.parse(register.windowEndUtc) }),
    /RUN_WINDOW_CLOSED/);
});

test('runWithAdapters executes only the reviewed upload-session issue lookup revoke sequence', async () => {
  const register = createFixtureRegister();
  const evidence = await runWithAdapters({ register, adapters: createFixtureAdapters(register) });
  assert.equal(evidence.status, 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTOR_FIXTURE_EXECUTED');
  assert.deepEqual(evidence.operationCounts, {
    issuedSessions: 1,
    disabledRoutePrechecks: 1,
    verifierReads: 2,
    directLookups: 2,
    revocations: 1,
  });
  assert.deepEqual(evidence.routePrecheck, {
    status: 503,
    code: 'USER_UPLOADS_DISABLED',
    bodyReads: 0,
    conversionDispatches: 0,
  });
  assert.equal(evidence.retainedState.revokeWithoutDeletion, true);
  assert.equal(evidence.retainedState.retainedStatus, 'revoked');
  assert.equal(evidence.rawCredentialRecorded, false);
  assert.equal(evidence.cadUploadsDisabled, true);
  assert.equal(evidence.bodyAdmissionAuthorized, false);
  assert.equal(evidence.conversionAllowed, false);
  assert.equal(evidence.privateCadUsed, false);
  assert.equal(evidence.productionTouched, false);
  assert.equal(evidence.retry, false);
  assert.equal(evidence.secondRun, false);
  assert.doesNotMatch(JSON.stringify(evidence), /us1\./);
});

test('hard stop behavior rejects unknown or missing route precheck outcomes', async () => {
  const register = createFixtureRegister();
  const adapters = createFixtureAdapters(register);
  await assert.rejects(runWithAdapters({ register, adapters: {
    ...adapters,
    disabledRoutePrecheck: async () => ({ status: 200, code: 'OK', bodyReads: 1, conversionDispatches: 0 }),
  } }), /DISABLED_ROUTE_PRECHECK_FAILED/);
  await assert.rejects(runWithAdapters({ register, adapters: {
    ...adapters,
    resolveAuthorization: async () => null,
  } }), /ISSUE_AUTHORIZATION_REQUIRED/);
});

test('CLI packet and fixture output are source-safe', async () => {
  const packetRun = spawnSync(process.execPath, ['scripts/cad-dev-upload-session-qualification-executor.js', '--packet'],
    { encoding: 'utf8' });
  assert.equal(packetRun.status, 0);
  assert.equal(JSON.parse(packetRun.stdout).status, packet.status);
  const fixtureRun = spawnSync(process.execPath, ['scripts/cad-dev-upload-session-qualification-executor.js', '--fixture-run'],
    { encoding: 'utf8' });
  assert.equal(fixtureRun.status, 0, fixtureRun.stderr);
  const fixture = JSON.parse(fixtureRun.stdout);
  assert.equal(fixture.status, 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTOR_FIXTURE_EXECUTED');
  assert.match(fixture.evidenceSha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(fixtureRun.stdout, /us1\.|BEGIN PRIVATE KEY|PRIVATE CAD/i);
  assert.equal((await runFixture()).status, fixture.status);
});

test('source preserves disabled upload gate and avoids live network/provider hooks', () => {
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.match(packet.futureGate.requiredBeforeLiveRun.join(' '), /fresh accepted restricted register/i);
  assert.match(markdown, /does not authorize a\s+live run/i);
  assert.match(markdown, /keeps CAD uploads disabled/i);
  assert.doesNotMatch(source, /fetch\s*\(|ConvexHttpClient|process\.env|node:https|node:http/);
  for (const [gate, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});
