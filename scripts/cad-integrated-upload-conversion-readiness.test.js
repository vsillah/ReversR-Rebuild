const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const readiness = require('../offline/cad-convex/integratedUploadConversionReadiness.json');
const authSession = require('../docs/cad-dev-auth-session-run-closeout.json');
const uploadSession = require('../docs/cad-dev-upload-session-successful-closeout.json');
const browserSession = require('../docs/cad-browser-session-local-run-closeout.json');
const mountedAdmission =
  require('../offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json');
const conversion = require('../offline/cad-convex/uploadConversionSandboxRunCloseout.json');
const priorCloseout = require('../offline/cad-convex/developmentReadinessAutopilotCloseout.json');
const { inspectIntegratedUploadConversionReadiness } =
  require('../offline/cad-convex/integratedUploadConversionReadiness');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const fileSha = relative => crypto.createHash('sha256').update(read(relative)).digest('hex');

test('integrated readiness binds the completed development upload-to-conversion chain', () => {
  const result = inspectIntegratedUploadConversionReadiness(
    readiness,
    authSession,
    uploadSession,
    browserSession,
    mountedAdmission,
    conversion,
    priorCloseout,
  );

  assert.equal(result.structureValid, true);
  assert.equal(result.authSessionBound, true);
  assert.equal(result.uploadSessionBound, true);
  assert.equal(result.browserSessionBound, true);
  assert.equal(result.mountedAdmissionBound, true);
  assert.equal(result.conversionBound, true);
  assert.equal(result.priorCloseoutBound, true);
  assert.equal(result.routeControlsClosed, true);
  assert.equal(result.fixtureContinuous, true);
  assert.equal(result.developmentReadinessComplete, true);
  assert.equal(result.noProviderRunRequired, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForSourcePublication, true);
});

test('source hashes and route gate remain stable', () => {
  for (const evidence of Object.values(readiness.evidenceChain)) {
    assert.equal(fileSha(evidence.source), evidence.sourceSha256, evidence.source);
  }

  assert.equal(fileSha(readiness.routeControls.route), readiness.routeControls.routeSha256);
  const route = read(readiness.routeControls.route);
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('readiness does not authorize real users, private CAD or production activation', () => {
  const result = inspectIntegratedUploadConversionReadiness(
    readiness,
    authSession,
    uploadSession,
    browserSession,
    mountedAdmission,
    conversion,
    priorCloseout,
  );

  assert.equal(result.readyForRealUsers, false);
  assert.equal(result.readyForPrivateCad, false);
  assert.equal(result.readyForProductionUploadActivation, false);
  assert.equal(result.readyForProductionConversion, false);
  for (const [gate, value] of Object.entries(readiness.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.ok(readiness.nextGate.stillRequiresSeparateApproval.includes(
    'Mark or any real-user enrollment',
  ));
  assert.ok(readiness.nextGate.stillRequiresSeparateApproval.includes(
    'production conversion or Sandbox dispatch',
  ));
});

test('readiness review is source-only and does not define a runtime path', () => {
  const source = read('offline/cad-convex/integratedUploadConversionReadiness.js');
  const doc = read('docs/cad-integrated-upload-conversion-readiness.md');

  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process/);
  assert.equal(readiness.scopeConclusion.additionalProviderRunRequired, false);
  assert.equal(readiness.developmentReadiness.singleMountedEndToEndRealSessionRunCompleted, false);
  assert.match(doc, /No additional provider run is warranted/);
  assert.match(doc, /This is not production upload readiness/);
  assert.doesNotMatch(doc + JSON.stringify(readiness), /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
});
