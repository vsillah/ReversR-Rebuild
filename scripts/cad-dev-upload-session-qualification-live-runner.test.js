const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const runner = require('./cad-dev-upload-session-qualification-live-runner');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const querySource = fs.readFileSync('convex/cadDevUploadSessionQualificationSession.ts', 'utf8');
const runnerSource = fs.readFileSync('scripts/cad-dev-upload-session-qualification-live-runner.js', 'utf8');

function registers() {
  const now = Date.now();
  const runKey = 'upload-run-key-for-test-only';
  return {
    authRegister: {
      version: 1,
      mode: 'cad-dev-auth-session-qualification',
      convexUrl: 'https://majestic-alligator-31.convex.cloud',
      deploymentName: 'majestic-alligator-31',
      runId: 'cad-dev-auth-session-qualification-1925z',
      runKey: 'auth-run-key-for-test-only',
      runKeySha256: sha256('auth-run-key-for-test-only'),
      acceptedProjectionSha256: 'a'.repeat(64),
      acceptanceReceiptSha256: 'b'.repeat(64),
      cohort: [
        'cad-test-alpha-20260915@auth-test.invalid',
        'cad-test-beta-20260915@auth-test.invalid',
      ],
      passwords: ['synthetic-password-one', 'synthetic-password-two'],
      windowStartUtc: new Date(now - 1000).toISOString(),
      windowEndUtc: new Date(now + 60000).toISOString(),
    },
    uploadRegister: {
      version: 1,
      mode: 'cad-dev-upload-session-qualification',
      deploymentName: 'majestic-alligator-31',
      runId: 'cad-dev-upload-session-test',
      runKey,
      runKeySha256: sha256(runKey),
      windowStartUtc: new Date(now - 1000).toISOString(),
      windowEndUtc: new Date(now + 60000).toISOString(),
      syntheticContext: {
        expectedShopId: 'cad-upload-session-test-shop',
        authMethod: 'password',
      },
    },
  };
}

test('authenticated session query uses the upload-session binding and exact server auth session', () => {
  assert.match(querySource, /export const readCurrent = query/);
  assert.match(querySource, /cadDevUploadSessionQualificationBinding/);
  assert.match(querySource, /getAuthSessionId\(ctx\)/);
  assert.match(querySource, /readExactLibrarySession\(ctx, loginSessionId, args\.validThrough\)/);
  assert.match(querySource, /returns: v\.union\(exactSession, v\.null\(\)\)/);
  assert.match(querySource, /QUALIFICATION_SESSION_WINDOW_CLOSED/);
  assert.doesNotMatch(querySource, /jwt|decode|atob|Buffer\.from/i);
  assert.doesNotMatch(querySource, /ctx\.db\.query\(['"`](users|authSessions|authAccounts)/);
});

test('runner validates private registers without leaking raw authority into source', () => {
  const { authRegister, uploadRegister } = registers();
  assert.doesNotThrow(() => runner.validateAuthRegister(authRegister));
  assert.deepEqual(Object.keys(runner.validateUploadRegister(uploadRegister)).sort(), ['end', 'start']);
  assert.throws(() => runner.validateAuthRegister({ ...authRegister, passwords: ['short', authRegister.passwords[1]] }),
    /AUTH_REGISTER_PASSWORD_INVALID/);
  assert.throws(() => runner.validateUploadRegister({ ...uploadRegister, runKeySha256: '0'.repeat(64) }),
    /UPLOAD_REGISTER_KEY_INVALID/);
  assert.doesNotThrow(() => runner.validateUploadRegister({
    ...uploadRegister,
    acceptedProjectionSha256: undefined,
    acceptanceReceiptSha256: undefined,
  }));
  assert.throws(() => runner.validateUploadRegister({ ...uploadRegister,
    syntheticContext: { ...uploadRegister.syntheticContext, expectedShopId: '' } }), /UPLOAD_REGISTER_CONTEXT_INVALID/);
  assert.doesNotMatch(runnerSource, /cad-test-alpha-password|cad-test-beta-password|BEGIN PRIVATE KEY|sk_live_|github_pat_|ghp_/);
});

test('runner derives accepted binding digests from adjacent mode-locked artifacts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-upload-artifacts-'));
  fs.chmodSync(dir, 0o700);
  const projectionPath = path.join(dir, 'source-safe-rebind-projection.json');
  const acceptanceReceiptPath = path.join(dir, 'rebind-acceptance-receipt.json');
  const projection = { mode: 'source-safe-cad-dev-upload-session-qualification-rebind-projection', runId: 'x' };
  const receipt = { mode: 'cad-dev-upload-session-qualification-rebind-acceptance-receipt', runId: 'x' };
  fs.writeFileSync(projectionPath, JSON.stringify(projection, null, 2) + '\n', { mode: 0o600 });
  fs.writeFileSync(acceptanceReceiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  const artifacts = runner.readAcceptedArtifacts({ projectionPath, acceptanceReceiptPath });
  assert.equal(artifacts.acceptedProjectionSha256, sha256(fs.readFileSync(projectionPath)));
  assert.equal(artifacts.acceptanceReceiptSha256, sha256(fs.readFileSync(acceptanceReceiptPath)));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('runner signs in, reads exact authenticated session, calls bridge as that session, and signs out once', async () => {
  const { authRegister, uploadRegister } = registers();
  const acceptedArtifacts = {
    acceptedProjectionSha256: 'c'.repeat(64),
    acceptanceReceiptSha256: 'd'.repeat(64),
  };
  const calls = [];
  const api = {
    auth: { signIn: 'signIn', signOut: 'signOut' },
    cadDevUploadSessionQualificationSession: { readCurrent: 'readCurrent' },
    cadDevUploadSessionQualification: {
      issueReadRevokeWithSyntheticAuthority: 'issueReadRevokeWithSyntheticAuthority',
    },
  };
  const clients = {
    operator: {
      action: async (fn, args) => {
        calls.push(['operator-action', fn, args]);
        if (fn === 'signIn') return { tokens: { token: 'token-alpha' } };
        throw new Error('unexpected operator action');
      },
    },
    authenticated: token => ({
      query: async (fn, args) => {
        calls.push(['auth-query', fn, token, args]);
        assert.equal(fn, 'readCurrent');
        assert.equal(args.runKeySha256, uploadRegister.runKeySha256);
        assert.equal(args.acceptedProjectionSha256, acceptedArtifacts.acceptedProjectionSha256);
        assert.equal(args.acceptanceReceiptSha256, acceptedArtifacts.acceptanceReceiptSha256);
        return {
          userId: 'user-id-alpha',
          loginSessionId: 'session-id-alpha',
          authMethod: 'password',
          expiresAt: Date.now() + 60000,
          active: true,
        };
      },
      action: async (fn, args) => {
        calls.push(['auth-action', fn, token, args]);
        if (fn === 'issueReadRevokeWithSyntheticAuthority') {
          assert.equal(args.runKey, uploadRegister.runKey);
          assert.equal(args.principal.userId, 'user-id-alpha');
          assert.equal(args.principal.loginSessionId, 'session-id-alpha');
          assert.equal(args.record.userId, args.principal.userId);
          assert.equal(args.record.loginSessionId, args.principal.loginSessionId);
          assert.equal(args.record.cadUploadAllowed, true);
          assert.match(args.credentialDigest, /^[a-f0-9]{64}$/);
          return {
            code: 'SYNTHETIC_UPLOAD_SESSION_SEQUENCE_REVOKED',
            cadUploadsDisabled: true,
            bodyAdmissionAuthorized: false,
            conversionAllowed: false,
            retainedUploadSession: true,
            inserted: true,
            readBeforeRevoke: true,
            revoked: true,
            readAfterRevoke: false,
            syntheticAuthorityProvisioned: true,
            syntheticAuthorityRevoked: true,
            authorityRowsRetained: true,
          };
        }
        if (fn === 'signOut') return null;
        throw new Error('unexpected authenticated action');
      },
    }),
  };
  const evidence = await runner.runWithClients({ uploadRegister, authRegister, acceptedArtifacts, clients, api });
  assert.equal(evidence.status, 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTED');
  assert.equal(evidence.cadUploadsDisabled, true);
  assert.equal(evidence.bodyAdmissionAuthorized, false);
  assert.equal(evidence.conversionAllowed, false);
  assert.equal(evidence.operationCounts.signIns, 1);
  assert.equal(evidence.operationCounts.syntheticAuthorityProvisions, 1);
  assert.equal(evidence.operationCounts.bridgeActions, 1);
  assert.equal(evidence.operationCounts.syntheticAuthorityRevocations, 1);
  assert.equal(evidence.operationCounts.signOuts, 1);
  assert.equal(evidence.syntheticAuthorityProvisioned, true);
  assert.equal(evidence.syntheticAuthorityRevoked, true);
  assert.equal(evidence.authorityRowsRetained, true);
  assert.equal(evidence.rawCredentialRecorded, false);
  assert.equal(evidence.rawPasswordRecorded, false);
  assert.deepEqual(calls.map(call => call[0]), ['operator-action', 'auth-query', 'auth-action', 'auth-action']);
  assert.equal(calls[2][1], 'issueReadRevokeWithSyntheticAuthority');
  assert.equal(calls[3][1], 'signOut');
});

test('runner signs out before propagating a bridge failure', async () => {
  const { authRegister, uploadRegister } = registers();
  const acceptedArtifacts = {
    acceptedProjectionSha256: 'c'.repeat(64),
    acceptanceReceiptSha256: 'd'.repeat(64),
  };
  const calls = [];
  const api = {
    auth: { signIn: 'signIn', signOut: 'signOut' },
    cadDevUploadSessionQualificationSession: { readCurrent: 'readCurrent' },
    cadDevUploadSessionQualification: {
      issueReadRevokeWithSyntheticAuthority: 'issueReadRevokeWithSyntheticAuthority',
    },
  };
  const clients = {
    operator: {
      action: async fn => {
        calls.push(['operator-action', fn]);
        if (fn === 'signIn') return { tokens: { token: 'token-alpha' } };
        throw new Error('unexpected operator action');
      },
    },
    authenticated: token => ({
      query: async fn => {
        calls.push(['auth-query', fn, token]);
        return {
          userId: 'user-id-alpha',
          loginSessionId: 'session-id-alpha',
          authMethod: 'password',
          expiresAt: Date.now() + 60000,
          active: true,
        };
      },
      action: async fn => {
        calls.push(['auth-action', fn, token]);
        if (fn === 'issueReadRevokeWithSyntheticAuthority') throw new Error('AUTH_UNAVAILABLE');
        if (fn === 'signOut') return null;
        throw new Error('unexpected authenticated action');
      },
    }),
  };
  await assert.rejects(
    runner.runWithClients({ uploadRegister, authRegister, acceptedArtifacts, clients, api }),
    /AUTH_UNAVAILABLE/,
  );
  assert.deepEqual(calls.map(call => call[0]), ['operator-action', 'auth-query', 'auth-action', 'auth-action']);
  assert.equal(calls[2][1], 'issueReadRevokeWithSyntheticAuthority');
  assert.equal(calls[3][1], 'signOut');
});
