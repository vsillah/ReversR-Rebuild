const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const p = JSON.parse(read('offline/cad-convex/executionBlockers.json'));
const original = JSON.parse(read('offline/cad-convex/executionInputs.json'));

test('blocker packet cannot confer authority or store private execution values', () => {
  assert.equal(p.mode, 'source-only-blocker-resolution');
  assert.equal(p.executable, false); assert.equal(p.liveReady, false);
  assert.deepEqual(p.gates, original.gates);
  assert.ok(Object.values(p.gates).every(g => g === false));
  assert.equal(p.privateRegister.values, null);
  for (const e of p.evidenceRequirements) {
    assert.equal(e.receipt, null); assert.equal(e.resolved, false);
    for (const file of e.sourcePaths) assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  for (const c of p.commandCards) {
    assert.equal(c.command, null); assert.equal(c.implementationReceipt, null);
  }
  assert.equal(p.rollbackCompatibility.command, null);
  assert.equal(p.rollbackCompatibility.compatibilityReceipt, null);
  assert.equal(p.rollbackCompatibility.verifiedCloudRelease, null);
});

test('every command has traceable blockers and shared private command requirements', () => {
  const ids = p.evidenceRequirements.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(p.commandCards.map(c => c.id).sort(),
    ['transport','accounting','reconciliation','revocation','cleanup','provision','qualification'].sort());
  for (const c of p.commandCards) {
    assert.ok(Object.hasOwn(p.gates, c.gate));
    assert.ok(c.evidenceRequirements.length >= 2);
    c.evidenceRequirements.forEach(id => assert.ok(ids.includes(id), id));
    assert.ok(c.acceptance.length >= 3);
  }
  const fields = p.privateRegister.fieldGroups;
  for (const group of ['identity','appointment','custody','clock','budget','command','outcome','rollback']) {
    assert.ok(fields[group].length >= 8, group);
    assert.equal(new Set(fields[group]).size, fields[group].length, group);
  }
  for (const field of ['absoluteExecutable','executableSha256','argvWithoutSecrets','sourceSha',
    'destinationReceiptReference','providerCallUpperBound','allowedRecordSelectors',
    'unknownOutcomeProcedureReference','rollbackCommandId','approvalReceiptReference'])
    assert.ok(fields.command.includes(field), field);
  assert.ok(p.commandCards.find(c => c.id === 'provision').evidenceRequirements.includes('cleanup'));
});

test('time and cost worksheets preserve predecessor ceilings without claiming enforcement', () => {
  const d = p.deadlineRules, b = p.capWorksheet;
  for (const key of ['maximumRunSeconds','maximumSessionSeconds','maximumRecordRetentionHours',
    'maximumReceiptRetentionDays','crossUtcResetAllowed','restartAllowed'])
    assert.equal(d[key], original.expiry[key], key);
  assert.equal(d.identityFreshnessSeconds, 300);
  assert.equal(d.constraints.length, 8);
  assert.equal(b.ceilingUsd, original.budget.proposedAllInUsd);
  assert.equal(b.maximumLogicalOperations, original.budget.maximumInitiatedLogicalOperations);
  assert.equal(b.minimumCleanupReserve, original.budget.reservedCleanupLogicalOperations);
  assert.equal(b.maximumClients, 2); assert.equal(b.maximumIdentities, 2);
  assert.equal(b.maximumInFlight, 1); assert.equal(b.automaticRetries, 0);
  assert.equal(b.enforced, false); assert.equal(b.allInUpperBoundUsd, null);
  assert.deepEqual(b.metricRows, []);
  for (const field of ['baselineQuantity','fanoutUpperBound','roundingQuantum',
    'lagOvershootQuantityUpperBound','retentionQuantityUpperBound','cleanupQuantityUpperBound',
    'thresholdPrecision','enforcementReceipt']) assert.ok(b.metricFields.includes(field));
  for (const category of ['compute','storage','io','egress','search','deployment','auth',
    'logs','backupRetention','cleanup','tax','fees','currencyConversion','otherApplicableCharges'])
    assert.ok(b.requiredCoverage.includes(category), category);
});

test('rollback covers every local CAD table and requires expanded SDK auth schema proof', () => {
  const r = p.rollbackCompatibility;
  assert.equal(r.disabledSourceCandidate, p.baseCommit);
  const schema = read('convex/schema.ts');
  const tables = [...schema.matchAll(/(\w+): defineTable\(/g)].map(m => m[1]);
  assert.ok(tables.length > 0);
  tables.forEach(table => assert.ok(r.requiredTableRows.includes(table), table));
  const sdk = read(r.tableSources[1]);
  assert.equal(createHash('sha256').update(sdk).digest('hex'), r.pinnedAuthSchemaSha256);
  assert.equal(JSON.parse(read('node_modules/@convex-dev/auth/package.json')).version, r.authVersion);
  const authTables = [...sdk.matchAll(/(\w+): defineTable\(/g)].map(m => m[1]);
  assert.ok(authTables.length > 0);
  assert.deepEqual(r.requiredTableRows, [...tables, ...authTables]);
  assert.deepEqual(r.tableRows.map(row => row.table), r.requiredTableRows);
  for (const row of r.tableRows) for (const field of r.rowFields.filter(f => f !== 'table'))
    assert.equal(row[field], null, row.table + '.' + field);
  for (const field of ['currentValidatorHash','proposedValidatorHash','disabledValidatorHash',
    'indexesBeforeAfter','forwardFixtureReceipt','rollbackFixtureReceipt','supportedRemovalReference',
    'retainedProviderCopyDeadline']) assert.ok(r.rowFields.includes(field));
  assert.equal(r.protectiveLimitsRetained, true); assert.equal(r.resourceDeletionAllowed, false);
  assert.equal(r.order.length, 6);
  assert.match(read('convex/developmentAuth.ts'), /developmentAuthReviewed: boolean = false/);
  assert.match(read('convex/auth.ts'), /developmentPassword\(\[\]\)/);
});
