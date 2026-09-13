const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { inspectRollbackCompatibility } = require('../offline/cad-convex/rollbackCompatibility');
const { extractSchema } = require('./helpers/cad-convex-schema-export');
const { run } = require('./cad-convex-rollback-compatibility');
const baseline = require('../offline/cad-convex/rollbackBaseline.json');
const fixtures = require('../offline/cad-convex/rollbackFixtures.json');
const blockers = require('../offline/cad-convex/executionBlockers.json');
const input = () => ({ before: structuredClone(baseline.schema), proposed: structuredClone(baseline.schema),
  disabled: structuredClone(baseline.schema), retainedBefore: structuredClone(fixtures.rows),
  retainedAfter: structuredClone(fixtures.rows) });
const table = (schema, name) => schema.tables.find(t => t.tableName === name);
function denied(data, code) {
  const result = inspectRollbackCompatibility(data);
  assert.equal(result.fixtureCompatible, false); assert.equal(result.code, code);
  assert.equal(result.executable, false); assert.equal(result.liveReady, false);
  return result;
}
test('real SDK extraction expands every Auth/CAD validator and index with source provenance', () => {
  const current = extractSchema();
  assert.deepEqual(current.schema, baseline.schema);
  assert.deepEqual(current.sourceHashes, baseline.sourceHashes);
  assert.deepEqual(current.schema.tables.map(t => t.tableName).sort(),
    [...blockers.rollbackCompatibility.requiredTableRows].sort());
  const report = run();
  assert.equal(report.fixtureCompatible, true); assert.equal(report.tableCount, 10);
  assert.equal(report.indexCount, 16); assert.equal(report.forwardRows, 22); assert.equal(report.rollbackRows, 22);
  assert.equal(report.sameSchema, true); assert.equal(report.executable, false);
  assert.equal(report.liveReady, false); assert.equal(report.verifiedCloudRelease, null);
});
test('required field additions and type narrowing reject pre-run retained shapes', () => {
  let data = input();
  table(data.proposed, 'users').documentType.value.required = { fieldType: { type: 'string' }, optional: false };
  denied(data, 'FORWARD_FIXTURE_REJECTED');
  data = input();
  table(data.proposed, 'authRateLimits').documentType.value.attemptsLeft.fieldType = { type: 'string' };
  denied(data, 'FORWARD_FIXTURE_REJECTED');
});
test('optional additions require explicit post-run coverage and compatible disabled rollback', () => {
  const data = input();
  const extra = { fieldType: { type: 'string' }, optional: true };
  table(data.proposed, 'users').documentType.value.extra = extra;
  denied(data, 'FIXTURE_COVERAGE_INCOMPLETE');
  data.retainedAfter.users[1].extra = 'fixture-extra';
  denied(data, 'ROLLBACK_FIXTURE_REJECTED');
  table(data.disabled, 'users').documentType.value.extra = extra;
  assert.equal(inspectRollbackCompatibility(data).fixtureCompatible, true);
});
test('removed optional fields cannot silently discard retained Auth data', () => {
  const data = input(); delete table(data.disabled, 'authAccounts').documentType.value.secret;
  denied(data, 'ROLLBACK_FIXTURE_REJECTED');
});
test('index removal, reorder and disabled rollback index loss deny', () => {
  let data = input(); table(data.proposed, 'authSessions').indexes = [];
  denied(data, 'INDEX_COMPATIBILITY_FAILED');
  data = input(); table(data.proposed, 'authAccounts').indexes[0].fields.reverse();
  denied(data, 'INDEX_COMPATIBILITY_FAILED');
  data = input(); table(data.disabled, 'cadUploadSessions').indexes.pop();
  denied(data, 'INDEX_COMPATIBILITY_FAILED');
});
test('table removal, duplicate table, empty and missing fixture inventories deny', () => {
  let data = input(); data.proposed.tables.pop(); denied(data, 'TABLE_COVERAGE_CHANGED');
  data = input(); data.proposed.tables.push(data.proposed.tables[0]); denied(data, 'SCHEMA_FORMAT_UNSUPPORTED');
  data = input(); delete data.retainedBefore.authVerifiers; denied(data, 'FIXTURE_COVERAGE_INCOMPLETE');
  data = input(); data.retainedAfter.authSessions = []; denied(data, 'FIXTURE_COVERAGE_INCOMPLETE');
  data = input(); data.retainedBefore.users = [{}, {}]; denied(data, 'FIXTURE_COVERAGE_INCOMPLETE');
});
test('wrong synthetic ID table, enum, extra property and missing required value deny', () => {
  for (const patch of [{ userId: 'fixture:authSessions:one' }, { status: 'unknown' },
    { expiresAt: null }, { unexpected: 'fixture-value' }]) {
    const data = input(); Object.assign(data.retainedAfter.cadUploadSessions[0], patch);
    denied(data, 'ROLLBACK_FIXTURE_REJECTED');
  }
  const data = input(); delete data.retainedAfter.authSessions[0].userId;
  denied(data, 'ROLLBACK_FIXTURE_REJECTED');
});
test('unmodeled validators/indexes/export fields and disabled validation fail closed', () => {
  for (const mutate of [
    d => { table(d.proposed, 'users').documentType.value.extra = { fieldType: { type: 'any' }, optional: true }; },
    d => { table(d.proposed, 'users').searchIndexes.push({}); },
    d => { d.proposed.schemaValidation = false; },
    d => { d.proposed.newSdkField = true; },
  ]) { const data = input(); mutate(data); denied(data, 'SCHEMA_FORMAT_UNSUPPORTED'); }
});
test('sentinel rows and thrown input errors never enter result diagnostics', () => {
  denied(null, 'SCHEMA_INPUT_INVALID');
  denied({}, 'SCHEMA_FORMAT_UNSUPPORTED');
  const sentinel = 'fixture-private-sentinel-password-token-email';
  const data = input(); data.retainedAfter.authSessions[0].extra = sentinel;
  const result = denied(data, 'ROLLBACK_FIXTURE_REJECTED');
  assert.ok(!JSON.stringify(result).includes(sentinel));
  const broken = input(); Object.defineProperty(broken.proposed, 'tables', { get() { throw Error(sentinel); } });
  assert.ok(!JSON.stringify(denied(broken, 'SCHEMA_INPUT_INVALID')).includes(sentinel));
  assert.ok(!JSON.stringify(run()).includes('fixture-secret'));
});
test('fixed-path CLI exits nonzero and prints fixed diagnostics for unsupported input', () => {
  const child = spawnSync(process.execPath, [require.resolve('./cad-convex-rollback-compatibility'),
    'fixture-private-cli-sentinel'], { encoding: 'utf8' });
  assert.equal(child.status, 1); assert.equal(child.stderr, '');
  assert.equal(JSON.parse(child.stdout).code, 'OFFLINE_ROLLBACK_CHECK_FAILED');
  assert.ok(!child.stdout.includes('fixture-private-cli-sentinel'));
});
