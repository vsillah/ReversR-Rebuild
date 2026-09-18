const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packet = require('../offline/cad-convex/publicMaterialPreviewPathAuthorization.json');
const previewFixture = require('../public/cad-fixtures/mark-dispenser-v1/manifest.json');
const {
  MARK_DISPENSER_RESULT,
  inspectCadInternalTesterPreview,
} = require('../utils/cadInternalTesterPreview');
const { inspectPublicMaterialPreviewPathAuthorization } =
  require('../offline/cad-convex/publicMaterialPreviewPathAuthorization');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const fileSha = relative => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, relative)))
  .digest('hex');

test('public-material preview authorization binds the reviewed public fixture path', () => {
  const result = inspectPublicMaterialPreviewPathAuthorization(packet, previewFixture);

  assert.equal(result.structureValid, true);
  assert.equal(result.decisionValid, true);
  assert.equal(result.routeGuarded, true);
  assert.equal(result.fixtureManifestBound, true);
  assert.equal(result.fixtureAssetsBound, true);
  assert.equal(result.readinessBound, true);
  assert.equal(result.qaEvidenceBound, true);
  assert.equal(result.limitsPreserved, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForPreviewPublication, true);
});

test('all source and asset hashes match the packet', () => {
  assert.equal(fileSha(packet.route.source), packet.route.sourceSha256);
  assert.equal(fileSha(packet.route.test), packet.route.testSha256);
  assert.equal(fileSha(packet.publicFixture.manifest), packet.publicFixture.manifestSha256);
  assert.equal(fileSha(packet.publicFixture.source.path), packet.publicFixture.source.sha256);
  assert.equal(fileSha(packet.publicFixture.derivedDisplayMesh.path),
    packet.publicFixture.derivedDisplayMesh.sha256);

  for (const reference of packet.publicFixture.references) {
    assert.equal(fileSha(reference.path), reference.sha256, reference.path);
  }

  for (const section of Object.values(packet.boundReadiness)) {
    assert.equal(fileSha(section.source), section.sourceSha256, section.source);
  }
});

test('preview remains non-production and public-material only', () => {
  const localPreview = inspectCadInternalTesterPreview({
    hostname: 'localhost',
    search: packet.route.query,
  });
  const vercelPreview = inspectCadInternalTesterPreview({
    hostname: 'reversr-git-codex-cad-public-preview-vsillahs-projects.vercel.app',
    search: packet.route.query,
  });
  const productionPreview = inspectCadInternalTesterPreview({
    hostname: packet.route.blockedProductionHostname,
    search: packet.route.query,
  });

  assert.equal(localPreview.enabled, true);
  assert.equal(vercelPreview.enabled, true);
  assert.equal(productionPreview.enabled, false);
  assert.equal(localPreview.fixture, MARK_DISPENSER_RESULT);
  assert.equal(localPreview.fixture.sourceAssetUrl, '/cad-fixtures/mark-dispenser-v1/Dispenser.IGS');
  assert.equal(localPreview.fixture.previewGeometry.assetUrl,
    '/cad-fixtures/mark-dispenser-v1/dispenser-derived.stl');
});

test('authorization keeps external delivery, real users and production activation blocked', () => {
  const result = inspectPublicMaterialPreviewPathAuthorization(packet, previewFixture);

  assert.equal(result.externalDeliveryAuthorized, false);
  assert.equal(result.realUserEnrollmentAuthorized, false);
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.productionConversionAuthorized, false);
  for (const [gate, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.ok(packet.nextGate.stillRequiresSeparateApproval.includes(
    'sending the preview URL to Mark or any external recipient',
  ));
  assert.ok(packet.nextGate.allowedByThisPacket.includes('preview visual QA using public materials'));
});

test('packet and docs do not create a runtime or private-CAD path', () => {
  const source = read('offline/cad-convex/publicMaterialPreviewPathAuthorization.js');
  const doc = read('docs/cad-public-material-preview-path.md');

  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process/);
  assert.match(doc, /public\s+materials only/i);
  assert.match(doc, /stop before external delivery/i);
  assert.doesNotMatch(doc + JSON.stringify(packet), /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
});
