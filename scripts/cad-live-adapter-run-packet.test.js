const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { inspectRunPacket } = require('../offline/cad-convex/liveAdapterRunPacket');
const packet = require('../offline/cad-convex/liveAdapterRunPacket.json');
test('closed template is valid but never executable or live qualified', () => {
  assert.deepEqual(inspectRunPacket(packet), { templateValid: true, executable: false,
    liveQualified: false, decision: 'LIVE_RUN_BLOCKED',
    blockers: ['UNFILLED_TEMPLATE', 'SEPARATE_APPROVAL_REQUIRED', 'NO_LIVE_RUNNER'] });
});
test('every altered leaf, omitted field and extra authority field fails closed', () => {
  function visit(value, path = []) {
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) visit(value[key], [...path, key]);
      return;
    }
    for (const remove of [false, true]) {
      const copy = structuredClone(packet); let parent = copy;
      for (const key of path.slice(0, -1)) parent = parent[key];
      const key = path.at(-1);
      if (remove) delete parent[key];
      else parent[key] = value === null ? 'unreviewed' : typeof value === 'boolean' ? !value : typeof value === 'number' ? value + 1 : value + '-changed';
      const result = inspectRunPacket(copy);
      assert.equal(result.templateValid, false, path.join('.'));
      assert.equal(result.executable, false);
    }
  }
  visit(packet);
  for (const value of [null, {}, [], { ...packet, approved: true }, { ...packet, gates: {} }])
    assert.equal(inspectRunPacket(value).templateValid, false);
});
test('every prior live acceptance requirement has one pending sanitized evidence slot', () => {
  const prior = require('../offline/cad-convex/sharedControlsAdapterQualification.json');
  assert.deepEqual(packet.evidence.map(e => e.requirementId), prior.requirements.map(e => e.id));
  assert.equal(new Set(packet.evidence.map(e => e.requirementId)).size, packet.evidence.length);
});
test('checker has no provider, filesystem, environment or execution dependencies', () => {
  const source = fs.readFileSync(require.resolve('../offline/cad-convex/liveAdapterRunPacket'), 'utf8');
  assert.doesNotMatch(source, /require\s*\(|process\.|fetch\s*\(|import\s|child_process|https?:/);
  const route = fs.readFileSync(require.resolve('../server/cadUserUploadRouter'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /liveAdapterRunPacket/);
});
