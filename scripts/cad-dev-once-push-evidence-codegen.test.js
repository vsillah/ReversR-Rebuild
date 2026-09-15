const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-once-push-evidence-codegen.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-once-push-evidence-codegen.md', 'utf8');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

test('packet records successful one-shot development push without live run authority', () => {
  assert.equal(packet.mode, 'source-only-cad-development-once-push-evidence-codegen-closeout');
  assert.equal(packet.status, 'DEVELOPMENT_SOURCE_PUSH_VERIFIED_CODEGEN_ALIGNED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.target.deploymentName, 'majestic-alligator-31');
  assert.equal(packet.executedDevelopmentPush.sha256, sha256(packet.executedDevelopmentPush.command));
  assert.match(packet.executedDevelopmentPush.command, /^npx --no-install convex dev --once /);
  assert.equal(packet.executedDevelopmentPush.exitCode, 0);
  assert.equal(packet.executedDevelopmentPush.observedDeploymentType, 'Development');
  assert.equal(packet.executedDevelopmentPush.productionPromptObserved, false);
  assert.equal(packet.executedDevelopmentPush.productionMutationObserved, false);
  assert.equal(packet.executedDevelopmentPush.liveRunExecuted, false);
});

test('source evidence references ignored local receipts without value material', () => {
  assert.equal(packet.localEvidence.receiptsIgnored, true);
  assert.equal(packet.localEvidence.receiptFileMode, '600');
  assert.equal(packet.localEvidence.receiptContainsSecretValues, false);
  assert.equal(packet.localEvidence.receiptContainsValueHashes, false);
  assert.match(packet.localEvidence.devOncePushReceiptPathRef, /^\.local\//);
  assert.match(packet.localEvidence.deploymentSelectorReceiptPathRef, /^\.local\//);
});

test('read-only verification records expected env names, functions and discovery status', () => {
  assert.deepEqual(packet.readOnlyVerification.backendEnvNamesOnly, ['JWKS', 'JWT_PRIVATE_KEY', 'SITE_URL']);
  assert.equal(packet.readOnlyVerification.backendEnvValuesRead, false);
  assert.equal(packet.readOnlyVerification.backendEnvRowsMutated, false);
  assert.equal(packet.readOnlyVerification.functionSpec.totalFunctions, 21);
  assert.equal(packet.readOnlyVerification.functionSpec.byType.Query, 6);
  assert.equal(packet.readOnlyVerification.functionSpec.byType.Mutation, 11);
  assert.ok(packet.readOnlyVerification.functionSpec.selectedIdentifiers.includes('auth.js:signIn'));
  assert.ok(packet.readOnlyVerification.functionSpec.selectedIdentifiers.includes('cadDurableEngine.js:stop'));
  assert.equal(packet.readOnlyVerification.functionSpec.uploadsEnabledFalseCount, 9);
  assert.equal(packet.readOnlyVerification.functionSpec.conversionEnabledFalseCount, 9);
  assert.equal(packet.readOnlyVerification.functionSpec.liveRunAuthorizedFalseCount, 9);
  assert.equal(packet.readOnlyVerification.httpDiscovery.openidStatus, 200);
  assert.equal(packet.readOnlyVerification.httpDiscovery.issuer, 'https://majestic-alligator-31.convex.site');
  assert.equal(packet.readOnlyVerification.httpDiscovery.jwksStatus, 200);
  assert.equal(packet.readOnlyVerification.httpDiscovery.jwksKeys, 1);
  assert.equal(packet.readOnlyVerification.httpDiscovery.jwksPrivateFieldsObserved, false);
  assert.equal(packet.readOnlyVerification.httpDiscovery.jwksKeyMaterialRecorded, false);
});

test('codegen alignment is limited to generated files and preserves authority gates', () => {
  assert.deepEqual(packet.codegenAlignment.files, [
    'convex/_generated/api.d.ts',
    'convex/_generated/api.js',
    'convex/_generated/dataModel.d.ts',
    'convex/_generated/server.d.ts',
    'convex/_generated/server.js',
  ]);
  assert.equal(packet.codegenAlignment.runtimeSourceChanged, false);
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown is source-safe and does not overclaim production readiness', () => {
  assert.match(markdown, /convex dev --once/);
  assert.match(markdown, /no live Auth\/session run was executed/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
