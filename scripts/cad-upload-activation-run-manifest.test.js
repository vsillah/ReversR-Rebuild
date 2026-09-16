const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const packet = require('../docs/cad-upload-activation-run-manifest.json');

const digest = value => crypto.createHash('sha256').update(value).digest('hex');

test('run manifest binds disabled release, operators and source evidence without execution authority', () => {
  assert.equal(packet.mode, 'source-only-cad-upload-activation-run-manifest');
  assert.equal(packet.baseMainCommit, '90b66c68021e9003e5e723c0bb6ae4e81625611c');
  assert.equal(packet.productionUploadActivationAuthorized, false);
  assert.equal(packet.productionConversionAuthorized, false);
  assert.equal(packet.sandboxDispatchAuthorized, false);
  assert.equal(packet.runManifest.executableNow, false);
  assert.equal(packet.runManifest.activationApprovalAccepted, false);
  assert.equal(packet.runManifest.allInPlanningCapUsd, 50);
  assert.equal(packet.runManifest.maxAttempts, 1);
  assert.equal(packet.operators.primaryCustodian, 'Vambah Sillah');
  assert.equal(packet.operators.backupCustodian, 'Amina');
  assert.equal(packet.operators.testerReviewer, 'Mark');
  assert.equal(packet.operators.markIsCustodian, false);
});

test('command template digests are stable and non-executable placeholders', () => {
  for (const [id, command] of Object.entries(packet.commandManifest)) {
    if (id === 'exactCommandsExecutableNow') continue;
    assert.equal(digest(command.template), command.sha256);
    assert.match(command.template, /<|>|USER_UPLOADS_DISABLED|bounded read-only/);
  }
  assert.equal(packet.commandManifest.exactCommandsExecutableNow, false);
});

test('fail-closed smoke records only closed route outcomes', () => {
  assert.equal(packet.failClosedSmoke.mergeCommit, packet.baseMainCommit);
  assert.deepEqual(packet.failClosedSmoke.routes.map(route => [route.route, route.status, route.code || route.title || null]), [
    ['GET /', 200, 'ReversR Rebuild'],
    ['GET /api/cad/capabilities', 200, null],
    ['POST /api/cad/user-import {}', 401, 'USER_SESSION_REQUIRED'],
    ['POST /api/cad/import {}', 401, 'UNAUTHORIZED'],
    ['GET /api/cad/import-source-record', 404, null],
  ]);
});

test('packet grants no activation, conversion, sandbox, mutation or messaging authority', () => {
  assert.ok(Object.values(packet.authorityPreserved).every(value => value === false));
  assert.equal(packet.rollback.rollbackCanDeleteRows, false);
  assert.equal(packet.rollback.unknownReservationsRemainLocked, true);
  const markdown = fs.readFileSync('docs/cad-upload-activation-run-manifest.md', 'utf8');
  assert.match(markdown, /source-only command manifest/);
  assert.match(markdown, /does not enable upload admission/);
  assert.doesNotMatch(markdown, /upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion completed/i);
});
