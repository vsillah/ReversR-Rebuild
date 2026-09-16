const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packet = require('../offline/cad-convex/uploadAdmissionActivationWindowRollover.json');
const previousWindow = require('../offline/cad-convex/uploadAdmissionActivationExactWindow.json');
const previousRebind = require('../offline/cad-convex/uploadAdmissionActivationRunnerRebind.json');
const refresh = require('../offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json');
const closeout = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json');
const docsSummary = require('../docs/cad-upload-admission-activation-window-rollover.json');
const { inspectUploadAdmissionActivationWindowRollover } =
  require('../offline/cad-convex/uploadAdmissionActivationWindowRollover');

const root = path.resolve(__dirname, '..');

test('rollover records the missed window without retrying it', () => {
  const result = inspectUploadAdmissionActivationWindowRollover(
    packet, previousWindow, previousRebind, refresh, closeout,
  );
  assert.equal(result.structureValid, true);
  assert.equal(result.priorWindowBound, true);
  assert.equal(packet.missedWindow.executionObserved, false);
  assert.equal(packet.missedWindow.evidenceObserved, false);
  assert.equal(packet.missedWindow.unknownOutcome, false);
  assert.equal(packet.missedWindow.retryAuthorized, false);
  assert.equal(packet.missedWindow.newRunRefRequired, true);
});

test('rollover binds a distinct 22:30Z run and ignored evidence root', () => {
  const result = inspectUploadAdmissionActivationWindowRollover(
    packet, previousWindow, previousRebind, refresh, closeout,
  );
  assert.equal(result.windowValid, true);
  assert.equal(result.evidenceDestinationValid, true);
  assert.equal(packet.acceptedWindow.runRef,
    'rrb-ref:cad-upload-activation-window-rollover-2230z');
  assert.equal(packet.acceptedWindow.startUtc, '2026-09-16T22:30:00Z');
  assert.equal(packet.acceptedWindow.expiresUtc, '2026-09-16T23:00:00Z');
  assert.equal(packet.acceptedWindow.maxRunSeconds, 900);
  assert.equal(packet.sanitizedEvidenceDestination.root,
    '.local/cad-convex/upload-activation-window-rollover-2230z');
});

test('accepted inputs, bounds and closed authorities remain valid', () => {
  const result = inspectUploadAdmissionActivationWindowRollover(
    packet, previousWindow, previousRebind, refresh, closeout,
  );
  assert.equal(result.refreshBound, true);
  assert.equal(result.closeoutBound, true);
  assert.equal(result.runnerDispositionValid, true);
  assert.equal(result.boundsValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForSourceOnlyRunnerRebind, true);
  assert.equal(result.liveDevelopmentRunAuthorizedByThisPacket, false);
});

test('checked-in route stays disabled and isolated from rollover source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route, /uploadAdmissionActivationWindowRollover/);
});

test('docs keep the live run blocked until a source-only rebind merges', () => {
  const markdown = fs.readFileSync(
    path.join(root, 'docs/cad-upload-admission-activation-window-rollover.md'),
    'utf8',
  );
  assert.equal(docsSummary.liveRunHappened, false);
  assert.equal(docsSummary.liveRunAuthorizedByThisPacket, false);
  assert.equal(docsSummary.sourceOnlyRunnerRebindRequiredBeforeLiveRun, true);
  assert.match(markdown, /does not authorize live execution by itself/i);
  assert.match(markdown, /one bounded development run/i);
});

test('rollover inspector is local and provider-free', () => {
  const source = fs.readFileSync(
    path.join(root, 'offline/cad-convex/uploadAdmissionActivationWindowRollover.js'),
    'utf8',
  );
  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
