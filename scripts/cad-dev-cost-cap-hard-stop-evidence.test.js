const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-cost-cap-hard-stop-evidence.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-cost-cap-hard-stop-evidence.md', 'utf8');

test('packet records the cost-cap hard stop without live authority', () => {
  assert.equal(packet.mode, 'source-only-cad-development-cost-cap-hard-stop-evidence');
  assert.equal(packet.status, 'READ_ONLY_USAGE_EVIDENCE_CAPTURED_TEAM_DOLLAR_CAP_STILL_BLOCKING');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, 'bfc32b615517e84db75f0d65af4905d0f7a5ae9e');
  assert.equal(packet.target.repo, 'vsillah/ReversR-Rebuild');
  assert.equal(packet.target.deploymentName, 'majestic-alligator-31');
});

test('usage-limit evidence is read-only and untriggered', () => {
  assert.equal(packet.readOnlyCliEvidence.commandsRun.length, 2);
  assert.equal(packet.readOnlyCliEvidence.settingsMutated, false);
  assert.equal(packet.readOnlyCliEvidence.usageLimits.length, 8);
  for (const limit of packet.readOnlyCliEvidence.usageLimits) {
    assert.equal(limit.window, 'day');
    assert.equal(limit.limitType, 'disable');
    assert.equal(limit.enabled, true);
    assert.equal(limit.triggered, false);
    assert.ok(limit.currentUsage <= limit.limit, `${limit.metric} exceeds the recorded disable limit`);
  }
});

test('deployment usage limits do not satisfy the team dollar cap', () => {
  assert.equal(packet.costGateDecision.deploymentUsageLimitsObserved, true);
  assert.equal(packet.costGateDecision.deploymentUsageLimitsAllEnabled, true);
  assert.equal(packet.costGateDecision.deploymentUsageLimitsTriggered, false);
  assert.equal(packet.costGateDecision.deploymentUsageLimitsAreDollarCap, false);
  assert.equal(packet.costGateDecision.teamSpendingLimitObserved, false);
  assert.equal(packet.costGateDecision.teamSpendingLimitDisableThresholdBelowTenUsdObserved, false);
  assert.equal(packet.costGateDecision.developmentMutationAuthorizedNow, false);
});

test('required evidence list covers cost, custody, rollback and window gates', () => {
  assert.deepEqual(packet.requiredEvidenceToContinue.map(item => item.id), [
    'U-COST-TEAM-DISABLE-LIMIT',
    'K-BACKUP-CUSTODIAN',
    'D-ROLLBACK-COMMANDS',
    'T-FRESH-RUN-WINDOW',
  ]);
  assert.equal(packet.nextSafeAction.canProceedWithoutUserInput, false);
  assert.match(packet.nextSafeAction.blockedReason, /not available from the read-only CLI/);
});

test('authority remains false for sensitive and live actions', () => {
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown states the blocker without leaking or overclaiming readiness', () => {
  assert.match(markdown, /team dollar cap still blocking/);
  assert.match(markdown, /not a substitute for the\s+missing team-dollar evidence/);
  assert.match(markdown, /no development env mutation/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
