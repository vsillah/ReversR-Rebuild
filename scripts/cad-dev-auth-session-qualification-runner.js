#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const defaultRegisterPath = path.join(root, '.local/cad-convex/dev-auth-session-qualification/run-register.json');
const defaultEvidenceRoot = path.join(root, '.local/cad-convex/dev-auth-session-qualification-runs');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const fail = code => { throw new Error(code); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function mode(file) {
  return fs.statSync(file).mode & 0o777;
}

function assertPrivateFile(file) {
  if (!path.isAbsolute(file) || path.normalize(file) !== file) fail('REGISTER_PATH_INVALID');
  if (mode(file) !== 0o600) fail('REGISTER_MODE_INVALID');
}

function validateRegister(register) {
  const required = ['version', 'mode', 'convexUrl', 'deploymentName', 'runId', 'runKey',
    'runKeySha256', 'acceptedProjectionSha256', 'acceptanceReceiptSha256', 'cohort',
    'passwords', 'windowStartUtc', 'windowEndUtc'];
  if (!required.every(key => Object.hasOwn(register, key))) fail('REGISTER_INVALID');
  if (register.version !== 1 || register.mode !== 'cad-dev-auth-session-qualification') fail('REGISTER_INVALID');
  if (register.convexUrl !== 'https://majestic-alligator-31.convex.cloud'
    || register.deploymentName !== 'majestic-alligator-31') fail('REGISTER_TARGET_INVALID');
  if (!/^[a-z0-9-]{8,80}$/.test(register.runId)) fail('REGISTER_RUN_INVALID');
  if (typeof register.runKey !== 'string' || register.runKey.length < 16 || register.runKey.length > 256) {
    fail('REGISTER_KEY_INVALID');
  }
  if (sha256(register.runKey) !== register.runKeySha256) fail('REGISTER_KEY_INVALID');
  if (!hex(register.acceptedProjectionSha256) || !hex(register.acceptanceReceiptSha256)) {
    fail('REGISTER_DIGEST_INVALID');
  }
  if (!Array.isArray(register.cohort) || register.cohort.length !== 2
    || register.cohort[0] !== 'cad-test-alpha-20260915@auth-test.invalid'
    || register.cohort[1] !== 'cad-test-beta-20260915@auth-test.invalid') fail('REGISTER_COHORT_INVALID');
  if (!Array.isArray(register.passwords) || register.passwords.length !== 2
    || register.passwords.some(password => typeof password !== 'string' || password.length < 12 || password.length > 128)) {
    fail('REGISTER_PASSWORD_INVALID');
  }
  const start = Date.parse(register.windowStartUtc);
  const end = Date.parse(register.windowEndUtc);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start || end > start + 15 * 60 * 1000) {
    fail('REGISTER_WINDOW_INVALID');
  }
  return { start, end };
}

function sanitized(status, extra = {}) {
  return {
    version: 1,
    mode: 'cad-dev-auth-session-qualification-sanitized-evidence',
    status,
    generatedAtUtc: nowIso(),
    cadUploadAllowed: false,
    conversionAllowed: false,
    privateCadUsed: false,
    productionTouched: false,
    retry: false,
    secondRun: false,
    ...extra,
  };
}

async function runWithClients({ register, clients, api }) {
  const { start, end } = validateRegister(register);
  const observed = Date.now();
  if (observed < start || observed >= end) fail('RUN_WINDOW_CLOSED');
  const common = {
    runKey: register.runKey,
    runKeySha256: register.runKeySha256,
    acceptedProjectionSha256: register.acceptedProjectionSha256,
    acceptanceReceiptSha256: register.acceptanceReceiptSha256,
  };
  const provision = await clients.operator.action(api.cadDevAuthQualification.provisionCohort, {
    ...common,
    passwords: register.passwords,
  });
  const exactSessions = [];
  const authClients = [];
  for (let slot = 0; slot < 2; slot++) {
    const signIn = await clients.operator.action(api.auth.signIn, {
      provider: 'password',
      params: { flow: 'signIn', email: register.cohort[slot], password: register.passwords[slot] },
    });
    if (!signIn || !signIn.tokens || typeof signIn.tokens.token !== 'string') fail('SIGN_IN_DENIED');
    const client = clients.authenticated(signIn.tokens.token);
    authClients[slot] = client;
    const exact = await client.query(api.cadDevAuthQualificationStore.readCurrent, {
      runKeySha256: register.runKeySha256,
      validThrough: Date.now() + 500,
    });
    if (!exact || exact.authMethod !== 'password' || exact.active !== true) fail('EXACT_SESSION_DENIED');
    exactSessions.push({ slot, userId: exact.userId, loginSessionId: exact.loginSessionId });
  }
  await authClients[0].action(api.auth.signOut, {});
  const slot0Revoked = await authClients[0].query(api.cadDevAuthQualificationStore.readCurrent, {
    runKeySha256: register.runKeySha256,
    validThrough: Date.now() + 500,
  });
  if (slot0Revoked !== null) fail('LOGOUT_NOT_REVOKED');
  const revoke = await clients.operator.action(api.cadDevAuthQualification.revokeUsers, {
    ...common,
    userIds: exactSessions.map(session => session.userId),
  });
  const slot1Revoked = await authClients[1].query(api.cadDevAuthQualificationStore.readCurrent, {
    runKeySha256: register.runKeySha256,
    validThrough: Date.now() + 500,
  });
  if (slot1Revoked !== null) fail('REVOKE_NOT_OBSERVED');
  return sanitized('DEVELOPMENT_AUTH_SESSION_QUALIFICATION_EXECUTED', {
    runId: register.runId,
    deploymentName: register.deploymentName,
    windowStartUtc: register.windowStartUtc,
    windowEndUtc: register.windowEndUtc,
    acceptedProjectionSha256: register.acceptedProjectionSha256,
    acceptanceReceiptSha256: register.acceptanceReceiptSha256,
    runKeySha256: register.runKeySha256,
    operations: {
      provisioned: provision.slots.length,
      signIns: exactSessions.length,
      exactSessionReads: 4,
      signOuts: 1,
      revocations: 1,
    },
    retainedUsersAndAccounts: revoke.retainedUsersAndAccounts === true,
    finalInventory: revoke.after.map(slot => ({ slot: slot.slot, counts: slot.counts })),
    userIdsObserved: exactSessions.length,
    sessionIdsObserved: exactSessions.length,
  });
}

async function main() {
  const registerPath = path.resolve(process.argv[2] || defaultRegisterPath);
  assertPrivateFile(registerPath);
  const register = readJson(registerPath);
  const { ConvexHttpClient } = await import('convex/browser');
  const { api } = await import('../convex/_generated/api.js');
  const clients = {
    operator: new ConvexHttpClient(register.convexUrl, { logger: false }),
    authenticated: token => new ConvexHttpClient(register.convexUrl, { logger: false, auth: token }),
  };
  const evidence = await runWithClients({ register, clients, api });
  const outputDir = path.join(defaultEvidenceRoot, register.runId);
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  const evidencePath = path.join(outputDir, 'sanitized-evidence.json');
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
  const receipt = sanitized('DEVELOPMENT_AUTH_SESSION_QUALIFICATION_RECEIPT', {
    runId: register.runId,
    evidenceSha256: sha256(fs.readFileSync(evidencePath)),
  });
  const receiptPath = path.join(outputDir, 'sanitized-run-receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write(JSON.stringify({
    status: evidence.status,
    evidencePath,
    receiptPath,
    evidenceSha256: receipt.evidenceSha256,
    receiptSha256: sha256(fs.readFileSync(receiptPath)),
  }, null, 2) + '\n');
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = { validateRegister, runWithClients, sanitized };
