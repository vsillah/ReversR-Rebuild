const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-deploy-command-target-correction.json', 'utf8'));
const prior = JSON.parse(fs.readFileSync('docs/cad-dev-reviewed-source-deploy-binding.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-deploy-command-target-correction.md', 'utf8');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

test('packet records source-only dev command correction after blocked deploy prompt', () => {
  assert.equal(packet.mode, 'source-only-cad-development-deploy-command-target-correction');
  assert.equal(packet.status, 'DEV_DEPLOY_COMMAND_CORRECTED_NO_DEPLOYMENT');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.target.deploymentName, 'majestic-alligator-31');
  assert.equal(packet.target.deploymentSelector, 'dev:majestic-alligator-31');
});

test('blocked command remains tied to prior digest and records no mutation', () => {
  const blocked = packet.blockedReviewedCommandEvidence;
  assert.equal(blocked.command, prior.exactCommandBinding.deployCommand.command);
  assert.equal(blocked.sha256, prior.exactCommandBinding.deployCommand.sha256);
  assert.equal(blocked.sha256, sha256(blocked.command));
  assert.equal(blocked.exitCode, 1);
  assert.equal(blocked.outcome, 'PROMPT_BLOCKED_NO_DEPLOYMENT');
  assert.equal(blocked.observedPromptTarget.deploymentType, 'production');
  assert.equal(blocked.observedPromptTarget.deploymentName, 'wry-tapir-206');
  assert.equal(blocked.productionMutationObserved, false);
  assert.equal(blocked.developmentMutationObserved, false);
});

test('corrected command targets one-shot dev push and does not carry deploy-only affordances', () => {
  const corrected = packet.correctedDevelopmentCommand;
  assert.equal(corrected.sha256, sha256(corrected.command));
  assert.match(corrected.command, /^npx --no-install convex dev --once /);
  assert.match(corrected.command, /--env-file \.local\/cad-convex\/dev-auth-edt\/convex-deployment\.env/);
  assert.match(corrected.command, /--typecheck try/);
  assert.match(corrected.command, /--codegen enable/);
  assert.doesNotMatch(corrected.command, /\bdeploy\b/);
  assert.doesNotMatch(corrected.command, /--prod/);
  assert.doesNotMatch(corrected.command, /--message/);
  assert.deepEqual(corrected.requiresEnvFileRows, ['CONVEX_DEPLOYMENT']);
  assert.deepEqual(corrected.backendRowsExpectedPresentByNameOnly, ['JWKS', 'JWT_PRIVATE_KEY', 'SITE_URL']);
  assert.equal(corrected.backendRowValuesRead, false);
  assert.equal(corrected.backendRowsMutatedByCommand, false);
  assert.equal(corrected.commandMayExecuteAfterMerge, true);
});

test('source and authority gates preserve no-production and no-live-run boundaries', () => {
  assert.equal(packet.sourceBindings.reviewedAuthSourceGateCommit, prior.runtimeSourceState.candidateSourceSha);
  assert.equal(packet.sourceBindings.disabledRollbackSourceCommit, prior.runtimeSourceState.disabledRollbackSourceSha);
  assert.equal(packet.sourceBindings.convexSourceUnchangedFromReviewedAuthGate, true);
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.equal(packet.nextSafeAction.canProceedWithoutUserInputUnderAutopilot, true);
});

test('markdown is source-safe and documents the corrected operator path', () => {
  assert.match(markdown, /convex dev --once/);
  assert.match(markdown, /No production or development deployment mutation was observed/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
