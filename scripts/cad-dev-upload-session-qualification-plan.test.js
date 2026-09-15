const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const plan = JSON.parse(fs.readFileSync('docs/cad-dev-upload-session-qualification-plan.json', 'utf8'));
const closeout = JSON.parse(fs.readFileSync('docs/cad-dev-auth-session-run-closeout.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-upload-session-qualification-plan.md', 'utf8');
const route = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const routeTest = fs.readFileSync('scripts/cad-user-upload-route.test.js', 'utf8');
const uploadSessionTest = fs.readFileSync('scripts/cad-upload-session.test.js', 'utf8');

test('plan binds to the completed Auth/session closeout without authorizing a run', () => {
  assert.equal(plan.mode, 'source-only-cad-dev-upload-session-qualification-plan');
  assert.equal(plan.status, 'SOURCE_ONLY_UPLOAD_SESSION_QUALIFICATION_PLAN_READY');
  assert.equal(plan.sourceOnly, true);
  assert.equal(plan.production, false);
  assert.equal(plan.developmentDeployment, 'majestic-alligator-31');
  assert.equal(plan.dependsOn.authSessionCloseout.status, closeout.status);
  assert.equal(plan.dependsOn.authSessionCloseout.runId, closeout.runId);
  assert.equal(plan.dependsOn.authSessionCloseout.evidenceSha256,
    closeout.sanitizedRunEvidence.evidenceSha256);
  assert.equal(plan.dependsOn.authSessionCloseout.receiptSha256,
    closeout.sanitizedRunEvidence.receiptSha256);
  assert.equal(plan.nextExecutableSlice.liveRunAuthorizedByThisPacket, false);
});

test('current user-import route remains disabled before body admission or conversion', () => {
  assert.equal(plan.dependsOn.disabledRouteContract.route, 'POST /api/cad/user-import');
  assert.equal(plan.dependsOn.disabledRouteContract.bodyAdmissionAuthorized, false);
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false/);
  assert.match(route, /if \(!BODY_ADMISSION_AUTHORIZED\) return send\(res, 'USER_UPLOADS_DISABLED'\)/);
  assert.match(route, /validateRequestBody\(req\)/);
  assert.match(route, /No executor is wired/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('existing tests prove disabled route and upload-session failure modes', () => {
  assert.ok(plan.currentEvidence.routeTests.includes('scripts/cad-user-upload-route.test.js'));
  assert.ok(plan.currentEvidence.routeTests.includes('scripts/cad-upload-session.test.js'));
  assert.match(routeTest, /valid sessions stay disabled/);
  assert.match(routeTest, /USER_UPLOADS_DISABLED/);
  assert.match(routeTest, /bodyReads, 0/);
  assert.match(routeTest, /operator import remains operator-only/);
  assert.match(uploadSessionTest, /unconfigured default and invalid configuration fail closed/);
  assert.match(uploadSessionTest, /revocation and entitlement changes are re-read on every call/);
});

test('next executable slice is bounded to development upload-session qualification only', () => {
  assert.equal(plan.nextExecutableSlice.branch, 'codex/cad-dev-upload-session-qualification-executor');
  assert.ok(plan.nextExecutableSlice.mustBind.includes('disabled route precheck before any body-bearing request'));
  assert.ok(plan.nextExecutableSlice.mustNotDo.includes('enable BODY_ADMISSION_AUTHORIZED'));
  assert.ok(plan.nextExecutableSlice.mustNotDo.includes('dispatch CAD conversion'));
  for (const [gate, value] of Object.entries(plan.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.match(markdown, /Upload activation remains out of scope/);
  assert.match(markdown, /stop on unknown outcome/i);
  assert.doesNotMatch(markdown + JSON.stringify(plan), /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /CAD conversion dispatched/i);
});
