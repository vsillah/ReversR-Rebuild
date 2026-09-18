const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

const {
  createSyntheticDevelopmentBridge,
  startBrowserSessionHarnessServer,
  runBrowserSessionHarness,
} = require('./cad-dev-browser-session-harness');

test('browser/session harness issues only a disabled browser session through the mounted route', async () => {
  const result = await runBrowserSessionHarness();
  assert.equal(result.status, 'DEVELOPMENT_BROWSER_SESSION_HARNESS_PASSED');
  assert.equal(result.sessionCode, 'SESSION_READY');
  assert.equal(result.sessionCanSubmit, false);
  assert.equal(result.issuerStatus, 200);
  assert.equal(result.uploadStatus, 503);
  assert.equal(result.uploadCode, 'USER_UPLOADS_DISABLED');
  assert.equal(result.uploadAdmissionOpened, false);
  assert.equal(result.cookieIssued, true);
  assert.equal(result.cookieValueRecorded, false);
  assert.equal(result.csrfTokenRecorded, false);
  assert.equal(result.bodyReads, 0);
  assert.equal(result.cadUploadsDisabled, true);
  assert.equal(result.bodyAdmissionAuthorized, false);
  assert.equal(result.conversionAllowed, false);
  assert.equal(result.sandboxDispatchAllowed, false);
  assert.doesNotMatch(JSON.stringify(result), /us1\.|synthetic-browser-user|synthetic-browser-shop|synthetic-browser-login/);
});

test('default mounted route remains unavailable without injected development adapters', async () => {
  const server = await startBrowserSessionHarnessServer();
  try {
    const response = await fetch(`${server.baseUrl}/api/cad/dev-upload-session`, {
      method: 'POST',
      headers: {
        Origin: 'https://synthetic-browser.example.invalid',
        Authorization: 'Bearer synthetic-browser-login',
        'Content-Type': 'application/json',
      },
      body: '{"sentinel":"body-must-not-be-read"}',
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.code, 'USER_AUTH_UNAVAILABLE');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(server.bodyReads, 0);
  } finally {
    await server.close();
  }
});

test('revoked synthetic login stops before upload route and without retry', async () => {
  const synthetic = createSyntheticDevelopmentBridge();
  synthetic.revokeLogin();
  const server = await startBrowserSessionHarnessServer({
    issuerBridge: synthetic.bridge,
    uploadOptions: { sessionService: synthetic.bridge, allowedOrigins: [synthetic.origin] },
  });
  try {
    const response = await fetch(`${server.baseUrl}/api/cad/dev-upload-session`, {
      method: 'POST',
      headers: {
        Origin: synthetic.origin,
        Authorization: synthetic.authorization,
      },
    });
    const payload = await response.json();
    assert.equal(response.status, 401);
    assert.equal(payload.code, 'USER_SESSION_REQUIRED');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(synthetic.resolveCalls, 1);
    assert.equal(server.bodyReads, 0);
  } finally {
    await server.close();
  }
});

test('harness stays source-only and isolated from production API routes', () => {
  const source = fs.readFileSync('scripts/cad-dev-browser-session-harness.js', 'utf8');
  assert.doesNotMatch(source, /https:\/\/majestic-alligator-31|convex\.cloud|process\.env|child_process|cadSandbox|convert\(/);
  assert.doesNotMatch(source, /express\.json|express\.raw|FileReader|FormData/);
  for (const file of fs.readdirSync('api').filter(name => name.endsWith('.js')).map(name => `api/${name}`)) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /cad-dev-browser-session-harness|cadDevAuthSessionIssuerRouter/);
  }
  assert.match(fs.readFileSync('server/cadUserUploadRouter.js', 'utf8'), /const BODY_ADMISSION_AUTHORIZED = false;/);
});

test('fixture CLI emits sanitized evidence only', () => {
  const child = spawnSync(process.execPath, ['scripts/cad-dev-browser-session-harness.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, 'DEVELOPMENT_BROWSER_SESSION_HARNESS_PASSED');
  assert.match(result.cookieDigest, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(child.stdout, /us1\.|synthetic-browser-user|synthetic-browser-shop|synthetic-browser-login/);
});
