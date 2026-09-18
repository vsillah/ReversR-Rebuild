const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const packet = require('../docs/cad-dev-browser-session-qualification-packet.json');
const read = file => fs.readFileSync(file, 'utf8');
const document = read('docs/cad-dev-browser-session-qualification-packet.md');

test('packet binds PR 314 source evidence and detects drift in the reviewed route chain', () => {
  assert.equal(packet.baseMainCommit, 'aeb437e29fef0eb87b6ff7db3292a247b295bde6');
  assert.equal(packet.dependsOnPr, 314);
  for (const [file, hash] of Object.entries(packet.sourceSha256)) {
    assert.equal(createHash('sha256').update(read(file)).digest('hex'), hash, file);
  }
  assert.ok(packet.sourceSha256['docs/cad-dev-browser-session-harness.md']);
});

test('pending target, acceptance and rollback cannot be mistaken for a run grant', () => {
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.status, 'SOURCE_READY_RUN_BLOCKED_PENDING_BINDING_AND_APPROVAL');
  for (const value of Object.values(packet.authority)) assert.equal(value, false);
  for (const key of ['exactOrigin', 'exactBrowserRoute', 'sourceCommit', 'owner', 'productionSmokeReceiptSha256']) {
    assert.equal(packet.target[key], null, key);
  }
  assert.equal(packet.auth.acceptanceReceiptSha256, null);
  assert.equal(packet.auth.adapterSourceSha256, null);
  for (const key of ['runId', 'startUtc', 'endUtc', 'packetSha256', 'rollbackReceiptSha256', 'custodian', 'costEvidenceSha256']) {
    assert.equal(packet.binding[key], null, key);
  }
  assert.equal(packet.binding.maxCostUsd, 0);
  assert.equal(packet.auth.realProviderAllowed, false);
  assert.equal(packet.auth.lifetimeMs, 60000);
});

test('one-run budget remains bodyless, without retry, redirects or second issuance', () => {
  assert.deepEqual(packet.limits, {
    maxRuns: 1, maxIssuerRequests: 1, maxDisabledUploadRequests: 1,
    requestBodyBytes: 0, bodyReads: 0, retry: false, secondRun: false, redirects: false,
  });
  assert.ok(packet.stopOutcomes.includes('OUTCOME_UNKNOWN'));
  assert.match(document, /before the first request/);
  assert.match(document, /skip the import POST/);
  assert.match(document, /no retry and no second run/);
});

test('browser acceptance matches secure issuer and immutable disabled upload boundary', () => {
  const issuer = read('server/cadDevAuthSessionIssuerBridge.js');
  const upload = read('server/cadUserUploadRouter.js');
  assert.match(issuer, /Path=\/; Secure; HttpOnly; SameSite=Strict/);
  assert.match(issuer, /process\.env\.NODE_ENV !== 'production'/);
  assert.match(issuer, /process\.env\.VERCEL_ENV !== 'production'/);
  assert.match(upload, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.ok(upload.indexOf('const result = await verify(req)') < upload.indexOf('const admission = await validateRequestBody(req)'));
  assert.ok(upload.indexOf('if (!BODY_ADMISSION_AUTHORIZED)') < upload.indexOf('const admission = await validateRequestBody(req)'));
  assert.equal(packet.expected.BODY_ADMISSION_AUTHORIZED, false);
  assert.equal(packet.expected.canSubmit, false);
  assert.equal(packet.expected.uploadCode, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.expected.uploadStatus, 503);
  assert.equal(packet.expected.bodyReads, 0);
  assert.equal(packet.expected.cookieStoredByBrowser, true);
  assert.equal(packet.expected.cookieReturnedByBrowser, true);
  assert.match(document, /never manually forward it/);
});

test('approval and custody requirements remain explicit without embedding credentials', () => {
  const phrase = document.split('\n').find(line => line.startsWith('> Approve exactly one'));
  for (const placeholder of ['RUN_ID', 'SOURCE_COMMIT', 'PACKET_SHA256', 'BINDING_SHA256', 'EXACT_HTTPS_ORIGIN', 'EXACT_BROWSER_ROUTE', 'START_UTC', 'END_UTC', 'AUTH_RECEIPT_SHA256', 'ROLLBACK_RECEIPT_SHA256']) {
    assert.ok(phrase.includes(`<${placeholder}>`), placeholder);
  }
  assert.match(phrase, /BODY_ADMISSION_AUTHORIZED=false/);
  assert.match(document, /Unknown measurements remain null/);
  assert.match(document, /TTL is defense in depth/);
  assert.match(document, /0700/);
  assert.match(document, /0600/);
  assert.doesNotMatch(document + JSON.stringify(packet), /Bearer synthetic-browser-login|us1\.[A-Za-z0-9_-]{43}|BEGIN PRIVATE KEY/);
});
