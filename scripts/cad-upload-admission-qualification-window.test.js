const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packet = require('../docs/cad-upload-admission-qualification-window.json');
const adapterManifest = require('../offline/cad-convex/uploadAdmissionDurableAdapter.json');
const sessionCloseout = require('../docs/cad-dev-upload-session-successful-closeout.json');
const fixtureMatrix = require('./fixtures/cad-public-matrix.json');
const runManifest = require('../docs/cad-upload-activation-run-manifest.json');

const root = path.resolve(__dirname, '..');

test('qualification window packet is assembled but not executable', () => {
  assert.equal(packet.mode, 'source-only-cad-upload-admission-qualification-window');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.liveRunAuthorizedNow, false);
  assert.equal(packet.uploadActivationAuthorizedNow, false);
  assert.equal(packet.runtimeBridgeAvailableNow, false);
  assert.equal(packet.bodyAdmissionAuthorized, false);
  assert.equal(packet.target.currentTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.ok(packet.blockingBeforeRun.includes('guarded development runtime bridge is not implemented or mounted'));
  assert.ok(Object.values(packet.authorityPreserved).every(value => value === false));
});

test('packet binds accepted session closeout and disabled adapter source refs', () => {
  assert.equal(packet.sourceBindings.adapterSource, adapterManifest.source);
  assert.equal(adapterManifest.enabled, false);
  assert.equal(adapterManifest.runtimeImported, false);
  assert.equal(adapterManifest.bodyAdmissionAuthorized, false);
  assert.equal(sessionCloseout.runResult.runCompleted, true);
  assert.equal(sessionCloseout.runResult.unknownOutcome, false);
  assert.equal(packet.acceptedSessionEvidence.runRef, sessionCloseout.runRef);
  assert.equal(packet.acceptedSessionEvidence.projectionSha256, sessionCloseout.acceptedEvidence.projectionSha256);
  assert.equal(packet.acceptedSessionEvidence.acceptanceReceiptSha256, sessionCloseout.acceptedEvidence.acceptanceReceiptSha256);
  assert.equal(packet.acceptedSessionEvidence.cadUploadsDisabled, true);
});

test('public fixture candidate is source-pinned and conversion remains unauthorized', () => {
  const cube = fixtureMatrix.fixtures.find(fixture => fixture.id === 'cube');
  assert.equal(packet.fixtureCandidate.acceptedNow, false);
  assert.equal(packet.fixtureCandidate.id, cube.id);
  assert.equal(packet.fixtureCandidate.format, 'iges');
  assert.equal(packet.fixtureCandidate.sha256, cube.sha256);
  assert.equal(packet.fixtureCandidate.bytes, cube.bytes);
  assert.equal(packet.fixtureCandidate.privateCad, false);
  assert.equal(packet.fixtureCandidate.conversionAuthorized, false);
  assert.equal(packet.fixtureCandidate.sandboxDispatchAuthorized, false);
});

test('qualification bounds preserve USD 50 cap and one-run stop-on-unknown behavior', () => {
  assert.equal(packet.qualificationBounds.acceptedNow, false);
  assert.equal(packet.qualificationBounds.maxAttempts, 1);
  assert.equal(packet.qualificationBounds.automaticRetry, false);
  assert.equal(packet.qualificationBounds.secondRun, false);
  assert.equal(packet.qualificationBounds.allInPlanningCapUsd, 50);
  assert.equal(packet.qualificationBounds.scheduleIfMoreThanFiveMinutesAway, true);
  assert.equal(packet.qualificationBounds.stopOnUnknownOutcome, true);
  assert.equal(packet.qualificationBounds.deleteRetainedState, false);
  assert.equal(packet.qualificationBounds.conversionAllowed, false);
  assert.equal(runManifest.runManifest.allInPlanningCapUsd, 50);
  assert.equal(runManifest.runManifest.stopOnUnknownOutcome, true);
});

test('route remains closed and runtime does not import the window packet', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  for (const directory of ['server', 'app', 'hooks', 'components', 'convex']) {
    const visit = dir => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(name);
        else if (/\.[cm]?[jt]sx?$/.test(name)) {
          const source = fs.readFileSync(name, 'utf8');
          assert.doesNotMatch(source, /cad-upload-admission-qualification-window|uploadAdmissionQualificationWindow/);
        }
      }
    };
    visit(path.join(root, directory));
  }
});
