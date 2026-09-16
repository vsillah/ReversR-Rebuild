// Offline contract and pure payload checks. No provider, credentials or conversion.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const packet = require('../offline/cad-convex/userUploadActivationReadiness.json');
const { LIMITS, upload } = require('../server/cadWorkerContract');
const { SANDBOX_LIMITS } = require('../server/cadSandboxConfig');
const root = path.resolve(__dirname, '..');

test('readiness evidence records reviewed source gates while approvals stay closed', () => {
  assert.equal(packet.mode, 'source-only-activation-readiness');
  for (const flag of ['enabled', 'liveReady', 'executable']) assert.equal(packet[flag], false);
  assert.deepEqual(Object.keys(packet.gates).sort(), [
    'publication', 'exactSessionAuthority', 'uploadPermission', 'payloadAdmission',
    'sharedControls', 'sandboxDispatch', 'providerReadiness', 'rollback', 'activation',
  ].sort());
  for (const gate of Object.values(packet.gates)) {
    assert.equal(gate.approved, false);
    assert.ok(Object.keys(gate.evidence).length >= 3);
  }
  assert.equal(packet.gates.exactSessionAuthority.evidence.verifiedTransport,
    'docs/cad-dev-upload-session-successful-closeout.json#runResult');
  assert.equal(packet.gates.exactSessionAuthority.evidence.concurrentRevocationFence, null);
  assert.equal(packet.gates.uploadPermission.evidence.cookieExactHttpsOriginAndSessionCsrf, null);
  assert.equal(packet.gates.uploadPermission.evidence.nativeBearerTransportReview, null);
  assert.equal(packet.gates.payloadAdmission.evidence.preParserAuthOrdering,
    'scripts/cad-user-upload-route.test.js#valid-sessions-stay-disabled');
  assert.equal(packet.gates.payloadAdmission.evidence.streamingJsonLimit,
    'scripts/cad-user-upload-admission.test.js#streaming-limits-cover-chunked-bodies');
  assert.equal(packet.gates.payloadAdmission.evidence.encodingAndMediaType,
    'server/cadUserUploadAdmission.js#validateRequestBody');
  assert.equal(packet.gates.payloadAdmission.evidence.exactFieldsAndSafeName,
    'scripts/cad-user-upload-admission.test.js#strict-three-field-admission');
  assert.equal(packet.gates.payloadAdmission.evidence.canonicalBase64AndDecodedLimit,
    'scripts/cad-user-upload-admission.test.js#canonical-base64-encoded-and-decoded-limits');
  assert.equal(packet.gates.payloadAdmission.evidence.igesContentAndExternalReferenceRejection,
    'scripts/cad-user-upload-activation-readiness.test.js#pure-iges-payload-checks');
  assert.equal(packet.gates.payloadAdmission.evidence.sanitizedParserErrors,
    'scripts/cad-user-upload-admission.test.js#actual-route-instrumentation');
  assert.equal(packet.gates.sharedControls.evidence.atomicUserShopLease,
    'offline/cad-convex/sharedUploadControls.js#transition');
  assert.equal(packet.gates.sharedControls.evidence.crossInstanceRateLimit,
    'scripts/cad-upload-shared-controls.test.js#stale-snapshot-cas-loses');
  assert.equal(packet.gates.sharedControls.evidence.enforcedAllInCostCap,
    'scripts/cad-upload-shared-controls.test.js#all-in-integer-reservations');
  assert.equal(packet.gates.sharedControls.evidence.unknownOutcomeReconciliation,
    'scripts/cad-upload-shared-controls.test.js#unknown-outcomes-retain-money-and-capacity');
  assert.equal(packet.gates.sharedControls.evidence.abortAndRetryAccounting,
    'scripts/cad-upload-shared-controls.test.js#cancellation-before-fence');
  assert.equal(packet.gates.sandboxDispatch.evidence.reviewedExecutorAndAssetHashes, null);
  assert.equal(packet.gates.activation.evidence.explicitUploadActivationApproval, null);
  assert.ok(Object.values(packet.authority).every(value => value === null));
  assert.equal(packet.proposedBounds.allInCostCapUsd, 50);
  assert.equal(packet.currentTerminalCode, 'USER_UPLOADS_DISABLED');
});

test('latest development upload-session qualification is recorded without activation authority', () => {
  assert.deepEqual(packet.latestDevelopmentUploadSessionQualification, {
    sourcePr: 257,
    mergedMainCommit: '4878257480ffadd0e3714746f9c3b07795f9fa42',
    runRef: 'cad-dev-upload-session-0100z',
    developmentDeployment: 'majestic-alligator-31',
    evidenceSha256: 'e5c7113e47d9d7bda63ea95cbf69577a9bedbc70d8f87d075b31353d8dbb4866',
    receiptSha256: 'ff03025c824c928f962e88a67487aefd86c608d094032972f739064a0e5bb825',
    acceptedProjectionSha256: '3f405f0eafa4e3834b99d9ee69547402a0690e79e705dacd13a764b8e4b7e640',
    acceptanceReceiptSha256: 'd6a09751cece8326d6a242686ca310fa9b4a3abace455dcbd23e739b9223f930',
    cadUploadsDisabled: true,
    bodyAdmissionAuthorized: false,
    conversionAllowed: false,
    retry: false,
    secondRun: false,
  });
});

test('proposed admission and Sandbox bounds cannot silently drift from worker limits', () => {
  const b = packet.proposedBounds;
  assert.equal(b.jsonBytes, LIMITS.jsonBytes);
  assert.equal(b.decodedBytes, LIMITS.inputBytes);
  assert.equal(b.encodedCharacters, Math.ceil(LIMITS.inputBytes / 3) * 4);
  for (const key of ['vcpus', 'memoryMb', 'lifetimeMs', 'requestMs', 'commandMs', 'cleanupMs'])
    assert.equal(b.sandbox[key], SANDBOX_LIMITS[key]);
  for (const key of ['outputBytes', 'meshes', 'vertices', 'triangles'])
    assert.equal(b.sandbox[key], LIMITS[key]);
  assert.equal(b.sandbox.network, 'deny-all');
});

// A deliberately minimal ASCII shape exercises the pure input validator only.
// Passing it is not geometry qualification or a successful conversion.
const row = (section, body = '') => body.padEnd(72, ' ') + section + '      1';
const content = directory => ['S', 'G'].map(s => row(s)).concat([
  row('D', String(directory).padStart(8, ' ')), row('D'), row('P'), row('T'),
]).join('\n');
const body = (text = content(110)) => ({ fileName: 'fixture.igs', contentBase64: Buffer.from(text, 'ascii').toString('base64') });

test('pure IGES payload checks reject unsafe names, unknown fields and external references', () => {
  assert.ok(upload(body()).bytes.length > 0);
  for (const fileName of ['../fixture.igs', '/fixture.igs', 'a\\fixture.igs', 'a\u0000.igs', 'x'.repeat(121) + '.igs'])
    assert.throws(() => upload({ ...body(), fileName }), { code: 'MALFORMED' });
  assert.throws(() => upload({ ...body(), fileName: 'fixture.step' }), { code: 'UNSUPPORTED' });
  assert.throws(() => upload({ ...body(), mimeType: 'model/iges' }), { code: 'MALFORMED' });
  assert.throws(() => upload(body(content(416))), { code: 'UNSUPPORTED' });
  assert.throws(() => upload(body('invalid IGES shape')), { code: 'MALFORMED' });
});

test('canonical base64, encoded and decoded limits fail before any conversion', () => {
  for (const value of ['%%%%', 'Zg=', 'Zh==', 'Zg==\n', ''])
    assert.throws(() => upload({ ...body(), contentBase64: value }));
  assert.throws(() => upload({ ...body(), contentBase64: 'A'.repeat(packet.proposedBounds.encodedCharacters + 4) }), { code: 'TOO_LARGE' });
  assert.throws(() => upload({ ...body(), contentBase64: Buffer.alloc(LIMITS.inputBytes + 1, 65).toString('base64') }), { code: 'TOO_LARGE' });
});

test('readiness packet stays isolated from runtime and current route stays terminal', () => {
  for (const directory of ['server', 'app', 'hooks', 'components', 'convex']) {
    const visit = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(name);
        else if (/\.[cm]?[jt]sx?$/.test(name)) assert.doesNotMatch(fs.readFileSync(name, 'utf8'), /userUploadActivationReadiness/);
      }
    };
    visit(path.join(root, directory));
  }
  const source = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(source, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(source, /process\.env|express\.json|express\.raw|require\(['"].*cadSandboxExecutor/);
});
