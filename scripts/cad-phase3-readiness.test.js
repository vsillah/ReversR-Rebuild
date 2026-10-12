const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');

const { MARK_DISPENSER_RESULT } = require('../utils/cadInternalTesterPreview');
const { getCadReviewPhaseStates } = require('../utils/workflowPhases');
const observation = require('./cad-phase3-windows-whale-observation-checker');

const manifest = JSON.parse(fs.readFileSync('public/cad-fixtures/mark-dispenser-v1/manifest.json', 'utf8'));
const app = fs.readFileSync('app/index.tsx', 'utf8');
const workflow = fs.readFileSync('components/CadWorkflow.tsx', 'utf8');
const review = fs.readFileSync('components/CadDesignReview.tsx', 'utf8');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('Phase 3 public Dispenser facts stay exact across manifest, runtime, and assets', () => {
  assert.deepEqual(manifest.source, {
    fileName: 'Dispenser.IGS',
    bytes: 701346,
    sha256: '1e52b301cf33bc241cd0d3d039691236ab45116f439197820f690b424750f0b8',
    units: 'millimeter',
  });
  assert.deepEqual(manifest.boundingBoxMillimeters.size, [55.7403, 69.417713, 114.825561]);
  assert.deepEqual(MARK_DISPENSER_RESULT.expectedDimensions, manifest.boundingBoxMillimeters.size);
  assert.equal(MARK_DISPENSER_RESULT.sha256, manifest.source.sha256);
  assert.equal(sha256('public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS'), manifest.source.sha256);

  assert.equal(manifest.derivedDisplayMesh.fileName, 'dispenser-derived.stl');
  assert.equal(manifest.derivedDisplayMesh.sha256, '9b5bfa4b86d6976ae87e6f023b3a243d4b04966b2337b224203bb630e7b8096e');
  assert.equal(manifest.derivedDisplayMesh.sourceSha256, manifest.source.sha256);
  assert.equal(manifest.derivedDisplayMesh.connectedComponentCount, 4);
  assert.equal(manifest.derivedDisplayMesh.watertight, false);
  assert.equal(MARK_DISPENSER_RESULT.previewGeometry.sha256, manifest.derivedDisplayMesh.sha256);
  assert.equal(sha256('public/cad-fixtures/mark-dispenser-v1/dispenser-derived.stl'), manifest.derivedDisplayMesh.sha256);
  assert.deepEqual(manifest.limitations, [
    'The derived display mesh is not fully watertight.',
    'Reference images are visual comparison aids and do not modify source geometry.',
    'This fixture is not dimensional inspection or manufacturing certification.',
  ]);
});

test('Phase 3 copy keeps connected geometry separate from a bill of materials', () => {
  assert.match(app, /Treat four connected components as geometry, not a certified parts count\./);
  assert.match(workflow, /Mesh components are not a verified parts list\./);
  assert.match(workflow, /Part identities, features, and manufacturing dimensions still need review\./);
});

test('Phase 3 download semantics keep original IGS and derived STL separate', () => {
  assert.equal((review.match(/testID="cad-download-menu-trigger"/g) || []).length, 1);
  assert.match(review, /testID="cad-open-source-iges"[\s\S]*Original IGS \(\.igs\)[\s\S]*source asset/);
  assert.match(review, /testID="igs-download-derived-stl"[\s\S]*Inspection mesh \(\.stl\)[\s\S]*Derived review artifact · millimeters/);
  assert.match(review, /cad-source-fingerprint/);
  assert.match(review, /cad-derived-fingerprint/);
  assert.doesNotMatch(review, /manufacturing[- ]ready|fabrication[- ]ready/i);
});

test('Phase 3 review keeps Build locked at every public review phase', () => {
  for (const selectedPhase of [1, 2, 3, 4]) {
    assert.equal(getCadReviewPhaseStates({ selectedPhase })[3], 'locked');
  }
  assert.match(workflow, /testID="cad-build-locked"/);
  assert.match(app, /Decision: hold for engineering and manufacturing review/);
  assert.match(app, /Build stays locked and no vendor package is sent\./);
});

function validObservation() {
  const checks = Object.fromEntries(observation.CHECK_IDS.map(id => [id, {
    outcome: 'pass',
    notes: `${id} observed with the public fixture`,
    evidenceRefs: [`note:${id}`],
  }]));
  return {
    schemaVersion: 1,
    recordKind: 'cad-phase3-public-fixture-observation',
    observedAt: '2026-10-12T18:00:00.000Z',
    sourceCommit: '586a8b38c33a28dee262b31f0aaf214510b1ddf8',
    environment: {
      osFamily: 'Windows', osVersion: '11', browserName: 'Whale', browserVersion: 'unknown',
      viewport: { width: 1440, height: 900 },
    },
    fixture: {
      fixtureId: 'mark-dispenser-v1', sourceFileName: 'Dispenser.IGS',
      selectionMethod: 'use-public-sample', privateCadUsed: false,
    },
    checks,
    privacy: { telemetrySent: false, externalWrites: 0, uploadAttempted: false, providerContacted: false },
    claims: { whaleCompatibilityClaimed: false, manufacturingReadinessClaimed: false, externalValidationClaimed: false },
    summary: { overallOutcome: 'pass', unresolved: [] },
  };
}

test('Windows Whale observation schema is public-fixture-only and claim closed', () => {
  assert.deepEqual(observation.checkSchema(), {
    ok: true, code: 'OBSERVATION_SCHEMA_READY', effectsExecuted: 0,
  });
  assert.deepEqual(observation.validateObservation(validObservation()), {
    ok: true,
    code: 'PUBLIC_FIXTURE_OBSERVATION_ACCEPTED',
    publicFixtureOnly: true,
    telemetrySent: false,
    compatibilityQualified: false,
    manufacturingReady: false,
    effectsExecuted: 0,
  });
});

test('Windows Whale observation checker fails closed on scope, privacy, claim, and outcome drift', () => {
  const mutations = [
    value => { value.environment.browserName = 'Chrome'; },
    value => { value.fixture.selectionMethod = 'choose-cad-file'; },
    value => { value.fixture.privateCadUsed = true; },
    value => { value.privacy.telemetrySent = true; },
    value => { value.privacy.externalWrites = 1; },
    value => { value.claims.whaleCompatibilityClaimed = true; },
    value => { value.claims.manufacturingReadinessClaimed = true; },
    value => { value.checks.render.notes = 'send details to reviewer@example.com'; },
    value => { value.checks.render.outcome = 'blocked'; },
    value => { value.unexpected = true; },
  ];
  for (const mutate of mutations) {
    const value = validObservation();
    mutate(value);
    const result = observation.validateObservation(value);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PUBLIC_FIXTURE_OBSERVATION_BLOCKED');
    assert.equal(result.effectsExecuted, 0);
    assert.equal(result.compatibilityQualified, false);
    assert.equal(result.manufacturingReady, false);
  }
});
