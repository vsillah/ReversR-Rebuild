#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { MAX_LIFETIME_MS, createUploadSessionService,
  createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const { createUploadSessionVerifier } = require('../server/uploadSession');

const root = path.resolve(__dirname, '..');
const packet = require('../docs/cad-dev-upload-session-qualification-executor.json');
const plan = require('../docs/cad-dev-upload-session-qualification-plan.json');
const closeout = require('../docs/cad-dev-auth-session-run-closeout.json');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const nowIso = now => new Date(now()).toISOString().replace(/\.\d{3}Z$/, 'Z');
const fail = code => { throw new Error(code); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const safeTime = value => Number.isSafeInteger(value) && value >= 0;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fileMode(file) {
  return fs.statSync(file).mode & 0o777;
}

function assertPrivateRegisterFile(file) {
  if (!path.isAbsolute(file) || path.normalize(file) !== file) fail('REGISTER_PATH_INVALID');
  if (fileMode(file) !== 0o600) fail('REGISTER_MODE_INVALID');
}

function validateRegister(register, { now = Date.now } = {}) {
  const required = ['version', 'mode', 'deploymentName', 'runId', 'runKeySha256',
    'authSessionCloseout', 'uploadSessionPlan', 'windowStartUtc', 'windowEndUtc',
    'syntheticContext'];
  if (!register || typeof register !== 'object' || !required.every(key => Object.hasOwn(register, key))) {
    fail('REGISTER_INVALID');
  }
  if (register.version !== 1 || register.mode !== 'cad-dev-upload-session-qualification') {
    fail('REGISTER_INVALID');
  }
  if (register.deploymentName !== 'majestic-alligator-31') fail('REGISTER_TARGET_INVALID');
  if (!/^[a-z0-9][a-z0-9-]{7,79}$/.test(register.runId)) fail('REGISTER_RUN_INVALID');
  if (!hex(register.runKeySha256)) fail('REGISTER_DIGEST_INVALID');
  if (register.authSessionCloseout.status !== closeout.status
    || register.authSessionCloseout.runId !== closeout.runId
    || register.authSessionCloseout.evidenceSha256 !== closeout.sanitizedRunEvidence.evidenceSha256
    || register.authSessionCloseout.receiptSha256 !== closeout.sanitizedRunEvidence.receiptSha256) {
    fail('REGISTER_AUTH_CLOSEOUT_MISMATCH');
  }
  if (register.uploadSessionPlan.status !== plan.status
    || register.uploadSessionPlan.mode !== plan.mode
    || register.uploadSessionPlan.branch !== plan.nextExecutableSlice.branch) {
    fail('REGISTER_PLAN_MISMATCH');
  }
  const start = Date.parse(register.windowStartUtc);
  const end = Date.parse(register.windowEndUtc);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start
    || end > start + 15 * 60 * 1000) fail('REGISTER_WINDOW_INVALID');
  const observed = now();
  if (!safeTime(observed)) fail('CLOCK_INVALID');
  if (observed < start || observed >= end) fail('RUN_WINDOW_CLOSED');
  const context = register.syntheticContext;
  if (!context || typeof context !== 'object' || !id(context.loginHandle)
    || !id(context.expectedUserId) || !id(context.expectedShopId)
    || !['password', 'passkey', 'oidc'].includes(context.authMethod)) {
    fail('REGISTER_CONTEXT_INVALID');
  }
  return { start, end, observed };
}

function sanitized(status, extra = {}, now = Date.now) {
  return Object.freeze({
    version: 1,
    mode: 'cad-dev-upload-session-qualification-sanitized-evidence',
    status,
    generatedAtUtc: nowIso(now),
    cadUploadsDisabled: true,
    bodyAdmissionAuthorized: false,
    conversionAllowed: false,
    privateCadUsed: false,
    productionTouched: false,
    retry: false,
    secondRun: false,
    ...extra,
  });
}

function assertDisabledRoutePrecheck(result) {
  if (!result || typeof result !== 'object' || result.status !== 503
    || result.code !== 'USER_UPLOADS_DISABLED' || result.bodyReads !== 0
    || result.conversionDispatches !== 0) fail('DISABLED_ROUTE_PRECHECK_FAILED');
}

async function runWithAdapters({ register, adapters }) {
  if (!adapters || typeof adapters !== 'object') fail('ADAPTERS_REQUIRED');
  const now = adapters.now || Date.now;
  validateRegister(register, { now });
  if (typeof adapters.disabledRoutePrecheck !== 'function') fail('DISABLED_ROUTE_PRECHECK_REQUIRED');
  const service = createUploadSessionService({
    store: adapters.store,
    resolveAuthorization: adapters.resolveAuthorization,
    refreshAuthorization: adapters.refreshAuthorization,
    now,
  });
  const context = Object.freeze({ loginHandle: register.syntheticContext.loginHandle });
  const issued = await service.issueSession(context, { transport: 'bearer', lifetimeMs: Math.min(5 * 60 * 1000, MAX_LIFETIME_MS) });
  if (!issued.ok) fail(`ISSUE_${issued.code}`);
  const disabledRoute = await adapters.disabledRoutePrecheck({ credential: issued.credential });
  assertDisabledRoutePrecheck(disabledRoute);
  const verifier = createUploadSessionVerifier({ lookupSession: service.lookupSession, now });
  const request = { headers: { authorization: `Bearer ${issued.credential}` } };
  const verified = await verifier(request);
  if (!verified.ok || verified.principal.userId !== register.syntheticContext.expectedUserId
    || verified.principal.shopId !== register.syntheticContext.expectedShopId
    || verified.principal.authMethod !== register.syntheticContext.authMethod) {
    fail('VERIFY_DENIED');
  }
  const credentialSha256 = sha256(issued.credential);
  const directLookup = await service.lookupSession(credentialSha256);
  if (!directLookup || directLookup.status !== 'active' || directLookup.cadUploadAllowed !== true) {
    fail('LOOKUP_DENIED');
  }
  const revoked = await service.revokeSession(credentialSha256);
  if (!revoked.ok) fail(`REVOKE_${revoked.code}`);
  const afterRevoke = await verifier(request);
  if (afterRevoke.ok || afterRevoke.code !== 'SESSION_REVOKED') fail('REVOKE_NOT_OBSERVED');
  const retained = await service.lookupSession(credentialSha256);
  if (!retained || retained.status !== 'revoked') fail('RETAINED_STATE_MISSING');
  return sanitized('DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTOR_FIXTURE_EXECUTED', {
    runId: register.runId,
    deploymentName: register.deploymentName,
    windowStartUtc: register.windowStartUtc,
    windowEndUtc: register.windowEndUtc,
    authSessionCloseoutEvidenceSha256: closeout.sanitizedRunEvidence.evidenceSha256,
    authSessionCloseoutReceiptSha256: closeout.sanitizedRunEvidence.receiptSha256,
    runKeySha256: register.runKeySha256,
    operationCounts: {
      issuedSessions: 1,
      disabledRoutePrechecks: 1,
      verifierReads: 2,
      directLookups: 2,
      revocations: 1,
    },
    routePrecheck: {
      status: disabledRoute.status,
      code: disabledRoute.code,
      bodyReads: disabledRoute.bodyReads,
      conversionDispatches: disabledRoute.conversionDispatches,
    },
    retainedState: {
      revokeWithoutDeletion: true,
      retainedStatus: retained.status,
    },
    credentialDigestObserved: hex(credentialSha256),
    rawCredentialRecorded: false,
  }, now);
}

function createFixtureRegister() {
  const start = Date.parse('2026-09-15T20:00:00Z');
  return {
    version: 1,
    mode: 'cad-dev-upload-session-qualification',
    deploymentName: 'majestic-alligator-31',
    runId: 'cad-dev-upload-session-fixture',
    runKeySha256: sha256('cad-dev-upload-session-fixture-key'),
    authSessionCloseout: {
      status: closeout.status,
      runId: closeout.runId,
      evidenceSha256: closeout.sanitizedRunEvidence.evidenceSha256,
      receiptSha256: closeout.sanitizedRunEvidence.receiptSha256,
    },
    uploadSessionPlan: {
      mode: plan.mode,
      status: plan.status,
      branch: plan.nextExecutableSlice.branch,
    },
    windowStartUtc: new Date(start).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    windowEndUtc: new Date(start + 15 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    syntheticContext: {
      loginHandle: 'cad-upload-session-fixture-login',
      expectedUserId: 'cad-upload-user-fixture',
      expectedShopId: 'cad-upload-shop-fixture',
      authMethod: 'password',
    },
  };
}

function createFixtureAdapters(register = createFixtureRegister()) {
  const start = Date.parse(register.windowStartUtc);
  const store = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const grant = Object.freeze({
    loginSessionId: register.syntheticContext.loginHandle,
    userId: register.syntheticContext.expectedUserId,
    shopId: register.syntheticContext.expectedShopId,
    authMethod: register.syntheticContext.authMethod,
    cadUploadAllowed: true,
    expiresAt: start + 10 * 60 * 1000,
  });
  return {
    store,
    now: () => start + 1000,
    resolveAuthorization: async context => context.loginHandle === register.syntheticContext.loginHandle ? grant : null,
    refreshAuthorization: async binding => binding.loginSessionId === grant.loginSessionId ? grant : null,
    disabledRoutePrecheck: async ({ credential }) => {
      if (typeof credential !== 'string' || credential.startsWith('us1.') !== true) fail('PRECHECK_CREDENTIAL_INVALID');
      return Object.freeze({ status: 503, code: 'USER_UPLOADS_DISABLED', bodyReads: 0, conversionDispatches: 0 });
    },
  };
}

async function runFixture() {
  const register = createFixtureRegister();
  const evidence = await runWithAdapters({ register, adapters: createFixtureAdapters(register) });
  return {
    status: evidence.status,
    evidence,
    evidenceSha256: sha256(JSON.stringify(evidence, null, 2) + '\n'),
  };
}

async function main() {
  const [command, file] = process.argv.slice(2);
  if (command === '--packet') {
    process.stdout.write(JSON.stringify(packet, null, 2) + '\n');
    return;
  }
  if (command === '--fixture-run') {
    process.stdout.write(JSON.stringify(await runFixture(), null, 2) + '\n');
    return;
  }
  if (command === '--inspect') {
    const registerPath = path.resolve(file || '');
    assertPrivateRegisterFile(registerPath);
    const register = readJson(registerPath);
    validateRegister(register);
    process.stdout.write(JSON.stringify(sanitized('REGISTER_VALIDATED_FOR_FUTURE_UPLOAD_SESSION_QUALIFICATION', {
      runId: register.runId,
      deploymentName: register.deploymentName,
      runKeySha256: register.runKeySha256,
    }), null, 2) + '\n');
    return;
  }
  process.stdout.write([
    'Usage:',
    '  node scripts/cad-dev-upload-session-qualification-executor.js --packet',
    '  node scripts/cad-dev-upload-session-qualification-executor.js --fixture-run',
    '  node scripts/cad-dev-upload-session-qualification-executor.js --inspect <register.json>',
  ].join('\n') + '\n');
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  packet,
  validateRegister,
  sanitized,
  runWithAdapters,
  createFixtureRegister,
  createFixtureAdapters,
  runFixture,
};
