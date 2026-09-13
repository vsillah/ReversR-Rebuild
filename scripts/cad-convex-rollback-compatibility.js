// Read only fixed local source/fixture paths; no CLI input, deployment or data export.
function run() {
  const { extractSchema, hash } = require('./helpers/cad-convex-schema-export');
  const { inspectRollbackCompatibility } = require('../offline/cad-convex/rollbackCompatibility');
  const baseline = require('../offline/cad-convex/rollbackBaseline.json');
  const fixtures = require('../offline/cad-convex/rollbackFixtures.json');
  const blockers = require('../offline/cad-convex/executionBlockers.json');
  const current = extractSchema();
  const authPath = blockers.rollbackCompatibility.tableSources[1];
  if (fixtures.mode !== 'synthetic-only' || baseline.mode !== 'offline-source-baseline' ||
    baseline.verifiedCloudRelease !== null ||
    JSON.stringify(current.versions) !== JSON.stringify(baseline.versions) ||
    current.sourceHashes[authPath] !== blockers.rollbackCompatibility.pinnedAuthSchemaSha256 ||
    current.sourceHashes[authPath] !== baseline.sourceHashes[authPath]) throw Error('PROVENANCE_MISMATCH');
  const report = inspectRollbackCompatibility({ before: baseline.schema, proposed: current.schema,
    disabled: baseline.schema, retainedBefore: fixtures.rows, retainedAfter: fixtures.rows });
  // Hashes cover source/schema/bindings only, never fixture rows or private records.
  return { ...report, baselineSourceCommit: baseline.sourceCommit,
    baselineSourceHashes: baseline.sourceHashes, candidateSourceHashes: current.sourceHashes,
    candidateSchemaSha256: hash(JSON.stringify(current.schema)),
    disabledSchemaSha256: hash(JSON.stringify(baseline.schema)),
    sameSchema: JSON.stringify(current.schema) === JSON.stringify(baseline.schema) };
}
if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw Error('ARGUMENTS_NOT_SUPPORTED');
    const report = run();
    console.log(JSON.stringify(report, null, 2));
    if (!report.fixtureCompatible) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({ fixtureCompatible: false, executable: false,
      liveReady: false, code: 'OFFLINE_ROLLBACK_CHECK_FAILED' }));
    process.exitCode = 1;
  }
}
module.exports = { run };
