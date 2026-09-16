#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const defaultUploadRegisterPath = path.join(
  root,
  '.local/cad-convex/upload-session-qualification-rebind-0100z/private-upload-session-qualification-register.json',
);
const defaultAuthRegisterPath = path.join(
  root,
  '.local/cad-convex/dev-auth-session-immediate-rebind/run-register.json',
);
const defaultProjectionPath = path.join(
  root,
  '.local/cad-convex/upload-session-qualification-rebind-0100z/source-safe-rebind-projection.json',
);
const defaultAcceptanceReceiptPath = path.join(
  root,
  '.local/cad-convex/upload-session-qualification-rebind-0100z/rebind-acceptance-receipt.json',
);
const defaultEvidenceRoot = path.join(root, '.local/cad-convex/upload-session-qualification-runs');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const fail = code => { throw new Error(code); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const fileMode = file => fs.statSync(file).mode & 0o777;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertPrivateFile(file) {
  if (!path.isAbsolute(file) || path.normalize(file) !== file) fail('REGISTER_PATH_INVALID');
  if (fileMode(file) !== 0o600) fail('REGISTER_MODE_INVALID');
}

function validateAuthRegister(register) {
  const required = ['version', 'mode', 'convexUrl', 'deploymentName', 'runId', 'runKey',
    'runKeySha256', 'acceptedProjectionSha256', 'acceptanceReceiptSha256', 'cohort',
    'passwords', 'windowStartUtc', 'windowEndUtc'];
  if (!register || typeof register !== 'object' || !required.every(key => Object.hasOwn(register, key))) {
    fail('AUTH_REGISTER_INVALID');
  }
  if (register.version !== 1 || register.mode !== 'cad-dev-auth-session-qualification') {
    fail('AUTH_REGISTER_INVALID');
  }
  if (register.convexUrl !== 'https://majestic-alligator-31.convex.cloud'
    || register.deploymentName !== 'majestic-alligator-31') fail('AUTH_REGISTER_TARGET_INVALID');
  if (!Array.isArray(register.cohort) || register.cohort.length !== 2
    || register.cohort[0] !== 'cad-test-alpha-20260915@auth-test.invalid'
    || register.cohort[1] !== 'cad-test-beta-20260915@auth-test.invalid') {
    fail('AUTH_REGISTER_COHORT_INVALID');
  }
  if (!Array.isArray(register.passwords) || register.passwords.length !== 2
    || register.passwords.some(password => typeof password !== 'string'
      || password.length < 12 || password.length > 128)) {
    fail('AUTH_REGISTER_PASSWORD_INVALID');
  }
}

function validateUploadRegister(register) {
  const required = ['version', 'mode', 'deploymentName', 'runId', 'runKey', 'runKeySha256',
    'windowStartUtc', 'windowEndUtc', 'syntheticContext'];
  if (!register || typeof register !== 'object' || !required.every(key => Object.hasOwn(register, key))) {
    fail('UPLOAD_REGISTER_INVALID');
  }
  if (register.version !== 1 || register.mode !== 'cad-dev-upload-session-qualification') {
    fail('UPLOAD_REGISTER_INVALID');
  }
  if (register.deploymentName !== 'majestic-alligator-31') fail('UPLOAD_REGISTER_TARGET_INVALID');
  if (!/^[a-z0-9-]{8,80}$/.test(register.runId)) fail('UPLOAD_REGISTER_RUN_INVALID');
  if (typeof register.runKey !== 'string' || sha256(register.runKey) !== register.runKeySha256) {
    fail('UPLOAD_REGISTER_KEY_INVALID');
  }
  if (!hex(register.runKeySha256)) fail('UPLOAD_REGISTER_DIGEST_INVALID');
  const start = Date.parse(register.windowStartUtc);
  const end = Date.parse(register.windowEndUtc);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start
    || end > start + 15 * 60 * 1000) fail('UPLOAD_REGISTER_WINDOW_INVALID');
  const context = register.syntheticContext;
  if (!context || typeof context !== 'object' || !safeId(context.expectedShopId)
    || context.authMethod !== 'password') fail('UPLOAD_REGISTER_CONTEXT_INVALID');
  return { start, end };
}

function readAcceptedArtifacts({ projectionPath, acceptanceReceiptPath }) {
  assertPrivateFile(projectionPath);
  assertPrivateFile(acceptanceReceiptPath);
  const projectionBytes = fs.readFileSync(projectionPath);
  const acceptanceReceiptBytes = fs.readFileSync(acceptanceReceiptPath);
  const projection = JSON.parse(projectionBytes.toString('utf8'));
  const acceptanceReceipt = JSON.parse(acceptanceReceiptBytes.toString('utf8'));
  if (!projection || projection.mode !== 'source-safe-cad-dev-upload-session-qualification-rebind-projection') {
    fail('PROJECTION_INVALID');
  }
  if (!acceptanceReceipt || acceptanceReceipt.mode !== 'cad-dev-upload-session-qualification-rebind-acceptance-receipt') {
    fail('ACCEPTANCE_RECEIPT_INVALID');
  }
  return {
    acceptedProjectionSha256: sha256(projectionBytes),
    acceptanceReceiptSha256: sha256(acceptanceReceiptBytes),
  };
}

function sanitized(status, extra = {}) {
  return {
    version: 1,
    mode: 'cad-dev-upload-session-qualification-sanitized-evidence',
    status,
    generatedAtUtc: nowIso(),
    cadUploadsDisabled: true,
    bodyAdmissionAuthorized: false,
    conversionAllowed: false,
    privateCadUsed: false,
    productionTouched: false,
    retry: false,
    secondRun: false,
    ...extra,
  };
}

function writeJson600(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

async function runWithClients({ uploadRegister, authRegister, acceptedArtifacts, clients, api, now = Date.now }) {
  validateAuthRegister(authRegister);
  const { start, end } = validateUploadRegister(uploadRegister);
  if (!acceptedArtifacts || !hex(acceptedArtifacts.acceptedProjectionSha256)
    || !hex(acceptedArtifacts.acceptanceReceiptSha256)) fail('ACCEPTED_ARTIFACTS_INVALID');
  const observed = now();
  if (!Number.isSafeInteger(observed) || observed < start || observed >= end) fail('RUN_WINDOW_CLOSED');
  const slot = 0;
  const signIn = await clients.operator.action(api.auth.signIn, {
    provider: 'password',
    params: {
      flow: 'signIn',
      email: authRegister.cohort[slot],
      password: authRegister.passwords[slot],
    },
  });
  if (!signIn || !signIn.tokens || typeof signIn.tokens.token !== 'string') fail('SIGN_IN_DENIED');
  const authenticated = clients.authenticated(signIn.tokens.token);
  const validThrough = Math.min(Date.now() + 500, end);
  const exact = await authenticated.query(api.cadDevUploadSessionQualificationSession.readCurrent, {
    runKeySha256: uploadRegister.runKeySha256,
    acceptedProjectionSha256: acceptedArtifacts.acceptedProjectionSha256,
    acceptanceReceiptSha256: acceptedArtifacts.acceptanceReceiptSha256,
    validThrough,
  });
  if (!exact || exact.authMethod !== 'password' || exact.active !== true) fail('EXACT_UPLOAD_SESSION_AUTH_DENIED');
  const issuedAt = Date.now();
  const expiresAt = Math.min(exact.expiresAt, issuedAt + 5 * 60 * 1000, end);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= issuedAt) fail('UPLOAD_SESSION_WINDOW_DENIED');
  const principal = {
    userId: exact.userId,
    shopId: uploadRegister.syntheticContext.expectedShopId,
    loginSessionId: exact.loginSessionId,
    authMethod: 'password',
  };
  const record = {
    schemaVersion: 2,
    ...principal,
    sessionId: crypto.randomUUID(),
    cadUploadAllowed: true,
    transport: 'bearer',
    issuedAt,
    expiresAt,
    status: 'active',
  };
  let bridge;
  try {
    bridge = await authenticated.action(api.cadDevUploadSessionQualification.issueReadRevokeWithSyntheticAuthority, {
      runKey: uploadRegister.runKey,
      runKeySha256: uploadRegister.runKeySha256,
      acceptedProjectionSha256: acceptedArtifacts.acceptedProjectionSha256,
      acceptanceReceiptSha256: acceptedArtifacts.acceptanceReceiptSha256,
      principal,
      credentialDigest: sha256(`upload-session-qualification:${uploadRegister.runId}:${record.sessionId}`),
      record,
    });
  } finally {
    await authenticated.action(api.auth.signOut, {});
  }
  if (!bridge || bridge.code !== 'SYNTHETIC_UPLOAD_SESSION_SEQUENCE_REVOKED'
    || bridge.cadUploadsDisabled !== true || bridge.bodyAdmissionAuthorized !== false
    || bridge.conversionAllowed !== false || bridge.retainedUploadSession !== true
    || bridge.readAfterRevoke !== false || bridge.syntheticAuthorityProvisioned !== true
    || bridge.syntheticAuthorityRevoked !== true || bridge.authorityRowsRetained !== true) {
    fail('UPLOAD_SESSION_BRIDGE_DENIED');
  }
  return sanitized('DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTED', {
    runId: uploadRegister.runId,
    deploymentName: uploadRegister.deploymentName,
    windowStartUtc: uploadRegister.windowStartUtc,
    windowEndUtc: uploadRegister.windowEndUtc,
    acceptedProjectionSha256: acceptedArtifacts.acceptedProjectionSha256,
    acceptanceReceiptSha256: acceptedArtifacts.acceptanceReceiptSha256,
    runKeySha256: uploadRegister.runKeySha256,
    operationCounts: {
      signIns: 1,
      exactSessionReads: 1,
      syntheticAuthorityProvisions: 1,
      bridgeActions: 1,
      uploadSessionInserts: bridge.inserted ? 1 : 0,
      uploadSessionReads: 2,
      uploadSessionRevocations: bridge.revoked ? 1 : 0,
      syntheticAuthorityRevocations: 1,
      signOuts: 1,
    },
    retainedUploadSession: true,
    syntheticAuthorityProvisioned: true,
    syntheticAuthorityRevoked: true,
    authorityRowsRetained: true,
    readBeforeRevoke: bridge.readBeforeRevoke === true,
    readAfterRevoke: bridge.readAfterRevoke === false,
    userIdObserved: true,
    loginSessionIdObserved: true,
    rawCredentialRecorded: false,
    rawPasswordRecorded: false,
  });
}

async function main() {
  const uploadRegisterPath = path.resolve(process.argv[2] || defaultUploadRegisterPath);
  const authRegisterPath = path.resolve(process.argv[3] || defaultAuthRegisterPath);
  const projectionPath = path.resolve(process.argv[4] || defaultProjectionPath);
  const acceptanceReceiptPath = path.resolve(process.argv[5] || defaultAcceptanceReceiptPath);
  assertPrivateFile(uploadRegisterPath);
  assertPrivateFile(authRegisterPath);
  const uploadRegister = readJson(uploadRegisterPath);
  const authRegister = readJson(authRegisterPath);
  const acceptedArtifacts = readAcceptedArtifacts({ projectionPath, acceptanceReceiptPath });
  const { ConvexHttpClient } = await import('convex/browser');
  const { api } = await import('../convex/_generated/api.js');
  const clients = {
    operator: new ConvexHttpClient('https://majestic-alligator-31.convex.cloud', { logger: false }),
    authenticated: token => new ConvexHttpClient('https://majestic-alligator-31.convex.cloud', { logger: false, auth: token }),
  };
  const evidence = await runWithClients({ uploadRegister, authRegister, acceptedArtifacts, clients, api });
  const outputDir = path.join(defaultEvidenceRoot, uploadRegister.runId);
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(outputDir, 0o700);
  const evidencePath = path.join(outputDir, 'sanitized-evidence.json');
  writeJson600(evidencePath, evidence);
  const receipt = sanitized('DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_RECEIPT', {
    runId: uploadRegister.runId,
    evidenceSha256: sha256(fs.readFileSync(evidencePath)),
  });
  const receiptPath = path.join(outputDir, 'sanitized-run-receipt.json');
  writeJson600(receiptPath, receipt);
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

module.exports = {
  validateAuthRegister,
  validateUploadRegister,
  readAcceptedArtifacts,
  runWithClients,
  sanitized,
};
