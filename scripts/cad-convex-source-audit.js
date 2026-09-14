// Local static/leak audit; prints counts only, never matched private material.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const files = [
  'offline/cad-convex/durableEngine.js',
  'offline/cad-convex/durableEngine.d.ts',
  'offline/cad-convex/durableEngineAdapter.js',
  'offline/cad-convex/durableEngineRunner.js',
  'offline/cad-convex/durableEngineQualification.json',
  'offline/cad-convex/liveDurableRunPacketAssembly.json',
  'offline/cad-convex/liveDurableRunPacketAssembly.js',
  'offline/cad-convex/privateEvidenceCommandCardFillPlan.json',
  'offline/cad-convex/privateEvidenceCommandCardFillPlan.js',
  'convex/cadDurableEngine.ts',
  'scripts/helpers/cad-durable-engine-fixture.js',
  'scripts/cad-durable-engine.test.js',
  'scripts/cad-durable-engine-atomicity.test.js',
  'scripts/cad-durable-engine-source.test.js',
  'scripts/cad-live-durable-run-packet-assembly.test.js',
  'scripts/cad-private-evidence-command-card-fill.test.js',
  'docs/cad-durable-engine-implementation.md',
  'docs/cad-live-durable-run-packet-assembly.md',
  'docs/cad-private-evidence-command-card-fill.md',

  'offline/cad-convex/durableEvidenceBinding.js',
  'offline/cad-convex/durableEvidencePrerequisites.json',
  'scripts/helpers/cad-durable-evidence-fixture.js',
  'scripts/cad-durable-evidence-binding.test.js',
  'docs/cad-durable-engine-evidence-binding.md',

  'offline/cad-convex/durableAdapter.js',
  'offline/cad-convex/durableAdapter.d.ts',
  'offline/cad-convex/liveRunner.js',
  'offline/cad-convex/liveRunnerOutput.json',
  'scripts/cad-live-runner.js',
  'scripts/cad-live-runner.test.js',
  'docs/cad-live-runner-adapter-source.md',
  'offline/cad-convex/runnerCommandCards.json',
  'offline/cad-convex/runnerCommandCards.js',
  'scripts/cad-runner-command-cards.js',
  'scripts/cad-runner-command-cards.test.js',
  'docs/cad-runner-adapter-command-cards.md',

  'docs/cad-mark-handoff.md',
  'docs/cad-mark-handoff-evidence.md',
  'docs/cad-live-dev-run-execution-plan.md',
  'offline/cad-convex/liveRunApprovalPacket.json',
  'offline/cad-convex/liveRunApprovalEnvelope.json',
  'offline/cad-convex/liveRunApprovalPacket.js',
  'scripts/cad-live-run-approval-packet.test.js',
  'docs/cad-live-run-approval-packet.md',

  'offline/cad-convex/boundedLiveRunDossier.json',
  'offline/cad-convex/boundedLiveRunDossier.js',
  'scripts/cad-bounded-live-run-dossier.test.js',
  'docs/cad-bounded-live-run-dossier.md',
  'offline/cad-convex/liveAdapterRunPacket.json',
  'offline/cad-convex/liveAdapterRunPacket.js',
  'scripts/cad-live-adapter-run-packet.test.js',
  'docs/cad-live-adapter-qualification-packet.md',
  'offline/cad-convex/sharedControlsAdapterQualification.json',
  'scripts/helpers/cad-shared-controls-adapter-double.js',
  'scripts/cad-shared-controls-adapter-qualification.test.js',
  'docs/cad-shared-controls-adapter-qualification.md',

  'offline/cad-convex/sharedUploadControls.js',
  'offline/cad-convex/sharedUploadControls.json',
  'scripts/cad-upload-shared-controls.test.js',
  'docs/cad-upload-shared-controls.md',
  'server/cadUserUploadAdmission.js',
  'server/cadUserUploadRouter.js',
  'scripts/cad-user-upload-admission.test.js',
  'scripts/cad-user-upload-route.test.js',
  'offline/cad-convex/disabledUploadAdmission.json',
  'docs/cad-disabled-upload-admission.md',
  'docs/cad-user-upload-contract.md',

  'docs/cad-live-upload-activation-readiness.md',
  'offline/cad-convex/userUploadActivationReadiness.json',
  'scripts/cad-user-upload-activation-readiness.test.js',
  'docs/cad-lockout-private-register-adapters.md',
  'offline/cad-convex/lockoutPrivateAdapters.js',
  'offline/cad-convex/privateAdapterReadiness.json',
  'scripts/cad-convex-lockout-private-adapters.test.js',

  'docs/cad-lockout-retained-terminal-state.md',
  'offline/cad-convex/lockoutReadiness.json',
  'offline/cad-convex/retainedTerminalState.js',
  'scripts/cad-convex-retained-terminal-state.test.js',
  'docs/cad-bounded-retention-policy.md',
  'offline/cad-convex/boundedRetentionPolicy.json',
  'offline/cad-convex/boundedRetentionPolicy.js',
  'scripts/cad-convex-bounded-retention.test.js',
  'docs/cad-removal-retention-policy.md',
  'offline/cad-convex/removalRetentionReview.json',
  'scripts/cad-convex-removal-retention.test.js',
  'docs/cad-auth-transport-run-register.md',
  'offline/cad-convex/syntheticRemovalBoundary.js',
  'offline/cad-convex/syntheticRunRegister.js',
  'offline/cad-convex/verifiedSyntheticTransport.js',
  'scripts/cad-convex-auth-transport-register.test.js',

  'docs/cad-positive-synthetic-auth-session.md',
  'offline/cad-convex/positiveSyntheticLedger.js',
  'offline/cad-convex/positiveSyntheticSession.js',
  'scripts/helpers/cad-positive-synthetic-fixture.js',
  'scripts/cad-convex-positive-synthetic-session.test.js',

  'docs/cad-live-dev-auth-execution-readiness.md',
  'offline/cad-convex/rollbackCompatibility.js',
  'offline/cad-convex/rollbackBaseline.json',
  'offline/cad-convex/rollbackFixtures.json',
  'scripts/helpers/cad-convex-schema-export.js',
  'scripts/cad-convex-rollback-compatibility.js',
  'scripts/cad-convex-rollback-compatibility.test.js',
  'docs/cad-live-execution-blockers-resolution.md', 'offline/cad-convex/executionBlockers.json', 'scripts/cad-convex-execution-blockers.test.js', 'docs/cad-live-dev-execution-inputs.md', 'offline/cad-convex/executionInputs.json', 'scripts/cad-convex-execution-inputs.test.js', 'docs/cad-live-dev-auth-config-gate.md',
  'offline/cad-convex/developmentConfigurationGate.json',
  'offline/cad-convex/developmentConfigurationGate.js',
  'scripts/cad-convex-development-config-gate.test.js', 'convex/developmentAuth.ts', 'offline/cad-convex/developmentService.js',
  'offline/cad-convex/developmentExecution.json', 'docs/cad-live-auth-source-assembly.md',
  'scripts/cad-convex-development-assembly.test.js', 'docs/cad-live-dev-edt-approval-packet.md', 'offline/cad-convex/configurationQualification.js',
  'offline/cad-convex/configurationQualification.json',
  'scripts/cad-convex-configuration-qualification.test.js',
  'docs/cad-live-dev-convex-auth-qualification.md',
  'offline/cad-convex/devWiring.js', 'offline/cad-convex/devWiring.json',
  'scripts/cad-convex-dev-wiring.test.js', 'docs/cad-dev-convex-auth-wiring-review.md',
  'offline/cad-convex/liveReadiness.js', 'offline/cad-convex/liveReadiness.json',
  'scripts/cad-convex-live-readiness.js', 'scripts/cad-convex-live-readiness.test.js',
  'docs/cad-convex-live-auth-readiness.md', 'offline/cad-convex/passwordPolicy.ts', 'scripts/cad-convex-password-boundary.test.js',
  'docs/cad-convex-password-auth-boundary.md', 'docs/cad-convex-live-wiring-packet.md', 'docs/cad-live-convex-auth-setup-packet.md', 'convex/auth.ts', 'convex/auth.config.ts', 'convex/http.ts',
  'offline/cad-convex/librarySessionHarness.js', 'scripts/cad-convex-auth-assembly.test.js',
  'docs/cad-convex-auth-assembly-review.md',
  'offline/cad-convex/previewRuntime.js', 'offline/cad-convex/previewRuntime.d.ts',
  'scripts/cad-convex-preview-runtime.test.js', 'docs/cad-convex-preview-setup.md', 'scripts/cad-convex-codegen.js', 'package.json', 'package-lock.json',
  ...fs.readdirSync(path.join(root, 'convex/_generated')).map(n => 'convex/_generated/' + n),
'convex/cad.ts', 'convex/schema.ts', 'convex/librarySession.ts',
  'offline/cad-convex/backend.d.ts', 'scripts/helpers/cad-convex-source-loader.js',
  'scripts/cad-convex-source.test.js', 'docs/cad-convex-schema-functions-review.md'];
const patterns = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /(?:sk_live_|ghp_|github_pat_)[A-Za-z0-9_]{16,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /us1\.[A-Za-z0-9_-]{43}/, /\/Users\/[^\s'"`]+/, /[A-Za-z0-9+/]{256,}={0,2}/,
  /^.{72}[SGDPT] *\d+\s*$/m];
let hits = 0;
for (const name of files) for (const pattern of patterns) if (pattern.test(read(name))) hits++;
assert.equal(hits, 0, 'Source packet leak pattern detected (content withheld)');
assert.ok(!/process\.env|fetch\s*\(|https?\.request|require\(['"](?:convex|node:https|node:http)['"]\)/.test(read('offline/cad-convex/previewRuntime.js')));
assert.ok(!/process\.env|fetch\s*\(|require\s*\(/.test(read('offline/cad-convex/librarySessionHarness.js')));
assert.match(read('convex/developmentAuth.ts'), /developmentAuthReviewed: boolean = false/);
assert.match(read('convex/auth.ts'), /developmentPassword\(\[\]\)/);
assert.ok(!/fetch\s*\(|process\.env/.test(read('offline/cad-convex/developmentService.js')));
const execution = JSON.parse(read('offline/cad-convex/developmentExecution.json'));
assert.equal(execution.executable, false);
assert.ok(Object.values(execution.gates).every(gate => gate.approved === false));
assert.ok(Object.values(execution.uploads).every(value => value === false));
const disposition = JSON.parse(read('offline/cad-convex/removalRetentionReview.json'));
assert.equal(disposition.decision, 'KEEP_PROVISIONING_BLOCKED');
assert.equal(disposition.mode, 'source-review-only');
for (const key of ['supportedUserRemoval', 'liveReady', 'retentionApproved']) assert.equal(disposition[key], false);
assert.equal(Object.keys(disposition.alternatives).length, 3);
for (const alternative of Object.values(disposition.alternatives))
  assert.deepEqual(alternative, { enabled: false, approved: false });
const reader = read('convex/librarySession.ts');
assert.ok(!/Date\s*\.|new\s+Date|performance\s*\./.test(reader), 'Session reader must use explicit deterministic time');
assert.match(read('offline/cad-convex/backend.js'), /readExactLibrarySession\(ctx, b.loginSessionId, deadlineAt\)/);
const cad = read('convex/cad.ts');
for (const operation of ['read', 'resolveAuthorization', 'refreshAuthorization'])
  assert.ok(cad.includes("queryBackend(p.deadlineAt).run(ctx, '" + operation + "'"), 'Queries require deterministic snapshot clock');
assert.match(cad, /now: \(\) => deadlineAt - 1/);
assert.equal((cad.match(/= internal(?:Query|Mutation)\(\{/g) || []).length, 6);
assert.equal((cad.match(/returns:/g) || []).length, 6);
assert.ok(!/\b(?:query|mutation|action|httpAction)\s*\(/.test(cad));
const backend = read('offline/cad-convex/backend.js');
assert.ok(!/\.collect\s*\(|\.query\([^)]*\)\.filter\s*\(/.test(backend));
assert.ok(!/process\.env|fetch\s*\(/.test(cad + read('convex/librarySession.ts')));
const durable = read('convex/cadDurableEngine.ts');
assert.equal((durable.match(/= internal(?:Query|Mutation)\(\{/g) || []).length, 9);
assert.equal((durable.match(/returns:/g) || []).length, 9);
assert.ok(!/export const \w+ = (?:query|mutation|action|httpAction)\s*\(/.test(durable));
assert.match(durable, /verifyIndependentEvidence: \(\) => false/);
assert.ok(!/process\.env|fetch\s*\(|https?\.request|child_process/.test(durable));
assert.match(read('convex/schema.ts'), /cadQualificationLedgers/);
assert.match(read('convex/schema.ts'), /by_resource_namespace_run_ledger_window_fence/);
assert.match(read('convex/schema.ts'), /by_ledger_binding_kind/);
const durableQualification = JSON.parse(read('offline/cad-convex/durableEngineQualification.json'));
for (const key of ['executable', 'liveQualified', 'uploadsEnabled', 'conversionEnabled',
  'runtimeWired', 'independentEvidenceVerifierBound']) assert.equal(durableQualification[key], false);
assert.ok(Object.values(durableQualification.gates).every(value => value === false));
for (const name of fs.readdirSync(path.join(root, 'server')).filter(n => /\.js$/.test(n))) {
  assert.ok(!/require\(['"][^'"]*(?:offline\/cad-convex|\/convex\/cad)/.test(read('server/' + name)));
}

for (const directory of ['convex', 'server', 'src', 'app', 'api', 'components', 'hooks', 'utils', 'constants', 'plugins']) {
  function visit(dir) {
    if (!fs.existsSync(path.join(root, dir))) return;
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const name = dir + '/' + entry.name;
      if (entry.isDirectory()) visit(name);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(name))
        assert.ok(!/durableEngineAdapter|durableEngineRunner|durableEngineQualification|cad-durable-engine-fixture|durableEvidenceBinding|durableEvidencePrerequisites|cad-durable-evidence-fixture|runnerCommandCards|cad-runner-command-cards|durableAdapter|liveRunner|cad-live-runner|liveRunApprovalPacket|liveRunApprovalEnvelope|boundedLiveRunDossier|liveAdapterRunPacket|sharedControlsAdapterQualification|cad-shared-controls-adapter-double|sharedUploadControls|lockoutPrivateAdapters|privateAdapterReadiness|retainedTerminalState|lockoutReadiness|boundedRetentionPolicy|removalRetentionReview|syntheticRemovalBoundary|syntheticRunRegister|verifiedSyntheticTransport|positiveSyntheticSession|positiveSyntheticLedger|cad-positive-synthetic-fixture|passwordPolicy|liveReadiness|devWiring|configurationQualification|developmentConfigurationGate|executionInputs|executionBlockers|rollbackCompatibility|rollbackBaseline|rollbackFixtures|userUploadActivationReadiness/.test(read(name)), 'Offline Password policy or readiness packet referenced by runtime');
    }
  }
  visit(directory);
}
assert.ok(!/process\.env|fetch\s*\(|require\s*\(/.test(read('offline/cad-convex/passwordPolicy.ts')));

assert.ok(!/process\.env|fetch\s*\(|https?\.request/.test(read('offline/cad-convex/configurationQualification.js')));


assert.equal(require('../offline/cad-convex/developmentConfigurationGate').inspectDevelopmentConfigurationGate(JSON.parse(read('offline/cad-convex/developmentConfigurationGate.json'))).packetValid, true);

assert.ok(!/process\.env|fetch\s*\(|require\s*\(/.test(read('offline/cad-convex/rollbackCompatibility.js')));

for (const name of ['positiveSyntheticSession', 'positiveSyntheticLedger', 'syntheticRemovalBoundary', 'syntheticRunRegister', 'verifiedSyntheticTransport'])
  assert.ok(!/process\.env|fetch\s*\(|https?\.request|@convex-dev\/auth|convex\/browser|console\./.test(read('offline/cad-convex/' + name + '.js')));


const retention = JSON.parse(read('offline/cad-convex/boundedRetentionPolicy.json'));
for (const key of ['enabled', 'approved', 'liveReady', 'retentionOverride']) assert.equal(retention[key], false);
assert.ok(Object.values(retention.gates).every(value => value === false));
assert.equal(retention.custodianRef, null);
assert.equal(retention.expiresAtUtc, null);
assert.ok(!/process\.env|fetch\s*\(|https?\.request|@convex-dev\/auth|convex\/browser|console\./.test(read('offline/cad-convex/boundedRetentionPolicy.js')));

console.log(`CAD source audit passed: ${files.length} files, zero leak pattern matches; internal-only and runtime isolation checks passed`);

const lockout = JSON.parse(read('offline/cad-convex/lockoutReadiness.json'));
for (const key of ['enabled', 'liveReady', 'cleanupVerified']) assert.equal(lockout[key], false);
assert.ok(Object.values(lockout.gates).every(v => v === false));
assert.equal(lockout.custodianRef, null);
assert.equal(lockout.expiresAtUtc, null);
assert.ok(!/process\.env|fetch\s*\(|https?\.request|@convex-dev\/auth|convex\/browser|console\./.test(read('offline/cad-convex/retainedTerminalState.js')));

const privateAdapters = JSON.parse(read('offline/cad-convex/privateAdapterReadiness.json'));
for (const key of ['enabled', 'liveReady', 'cleanupVerified']) assert.equal(privateAdapters[key], false);
assert.ok(Object.values(privateAdapters.gates).every(v => v === false));
assert.equal(privateAdapters.custodianRef, null);
assert.equal(privateAdapters.expiresAtUtc, null);
assert.ok(!/process\.env|fetch\s*\(|https?\.request|@convex-dev\/auth|convex\/browser|console\.|node:fs/.test(read('offline/cad-convex/lockoutPrivateAdapters.js')));

assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/runnerCommandCards.js')));

for (const name of ['durableAdapter.js', 'liveRunner.js', 'durableEvidenceBinding.js'])
  assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/' + name)));

for (const name of ['durableEngine.js', 'durableEngineAdapter.js', 'durableEngineRunner.js'])
  assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/' + name)));
assert.match(read('server/cadUserUploadRouter.js'), /const BODY_ADMISSION_AUTHORIZED = false;/);

assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('scripts/helpers/cad-durable-evidence-fixture.js')));

const durableAssembly = JSON.parse(read('offline/cad-convex/liveDurableRunPacketAssembly.json'));
for (const key of ['executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled',
  'privateEvidenceComplete', 'readyForLiveRunApproval']) assert.equal(durableAssembly[key], false);
assert.equal(durableAssembly.sourceDerivedComplete, true);
assert.ok(Object.values(durableAssembly.gates).every(value => value === false));
assert.ok(durableAssembly.remainingEvidence.some(item => item.id === 'identity.privateResourceBindingRef'));
assert.ok(durableAssembly.nextHumanGates.publication.includes('No merge, deployment, live tests'));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/liveDurableRunPacketAssembly.js')));

const fillPlan = JSON.parse(read('offline/cad-convex/privateEvidenceCommandCardFillPlan.json'));
for (const key of ['executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled',
  'privateEvidenceComplete', 'commandCardsComplete', 'readyForLiveRunApproval']) assert.equal(fillPlan[key], false);
assert.ok(Object.values(fillPlan.gates).every(value => value === false));
assert.equal(fillPlan.sourceBindings.liveDurableRunPacketAssemblyCommit, 'c785c79e7ed3b1b5eea1868a82a41740fa2451ed');
assert.equal(fillPlan.privateResourceBindingPlan.privateValueInGit, false);
assert.equal(fillPlan.costAndTimePlan.maxEnforcedCapMicros, 9000000);
assert.ok(fillPlan.nextHumanGates.liveQualificationTemplate.includes('Keep uploads disabled'));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/privateEvidenceCommandCardFillPlan.js')));
