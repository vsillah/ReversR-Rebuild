const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createUploadSessionVerifier } = require('../server/uploadSession');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  createCadStartupLiveGateSessionService,
  createCadStartupLiveGateSourceInstallClosure,
} = require('../server/cadStartupLiveGateSourceInstallClosure');
const {
  GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256,
  createOpaqueTokenVerifierProof,
  createProductionSessionCredentialAcceptanceRepair,
} = require('../server/cadProductionSessionCredentialAcceptanceRepair');
const checker = require('./cad-auth-production-session-credential-acceptance-repair-checker');

const sha = value => createHash('sha256').update(value).digest('hex');
const PRODUCTION_PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_URL: 'reversr-h4t9buhmx-vsillahs-projects.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: '8b8b47b67b2a39ec3353121aa5c832262469c92e',
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});

function request(headers) {
  return new Proxy({ headers }, { get(target, key) {
    if (key === 'headers' || key === 'rawHeaders') return target[key];
    throw new Error(`Request access forbidden: ${String(key)}`);
  } });
}

test('opaque non-canonical us1 bearer reaches digest lookup without exposing the value', async () => {
  const token = `us1.${'A'.repeat(42)}B`;
  const tokenDigest = sha(token);
  let observedLookupDigest = null;
  const verify = createUploadSessionVerifier({
    now: () => 1000,
    allowedOrigins: [],
    lookupSession: async key => {
      observedLookupDigest = key;
      return key === tokenDigest ? {
        schemaVersion: 1,
        userId: 'source-owned-internal-tester',
        shopId: 'source-owned-internal-shop',
        sessionId: 'rrb-ref:cad-upload-internal-mark-test-session-v1',
        authMethod: 'password',
        status: 'active',
        transport: 'bearer',
        expiresAt: 2000,
        cadUploadAllowed: true,
      } : null;
    },
  });
  const result = await verify(request({ authorization: `Bearer ${token}` }));
  assert.equal(observedLookupDigest, tokenDigest);
  assert.equal(result.ok, true);
  assert.equal(result.principal.sessionId, 'rrb-ref:cad-upload-internal-mark-test-session-v1');
});

test('repair proof is source-only, default-closed, and bound to generated digest', () => {
  const repair = createProductionSessionCredentialAcceptanceRepair();
  assert.equal(repair.accepted, true);
  assert.equal(repair.status, 'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_REPAIRED_DEFAULT_CLOSED');
  assert.equal(repair.stoppedLiveOpening.observedAtUtc, '2026-10-02T11:02:05Z');
  assert.equal(
    repair.boundInputs.generatedPrivateCredentialDigestSha256,
    GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256,
  );
  assert.equal(repair.verifierRepair.acceptsOpaqueUrlSafeBearerShape, true);
  assert.equal(repair.verifierRepair.intentionallyNonCanonicalFixture, true);
  assert.equal(repair.verifierRepair.verifierCanonicalBase64RequirementRemoved, true);
  assert.equal(repair.requestTimeSessionServiceRepair.priorStartupCapturedWindowRisk, true);
  assert.equal(repair.requestTimeSessionServiceRepair.requestTimeWindowResolutionRequired, true);
  assert.equal(repair.requestTimeSessionServiceRepair.dynamicLookupSessionServiceInstalled, true);
  assert.equal(repair.requestTimeSessionServiceRepair.verifierStillUsesDigestOnlyLookup, true);
  assert.equal(repair.liveOpeningAuthorized, false);
  assert.equal(repair.uploadSessionIssued, false);
  assert.equal(repair.requestBodyAdmittedOrRead, false);
  assert.equal(repair.effectsExecuted, 0);
});

test('request-time startup live gate session service accepts digest in the active window', async () => {
  let nowMs = Date.parse('2026-10-02T09:52:43Z');
  const readDeploymentMetadata = () => readCadProductionCurrentDeploymentMetadata(PRODUCTION_PROOF_ENV);
  const staleStartupClosure = createCadStartupLiveGateSourceInstallClosure({
    deploymentMetadata: readDeploymentMetadata(),
    now: () => nowMs,
  });
  const requestTimeSessionService = createCadStartupLiveGateSessionService({
    deploymentMetadata: readDeploymentMetadata,
    now: () => nowMs,
  });
  nowMs = Date.parse('2026-10-02T11:02:05Z');
  assert.equal(
    await staleStartupClosure.sessionService.lookupSession(GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256),
    null,
  );
  const session = await requestTimeSessionService.lookupSession(
    GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256,
  );
  assert.equal(session.sessionId, 'rrb-ref:cad-upload-internal-mark-test-session-v1');
  assert.equal(session.status, 'active');
  assert.equal(session.transport, 'bearer');
  assert.equal(session.cadUploadAllowed, true);
  assert.deepEqual(
    await requestTimeSessionService.issueSession(),
    { ok: false, code: 'UPLOAD_SESSION_ISSUANCE_DISABLED' },
  );
  assert.deepEqual(
    await requestTimeSessionService.revokeSession(),
    { ok: false, code: 'UPLOAD_SESSION_REVOCATION_NOT_AUTHORIZED' },
  );
});

test('server startup route uses request-time live gate session service', () => {
  const source = require('node:fs').readFileSync('server/index.js', 'utf8');
  assert.match(source, /createCadStartupLiveGateSessionService/);
  assert.match(source, /const cadUserUploadSessionService = createCadStartupLiveGateSessionService/);
  assert.match(source, /fallbackSessionService: cadFallbackUploadSessionService/);
});

test('proof rejects private value fields', () => {
  assert.equal(createOpaqueTokenVerifierProof().tokenValueIncluded, false);
  assert.equal(
    checker.checkPacket({
      ...checker.expectedPacket(),
      privateValueIncluded: true,
    }).code,
    'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_PACKET_DRIFT',
  );
});

test('checker packet stays deterministic and default-closed', () => {
  const packet = checker.expectedPacket();
  assert.equal(packet.acceptanceResolved, true);
  assert.equal(packet.privateValueIncluded, false);
  assert.equal(packet.uploadSessionIssuanceAuthorized, false);
  assert.equal(packet.requestBodyAdmissionAuthorized, false);
  assert.equal(checker.checkPacket(packet).ok, true);
});

test('checker CLI validates the committed packet', () => {
  const result = spawnSync(process.execPath, [
    'scripts/cad-auth-production-session-credential-acceptance-repair-checker.js',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(
    parsed.code,
    'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_REPAIR_PACKET_VALID_DEFAULT_CLOSED',
  );
  assert.match(parsed.packetSha256, /^[a-f0-9]{64}$/);
});
