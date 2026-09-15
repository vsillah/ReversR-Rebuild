const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-cost-custody-rollback-window-evidence.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-cost-custody-rollback-window-evidence.md', 'utf8');

test('packet records accepted Convex threshold and backup custodian without mutation authority', () => {
  assert.equal(packet.mode, 'source-only-cad-development-cost-custody-rollback-window-evidence');
  assert.equal(packet.status, 'CONVEX_THRESHOLD_AND_BACKUP_CUSTODIAN_ACCEPTED_COMMANDS_AND_WINDOW_PENDING');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, 'fa480868ddfd28cc99c2420ab341859f525e83a2');
  assert.equal(packet.convexSpendingDecision.teamSpendingDisableThresholdUsdPerMonth, 50);
  assert.equal(packet.convexSpendingDecision.thresholdMaintainedWithoutMutation, true);
  assert.equal(packet.convexSpendingDecision.acceptedAsInternalTestingCushion, true);
  assert.equal(packet.custodyDecision.backupCustodian, 'Amina');
  assert.equal(packet.custodyDecision.backupCustodianAccepted, true);
});

test('threshold is not overclaimed as per-run economics or production authority', () => {
  assert.equal(packet.convexSpendingDecision.endToEndCadRunCostKnown, false);
  assert.match(packet.convexSpendingDecision.scopeLimit, /not a per-run price/);
  assert.match(packet.convexSpendingDecision.scopeLimit, /not Vercel or Sandbox cost evidence/);
  assert.equal(packet.fastFollowCostLedger.roadmapBlockingNow, false);
  assert.equal(packet.fastFollowCostLedger.requiredBeforeFeePerRunDecision, true);
  assert.equal(packet.fastFollowCostLedger.requiredBeforeProductionCadActivation, true);
  assert.ok(packet.fastFollowCostLedger.lineItems.includes('Vercel Sandbox active CPU'));
  assert.ok(packet.fastFollowCostLedger.lineItems.includes('CAD conversion or render compute'));
});

test('command template digests are present but exact executable commands remain pending', () => {
  assert.equal(packet.deploymentCommandReview.exactCommandsExecutableNow, false);
  assert.equal(packet.deploymentCommandReview.deploymentAuthorityNow, false);
  assert.equal(packet.deploymentCommandReview.rollbackAuthorityNow, false);
  assert.equal(packet.deploymentCommandReview.digestKind, 'template-digest');
  assert.equal(packet.deploymentCommandReview.deployTemplate.sha256, '5f97744682053df701e8e3c17b407ad0cc591d7c07dcf3e97d1eaaf1d225deeb');
  assert.equal(packet.deploymentCommandReview.disabledRollbackTemplate.sha256, '5d59af398764917b610af27019efc000ec4ceda5c5c19220fe47d09f575e666f');
  assert.ok(packet.deploymentCommandReview.mustBeReplacedBeforeDeployment.includes('source-sha'));
  assert.ok(packet.deploymentCommandReview.mustBeReplacedBeforeDeployment.includes('disabled-rollback-sha'));
});

test('fresh run window is still pending and no live authority is granted', () => {
  assert.equal(packet.freshRunWindow.acceptedNow, false);
  assert.equal(packet.freshRunWindow.noRetry, true);
  assert.equal(packet.freshRunWindow.noSecondRun, true);
  assert.deepEqual(packet.remainingGates.map(gate => gate.id), [
    'D-ROLLBACK-COMMANDS',
    'T-FRESH-RUN-WINDOW',
    'CAD-RUN-COST-LEDGER',
  ]);
  assert.equal(packet.nextSafeAction.canProceedWithoutUserInput, true);
  assert.match(packet.nextSafeAction.stopBefore, /development env mutation/);
});

test('authority remains false for sensitive, billing and live actions', () => {
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown is source-safe and states the practical tradeoff', () => {
  assert.match(markdown, /existing Convex team usage spending disable threshold remains `USD 50`/);
  assert.match(markdown, /internal testing cushion/);
  assert.match(markdown, /does not make `USD 50` a run price/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /@/);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
