const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const closeout = require('../offline/cad-convex/developmentReadinessAutopilotCloseout.json');
const metadata = require('../docs/cad-successful-bounded-dev-qualification-closeout.json');
const upload = require('../offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json');
const conversion = require('../offline/cad-convex/uploadConversionSandboxRunCloseout.json');
const { inspectDevelopmentReadinessAutopilotCloseout } =
  require('../offline/cad-convex/developmentReadinessAutopilotCloseout');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const fileSha = relative => crypto.createHash('sha256').update(read(relative)).digest('hex');

test('autopilot closeout binds all three synthetic development components', () => {
  const result = inspectDevelopmentReadinessAutopilotCloseout(
    closeout,
    metadata,
    upload,
    conversion,
  );
  assert.equal(result.structureValid, true);
  assert.equal(result.metadataBound, true);
  assert.equal(result.uploadBound, true);
  assert.equal(result.conversionBound, true);
  assert.equal(result.fixtureContinuous, true);
  assert.equal(result.controlsClosed, true);
  assert.equal(result.componentReadinessComplete, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.autopilotScopeCompleted, true);
  assert.equal(result.readyForSourcePublication, true);
  assert.equal(result.readyForRealUsers, false);
  assert.equal(result.readyForProductionUploadActivation, false);
});

test('evidence hashes and disabled route match current source', () => {
  for (const evidence of Object.values(closeout.evidenceChain)) {
    assert.equal(fileSha(evidence.source), evidence.sourceSha256);
  }
  assert.equal(fileSha(closeout.safetyControls.route), closeout.safetyControls.routeSha256);
  const route = read(closeout.safetyControls.route);
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('closeout remains source-safe and stops before real users', () => {
  const source = read('offline/cad-convex/developmentReadinessAutopilotCloseout.js');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process/);
  assert.equal(closeout.authorityPreserved.realUserEnrollmentAuthorized, false);
  assert.equal(closeout.authorityPreserved.markTesterActivationAuthorized, false);
  assert.equal(closeout.authorityPreserved.privateCadAuthorized, false);
  assert.equal(closeout.authorityPreserved.productionUploadActivationAuthorized, false);
  assert.equal(closeout.authorityPreserved.additionalLiveRunAuthorized, false);
});
