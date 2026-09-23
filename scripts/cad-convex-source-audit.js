// Local static/leak audit; prints counts only, never matched private material.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
assert.equal(require('./cad-production-auth-verifier-acceptance-checker').checkAcceptance(
  JSON.parse(read('docs/cad-production-auth-verifier-acceptance.json'))).ok, true);
const files = [
  'docs/cad-production-auth-verifier-acceptance.md',
  'docs/cad-production-auth-verifier-acceptance.json',
  'scripts/cad-production-auth-verifier-acceptance-checker.js',
  'scripts/cad-production-auth-verifier-acceptance.test.js',

  'server/cadProductionSessionVerifierBinding.js',
  'scripts/cad-production-session-verifier-binding.test.js',
  'docs/cad-production-session-verifier-binding.md',
  'docs/cad-internal-admission-current-commit-rebind.md',
  'docs/cad-internal-admission-current-commit-rebind.json',
  'scripts/cad-internal-admission-current-commit-rebind-checker.js',
  'scripts/cad-internal-admission-current-commit-rebind.test.js',
  'scripts/cad-internal-admission-opening-bundle-checker.js',

  'docs/cad-fresh-replacement-restricted-evidence.md',
  'docs/cad-fresh-replacement-restricted-evidence.json',
  'offline/cad-convex/freshReplacementRestrictedEvidence.js',
  'scripts/cad-fresh-replacement-restricted-evidence.test.js',
  'docs/cad-successor-register-provenance-acceptance.md',
  'docs/cad-successor-register-provenance-acceptance.json',
  'docs/cad-successor-register-provenance-projection.json',
  'offline/cad-convex/successorRegisterProvenanceAcceptance.js',
  'scripts/cad-successor-register-provenance-acceptance.test.js',
  'docs/cad-fresh-executor-rebind-evidence-prep.md',
  'docs/cad-fresh-executor-rebind-evidence-prep.json',
  'offline/cad-convex/durableEngine.js',
  'offline/cad-convex/durableEngine.d.ts',
  'offline/cad-convex/durableEngineAdapter.js',
  'offline/cad-convex/durableEngineRunner.js',
  'offline/cad-convex/durableEngineQualification.json',
  'offline/cad-convex/liveDurableRunPacketAssembly.json',
  'offline/cad-convex/liveDurableRunPacketAssembly.js',
  'offline/cad-convex/privateEvidenceCommandCardFillPlan.json',
  'offline/cad-convex/privateEvidenceCommandCardFillPlan.js',
  'offline/cad-convex/privateRestrictedRegisterReview.json',
  'offline/cad-convex/privateRestrictedRegisterReview.js',
  'offline/cad-convex/restrictedEvidenceCommandCardBytes.json',
  'offline/cad-convex/restrictedEvidenceCommandCardBytes.js',
  'offline/cad-convex/boundedDevQualificationExecutor.json',
  'offline/cad-convex/boundedDevQualificationExecutor.js',
  'offline/cad-convex/boundedDevQualificationTransport.js',
  'scripts/cad-bounded-dev-qualification-executor.js',
  'scripts/cad-bounded-dev-qualification-executor.test.js',
  'scripts/cad-bounded-dev-qualification-transport.test.js',
  'docs/cad-bounded-dev-qualification-executor.md',
  'docs/cad-earlier-window-transport-diagnostic-hardening.md',
  'convex/cadDurableEngine.ts',
  'scripts/helpers/cad-durable-engine-fixture.js',
  'scripts/cad-durable-engine.test.js',
  'scripts/cad-durable-engine-atomicity.test.js',
  'scripts/cad-durable-engine-source.test.js',
  'scripts/cad-live-durable-run-packet-assembly.test.js',
  'scripts/cad-private-evidence-command-card-fill.test.js',
  'scripts/cad-private-restricted-register-review.test.js',
  'scripts/cad-restricted-evidence-command-card-bytes.test.js',
  'docs/cad-durable-engine-implementation.md',
  'docs/cad-live-durable-run-packet-assembly.md',
  'docs/cad-private-evidence-command-card-fill.md',
  'docs/cad-private-restricted-register-review.md',
  'docs/cad-restricted-evidence-command-card-bytes.md',

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
  'offline/cad-convex/disabledUploadAdmissionAdapter.js',
  'offline/cad-convex/disabledUploadAdmissionAdapter.json',
  'docs/cad-disabled-upload-admission.md',
  'docs/cad-upload-admission-disabled-adapter.md',
  'scripts/cad-upload-admission-disabled-adapter.test.js',
  'docs/cad-upload-admission-durable-adapter-plan.md',
  'docs/cad-upload-admission-durable-adapter-plan.json',
  'scripts/cad-upload-admission-durable-adapter-plan.test.js',
  'offline/cad-convex/uploadAdmissionDurableAdapter.js',
  'offline/cad-convex/uploadAdmissionDurableAdapter.json',
  'docs/cad-upload-admission-durable-adapter-source.md',
  'scripts/cad-upload-admission-durable-adapter-source.test.js',
  'docs/cad-upload-admission-qualification-window.md',
  'docs/cad-upload-admission-qualification-window.json',
  'scripts/cad-upload-admission-qualification-window.test.js',
  'offline/cad-convex/uploadAdmissionGuardedRouteBridge.js',
  'offline/cad-convex/uploadAdmissionGuardedRouteBridge.json',
  'docs/cad-upload-admission-guarded-route-bridge.md',
  'scripts/cad-upload-admission-guarded-route-bridge.test.js',
  'offline/cad-convex/uploadAdmissionRuntimeBridgeReview.js',
  'offline/cad-convex/uploadAdmissionRuntimeBridgeReview.json',
  'docs/cad-upload-admission-runtime-bridge-review.md',
  'docs/cad-upload-admission-runtime-bridge-review.json',
  'scripts/cad-upload-admission-runtime-bridge-review.test.js',
  'server/cadUploadAdmissionRuntimeBridge.js',
  'offline/cad-convex/uploadAdmissionRuntimeBridgeSource.json',
  'docs/cad-upload-admission-runtime-bridge-source.md',
  'docs/cad-upload-admission-runtime-bridge-source.json',
  'scripts/cad-upload-admission-runtime-bridge-source.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.json',
  'docs/cad-upload-admission-development-dry-run-plan.md',
  'docs/cad-upload-admission-development-dry-run-plan.json',
  'scripts/cad-upload-admission-development-dry-run-plan.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor.json',
  'docs/cad-upload-admission-development-dry-run-executor.md',
  'docs/cad-upload-admission-development-dry-run-executor.json',
  'scripts/cad-upload-admission-development-dry-run-executor.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunAcceptance.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunAcceptance.json',
  'docs/cad-upload-admission-development-dry-run-acceptance.md',
  'docs/cad-upload-admission-development-dry-run-acceptance.json',
  'scripts/cad-upload-admission-development-dry-run-acceptance.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunRunner.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunRunner.json',
  'scripts/run-cad-upload-admission-development-dry-run.js',
  'docs/cad-upload-admission-development-dry-run-runner.md',
  'docs/cad-upload-admission-development-dry-run-runner.json',
  'scripts/cad-upload-admission-development-dry-run-runner.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunCloseout.js',
  'offline/cad-convex/uploadAdmissionDevelopmentDryRunCloseout.json',
  'docs/cad-upload-admission-development-dry-run-closeout.md',
  'docs/cad-upload-admission-development-dry-run-closeout.json',
  'scripts/cad-upload-admission-development-dry-run-closeout.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json',
  'docs/cad-upload-admission-development-body-admission-packet.md',
  'docs/cad-upload-admission-development-body-admission-packet.json',
  'scripts/cad-upload-admission-development-body-admission-packet.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.json',
  'scripts/run-cad-upload-admission-development-body-admission-executor.js',
  'docs/cad-upload-admission-development-body-admission-executor.md',
  'docs/cad-upload-admission-development-body-admission-executor.json',
  'scripts/cad-upload-admission-development-body-admission-executor.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow.json',
  'scripts/run-cad-upload-admission-development-body-admission-window.js',
  'docs/cad-upload-admission-development-body-admission-window.md',
  'docs/cad-upload-admission-development-body-admission-window.json',
  'scripts/cad-upload-admission-development-body-admission-window.test.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout.js',
  'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout.json',
  'docs/cad-upload-admission-development-body-admission-closeout.md',
  'docs/cad-upload-admission-development-body-admission-closeout.json',
  'scripts/cad-upload-admission-development-body-admission-closeout.test.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json',
  'docs/cad-upload-admission-mounted-development-readiness.md',
  'docs/cad-upload-admission-mounted-development-readiness.json',
  'scripts/cad-upload-admission-mounted-development-readiness.test.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.json',
  'docs/cad-upload-admission-mounted-development-window.md',
  'docs/cad-upload-admission-mounted-development-window.json',
  'scripts/cad-upload-admission-mounted-development-window.test.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge.json',
  'scripts/run-cad-upload-admission-mounted-development-window.js',
  'docs/cad-upload-admission-mounted-development-executor-bridge.md',
  'docs/cad-upload-admission-mounted-development-executor-bridge.json',
  'scripts/cad-upload-admission-mounted-development-executor-bridge.test.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.js',
  'offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json',
  'docs/cad-upload-admission-mounted-development-closeout.md',
  'docs/cad-upload-admission-mounted-development-closeout.json',
  'scripts/cad-upload-admission-mounted-development-closeout.test.js',
  'offline/cad-convex/uploadAdmissionActivationDecisionRefresh.js',
  'offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json',
  'docs/cad-upload-admission-activation-decision-refresh.md',
  'docs/cad-upload-admission-activation-decision-refresh.json',
  'scripts/cad-upload-admission-activation-decision-refresh.test.js',
  'offline/cad-convex/uploadAdmissionActivationExactWindow.js',
  'offline/cad-convex/uploadAdmissionActivationExactWindow.json',
  'docs/cad-upload-admission-activation-exact-window.md',
  'docs/cad-upload-admission-activation-exact-window.json',
  'scripts/cad-upload-admission-activation-exact-window.test.js',
  'offline/cad-convex/uploadAdmissionActivationRunnerRebind.js',
  'offline/cad-convex/uploadAdmissionActivationRunnerRebind.json',
  'scripts/run-cad-upload-activation-exact-window.js',
  'docs/cad-upload-admission-activation-runner-rebind.md',
  'docs/cad-upload-admission-activation-runner-rebind.json',
  'scripts/cad-upload-admission-activation-runner-rebind.test.js',
  'offline/cad-convex/uploadAdmissionActivationWindowRollover.js',
  'offline/cad-convex/uploadAdmissionActivationWindowRollover.json',
  'docs/cad-upload-admission-activation-window-rollover.md',
  'docs/cad-upload-admission-activation-window-rollover.json',
  'scripts/cad-upload-admission-activation-window-rollover.test.js',
  'offline/cad-convex/uploadAdmissionActivationRolloverCloseout.js',
  'offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json',
  'docs/cad-upload-admission-activation-rollover-closeout.md',
  'docs/cad-upload-admission-activation-rollover-closeout.json',
  'scripts/cad-upload-admission-activation-rollover-closeout.test.js',
  'offline/cad-convex/uploadConversionSandboxReadiness.js',
  'offline/cad-convex/uploadConversionSandboxReadiness.json',
  'docs/cad-upload-conversion-sandbox-readiness.md',
  'docs/cad-upload-conversion-sandbox-readiness.json',
  'scripts/run-cad-upload-conversion-sandbox-qualification.js',
  'scripts/cad-upload-conversion-sandbox-readiness.test.js',
  'offline/cad-convex/uploadConversionSandboxAuthCorrection.js',
  'offline/cad-convex/uploadConversionSandboxAuthCorrection.json',
  'docs/cad-upload-conversion-sandbox-auth-correction.md',
  'scripts/cad-upload-conversion-sandbox-auth-correction.test.js',
  'offline/cad-convex/uploadConversionSandboxRunCloseout.js',
  'offline/cad-convex/uploadConversionSandboxRunCloseout.json',
  'docs/cad-upload-conversion-sandbox-run-closeout.md',
  'scripts/cad-upload-conversion-sandbox-run-closeout.test.js',
  'offline/cad-convex/developmentReadinessAutopilotCloseout.js',
  'offline/cad-convex/developmentReadinessAutopilotCloseout.json',
  'docs/cad-development-readiness-autopilot-closeout.md',
  'scripts/cad-development-readiness-autopilot-closeout.test.js',
  'docs/cad-user-upload-contract.md',
  'docs/cad-dev-upload-session-qualification-plan.md',
  'docs/cad-dev-upload-session-qualification-plan.json',
  'scripts/cad-dev-upload-session-qualification-plan.test.js',
  'docs/cad-dev-upload-session-qualification-executor.md',
  'docs/cad-dev-upload-session-qualification-executor.json',
  'scripts/cad-dev-upload-session-qualification-executor.js',
  'scripts/cad-dev-upload-session-qualification-executor.test.js',
  'docs/cad-dev-upload-session-qualification-bridge.md',
  'docs/cad-dev-upload-session-qualification-bridge.json',
  'convex/cadDevUploadSessionQualificationBinding.ts',
  'convex/cadDevUploadSessionQualification.ts',
  'scripts/cad-dev-upload-session-qualification-bridge.test.js',
  'docs/cad-dev-upload-session-qualification-rebind.md',
  'docs/cad-dev-upload-session-qualification-rebind.json',
  'scripts/cad-dev-upload-session-qualification-rebind.test.js',
  'docs/cad-dev-upload-session-successful-closeout.md',
  'docs/cad-dev-upload-session-successful-closeout.json',
  'scripts/cad-dev-upload-session-successful-closeout.test.js',
  'docs/cad-dev-auth-session-issuer-bridge.md',
  'server/cadDevAuthSessionIssuerBridge.js',
  'scripts/cad-dev-auth-session-issuer-bridge.test.js',
  'docs/cad-dev-auth-session-issuer-route-mount.md',
  'server/cadDevAuthSessionIssuerRouter.js',
  'docs/cad-dev-browser-session-harness.md',
  'scripts/cad-dev-browser-session-harness.js',
  'scripts/cad-dev-browser-session-harness.test.js',
  'docs/cad-dev-browser-session-qualification-packet.md',
  'docs/cad-dev-browser-session-qualification-packet.json',
  'scripts/cad-dev-browser-session-qualification-packet.test.js',
  'docs/cad-dev-browser-session-runner-binding.md',
  'docs/cad-dev-browser-session-runner-binding.json',
  'scripts/cad-dev-browser-session-runner-binding.js',
  'scripts/cad-dev-browser-session-runner-binding.test.js',
  'docs/cad-dev-browser-session-https-target-binding.md',
  'docs/cad-dev-browser-session-https-target-binding.json',
  'docs/cad-dev-browser-session-local-runner.md',
  'docs/cad-dev-browser-session-local-runner.json',
  'scripts/cad-dev-browser-session-local-runner.js',
  'scripts/cad-dev-browser-session-local-runner.test.js',

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
  'scripts/cad-convex-development-assembly.test.js',
  'docs/cad-live-dev-edt-approval-packet.md',
  'docs/cad-convex-dev-dashboard-evidence-register.md',
  'docs/cad-convex-dev-dashboard-evidence-register.json',
  'scripts/cad-convex-dev-dashboard-evidence-register.test.js',
  'docs/cad-dev-ukedt-manifest-assembly.md',
  'docs/cad-dev-ukedt-manifest-assembly.json',
  'scripts/cad-dev-ukedt-manifest-assembly.test.js',
  'docs/cad-dev-readiness-autopilot.md',
  'docs/cad-dev-readiness-autopilot.json',
  'scripts/cad-dev-readiness-autopilot.test.js',
  'docs/cad-dev-retention-lockout-autopilot.md',
  'docs/cad-dev-retention-lockout-autopilot.json',
  'scripts/cad-dev-retention-lockout-autopilot.test.js',
  'docs/cad-dev-auth-source-enable-autopilot.md',
  'offline/cad-convex/developmentAuthSourceEnablement.json',
  'scripts/cad-dev-auth-source-enable-autopilot.test.js',
  'docs/cad-dev-auth-acceptance-manifest.md',
  'docs/cad-dev-auth-acceptance-manifest.json',
  'scripts/cad-dev-auth-acceptance-manifest.test.js',
  'docs/cad-dev-restricted-edt-evidence-prep.md',
  'docs/cad-dev-restricted-edt-evidence-prep.json',
  'scripts/cad-dev-restricted-edt-evidence-prep.test.js',
  'docs/cad-dev-restricted-edt-acceptance-packet.md',
  'docs/cad-dev-restricted-edt-acceptance-packet.json',
  'scripts/cad-dev-restricted-edt-acceptance-packet.test.js',
  'docs/cad-dev-cost-cap-hard-stop-evidence.md',
  'docs/cad-dev-cost-cap-hard-stop-evidence.json',
  'scripts/cad-dev-cost-cap-hard-stop-evidence.test.js',
  'docs/cad-dev-cost-custody-rollback-window-evidence.md',
  'docs/cad-dev-cost-custody-rollback-window-evidence.json',
  'scripts/cad-dev-cost-custody-rollback-window-evidence.test.js',
  'docs/cad-dev-exact-deploy-rollback-window-binding.md',
  'docs/cad-dev-exact-deploy-rollback-window-binding.json',
  'scripts/cad-dev-exact-deploy-rollback-window-binding.test.js',
  'docs/cad-dev-env-custody-rollback-receipts.md',
  'docs/cad-dev-env-custody-rollback-receipts.json',
  'scripts/cad-dev-env-custody-rollback-receipts.test.js',
  'docs/cad-dev-auth-reviewed-source-gate.md',
  'docs/cad-dev-auth-reviewed-source-gate.json',
  'scripts/cad-dev-auth-reviewed-source-gate.test.js',
  'docs/cad-dev-reviewed-source-deploy-binding.md',
  'docs/cad-dev-reviewed-source-deploy-binding.json',
  'scripts/cad-dev-reviewed-source-deploy-binding.test.js',
  'docs/cad-dev-deploy-command-target-correction.md',
  'docs/cad-dev-deploy-command-target-correction.json',
  'scripts/cad-dev-deploy-command-target-correction.test.js',
  'docs/cad-dev-once-push-evidence-codegen.md',
  'docs/cad-dev-once-push-evidence-codegen.json',
  'scripts/cad-dev-once-push-evidence-codegen.test.js',
  'docs/cad-dev-auth-session-qualification-bridge.md',
  'docs/cad-dev-auth-session-qualification-bridge.json',
  'convex/cadDevAuthQualificationBinding.ts',
  'convex/cadDevAuthQualification.ts',
  'convex/cadDevAuthQualificationStore.ts',
  'scripts/cad-dev-auth-session-qualification-runner.js',
  'scripts/cad-dev-auth-session-qualification-bridge.test.js',
  'docs/cad-dev-auth-session-qualification-rebind.md',
  'docs/cad-dev-auth-session-qualification-rebind.json',
  'docs/cad-dev-auth-session-immediate-rebind.md',
  'docs/cad-dev-auth-session-immediate-rebind.json',
  'scripts/cad-dev-auth-session-qualification-rebind.test.js',
  'docs/cad-dev-auth-session-run-closeout.md',
  'docs/cad-dev-auth-session-run-closeout.json',
  'scripts/cad-dev-auth-session-run-closeout.test.js',
  'offline/cad-convex/configurationQualification.js',
  'offline/cad-convex/configurationQualification.json',
  'scripts/cad-convex-configuration-qualification.test.js',
  'docs/cad-live-dev-convex-auth-qualification.md',
  'offline/cad-convex/devWiring.js', 'offline/cad-convex/devWiring.json',
  'scripts/cad-convex-dev-wiring.test.js', 'docs/cad-dev-convex-auth-wiring-review.md',
  'offline/cad-convex/liveReadiness.js', 'offline/cad-convex/liveReadiness.json',
  'scripts/cad-convex-live-readiness.js', 'scripts/cad-convex-live-readiness.test.js',
  'docs/cad-convex-live-auth-readiness.md', 'offline/cad-convex/passwordPolicy.ts', 'scripts/cad-convex-password-boundary.test.js',
  'docs/cad-convex-password-auth-boundary.md', 'docs/cad-convex-live-wiring-packet.md', 'docs/cad-live-convex-auth-setup-packet.md', 'convex/auth.ts', 'convex/auth.config.ts', 'convex/http.ts',
  'convex/cadUploadSessionGateway.ts',
  'offline/cad-convex/librarySessionHarness.js', 'scripts/cad-convex-auth-assembly.test.js',
  'docs/cad-convex-auth-assembly-review.md',
  'docs/cad-convex-http-gateway-scaffold.md',
  'docs/cad-convex-http-gateway-scaffold.json',
  'scripts/cad-convex-http-gateway-scaffold.test.js',
  'docs/cad-convex-gateway-principal-boundary.md',
  'docs/cad-convex-gateway-principal-boundary.json',
  'scripts/cad-convex-gateway-principal-boundary.test.js',
  'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js',
  'docs/cad-gateway-exact-session-bridge.md',
  'docs/cad-gateway-exact-session-bridge.json',
  'scripts/cad-gateway-exact-session-bridge.test.js',
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
assert.match(read('convex/developmentAuth.ts'), /developmentAuthReviewed: boolean = true/);
assert.match(read('convex/developmentAuth.ts'), /return developmentAuthReviewed \? developmentCohort : \[\]/);
assert.match(read('convex/auth.ts'), /developmentPassword\(developmentPasswordCohort\(\)\)/);
assert.ok(!/fetch\s*\(|process\.env/.test(read('offline/cad-convex/developmentService.js')));
const httpGatewayScaffold = JSON.parse(read('docs/cad-convex-http-gateway-scaffold.json'));
assert.equal(httpGatewayScaffold.status, 'IMPLEMENTED_FAIL_CLOSED_PENDING_ENV_AND_DISPATCH_GATE');
assert.equal(httpGatewayScaffold.runtimeBehavior.dispatchEnabled, false);
assert.equal(httpGatewayScaffold.runtimeBehavior.requestBodyReadBeforeServiceAuth, false);
assert.equal(httpGatewayScaffold.guardrails.requestBodyAdmissionAllowed, false);
assert.equal(httpGatewayScaffold.envManifest.secretValuesStoredByThisGate, false);
assert.equal(httpGatewayScaffold.nextGate.principalBoundaryPacket, 'docs/cad-convex-gateway-principal-boundary.json');
const principalBoundary = JSON.parse(read('docs/cad-convex-gateway-principal-boundary.json'));
assert.equal(principalBoundary.status, 'SOURCE_BOUNDARY_READY_DISPATCH_BLOCKED');
assert.equal(principalBoundary.currentRuntimeBehavior.serviceEnvelopeDispatchImplemented, false);
assert.equal(principalBoundary.currentRuntimeBehavior.livePrincipalDerivationImplemented, false);
assert.equal(principalBoundary.currentRuntimeBehavior.uploadSessionIssuanceEnabled, false);
assert.equal(principalBoundary.boundaryDecision.serviceTokenIsNotUserPrincipal, true);
assert.equal(principalBoundary.boundaryDecision.payloadPrincipalOverrideAllowed, false);
assert.equal(principalBoundary.nextGate.requiredBeforeLiveDispatch, true);
assert.equal(principalBoundary.nextGate.sourceOnlyBridgePacket, 'docs/cad-gateway-exact-session-bridge.json');
assert.equal(principalBoundary.guardrails.productionUploadActivationAllowed, false);
assert.match(read('docs/cad-convex-gateway-principal-boundary.md'), /live dispatch remains blocked/i);
const currentOpeningReview = require('./cad-internal-admission-current-commit-rebind-checker').checkRebind(
  JSON.parse(read('docs/cad-internal-admission-current-commit-rebind.json')),
  { expectedCommit: '046ff00368caa98f13c9a105fa30ec7036bdc57f', root });
assert.equal(currentOpeningReview.ok, true, currentOpeningReview.problems.join('; '));
const exactSessionBridge = JSON.parse(read('docs/cad-gateway-exact-session-bridge.json'));
assert.equal(exactSessionBridge.status, 'IMPLEMENTED_SOURCE_ONLY_INJECTION_DEFAULT_CLOSED');
assert.equal(exactSessionBridge.runtimeBehavior.defaultGatewayIssuanceEnabled, false);
assert.equal(exactSessionBridge.runtimeBehavior.envCanSelectBridge, false);
assert.equal(exactSessionBridge.runtimeBehavior.productionIssuerBoundByThisGate, false);
assert.equal(exactSessionBridge.bridgeDesign.acceptsCallerPrincipal, false);
assert.equal(exactSessionBridge.bridgeDesign.acceptsRequestBody, false);
assert.equal(exactSessionBridge.guardrails.providerEnvResourceBillingChangesAllowed, false);
assert.match(read('server/cadExactSessionBridge.js'), /FORBIDDEN_CONTEXT_KEYS/);
assert.match(read('server/cadExactSessionBridge.js'), /never selected from environment/);
assert.match(read('server/cadUploadSessionGatewayService.js'), /exactSessionBridge: bridgeConfigured \? 'source-only-injected' : 'absent'/);
assert.match(read('server/cadUploadSessionGatewayService.js'), /resolveAuthorization: bridgeConfigured/);
const httpGatewaySource = read('convex/cadUploadSessionGateway.ts');
assert.match(httpGatewaySource, /CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN_SHA256/);
assert.match(httpGatewaySource, /crypto\.subtle\.digest/);
assert.match(httpGatewaySource, /FORBIDDEN_PAYLOAD_KEYS/);
assert.ok(!/ctx\.run(Query|Mutation|Action)|internal\./.test(httpGatewaySource));
assert.ok(!/process\.env|fetch\s*\(|node:fs|node:http|node:https|convex\/browser/.test(httpGatewaySource));
assert.match(read('convex/http.ts'), /CAD_UPLOAD_SESSION_GATEWAY_PATH/);
const costCustodyWindow = JSON.parse(read('docs/cad-dev-cost-custody-rollback-window-evidence.json'));
assert.equal(costCustodyWindow.convexSpendingDecision.teamSpendingDisableThresholdUsdPerMonth, 50);
assert.equal(costCustodyWindow.custodyDecision.backupCustodian, 'Amina');
assert.equal(costCustodyWindow.fastFollowCostLedger.requiredBeforeFeePerRunDecision, true);
assert.equal(costCustodyWindow.deploymentCommandReview.exactCommandsExecutableNow, false);
assert.equal(costCustodyWindow.freshRunWindow.acceptedNow, false);
for (const value of Object.values(costCustodyWindow.authorityPreserved)) assert.equal(value, false);
const exactDeployBinding = JSON.parse(read('docs/cad-dev-exact-deploy-rollback-window-binding.json'));
assert.equal(exactDeployBinding.resolvedDecisionInputs.convexTeamSpendingDisableThresholdUsdPerMonth, 50);
assert.equal(exactDeployBinding.resolvedDecisionInputs.backupCustodian, 'Amina');
assert.equal(exactDeployBinding.exactCommandBinding.digestKind, 'exact-command-digest');
assert.equal(exactDeployBinding.exactCommandBinding.deployCommand.authorityNow, false);
assert.equal(exactDeployBinding.exactCommandBinding.disabledRollbackCommand.authorityNow, false);
assert.equal(exactDeployBinding.exactCommandBinding.executableAuthorityNow, false);
assert.equal(exactDeployBinding.freshWindowProposal.acceptedNow, false);
assert.equal(exactDeployBinding.freshWindowProposal.liveRunAuthorizedNow, false);
for (const value of Object.values(exactDeployBinding.authorityPreserved)) assert.equal(value, false);
const envCustodyRollback = JSON.parse(read('docs/cad-dev-env-custody-rollback-receipts.json'));
assert.equal(envCustodyRollback.ignoredLocalReceipt.containsSecretValues, false);
assert.equal(envCustodyRollback.ignoredLocalReceipt.containsValueHashes, false);
assert.equal(envCustodyRollback.custodyProjection.backupCustodian, 'Amina');
assert.equal(envCustodyRollback.envFileCustodyProjection.valueRead, false);
assert.equal(envCustodyRollback.envFileCustodyProjection.mutationAuthorizedNow, false);
assert.deepEqual(envCustodyRollback.rowRollbackProjection.map(row => row.name), ['JWKS', 'JWT_PRIVATE_KEY', 'SITE_URL']);
assert.ok(envCustodyRollback.rowRollbackProjection.every(row => row.valueRead === false && row.valueHashRecorded === false
  && row.mutationAuthorizedNow === false));
assert.equal(envCustodyRollback.acceptanceEffect.developmentAuthReviewedSourceGateStillFalse, true);
assert.equal(envCustodyRollback.autopilotDecision.developmentEnvMutationMustStop, true);
for (const value of Object.values(envCustodyRollback.authorityPreserved)) assert.equal(value, false);
const reviewedSourceGate = JSON.parse(read('docs/cad-dev-auth-reviewed-source-gate.json'));
assert.equal(reviewedSourceGate.reviewedSourceGate.developmentAuthReviewed, true);
assert.deepEqual(reviewedSourceGate.reviewedSourceGate.syntheticCohort, [
  'cad-test-alpha-20260915@auth-test.invalid',
  'cad-test-beta-20260915@auth-test.invalid',
]);
assert.equal(reviewedSourceGate.reviewedSourceGate.realUsersAuthorized, false);
assert.equal(reviewedSourceGate.safetyProperties.cadUploadsRemainDisabled, true);
assert.equal(reviewedSourceGate.safetyProperties.cadConversionRemainDisabled, true);
assert.equal(reviewedSourceGate.commandBindingEffect.exactDeployCommandMustBeReboundAfterMerge, true);
assert.equal(reviewedSourceGate.commandBindingEffect.deploymentAuthorityNow, false);
assert.equal(reviewedSourceGate.commandBindingEffect.rollbackAuthorityNow, false);
assert.equal(reviewedSourceGate.nextSafeAction.branch, 'codex/cad-dev-reviewed-source-deploy-binding');
for (const value of Object.values(reviewedSourceGate.authorityPreserved)) assert.equal(value, false);
const reviewedSourceDeployBinding = JSON.parse(read('docs/cad-dev-reviewed-source-deploy-binding.json'));
assert.equal(reviewedSourceDeployBinding.runtimeSourceState.candidateSourceSha, 'ce00edb676b3209b96c01c90dd057eed44d81113');
assert.equal(reviewedSourceDeployBinding.runtimeSourceState.developmentAuthReviewed, true);
assert.equal(reviewedSourceDeployBinding.runtimeSourceState.cadUploadsRemainDisabled, true);
assert.equal(reviewedSourceDeployBinding.runtimeSourceState.cadConversionRemainDisabled, true);
assert.equal(reviewedSourceDeployBinding.exactCommandBinding.deployCommand.sourceSha,
  reviewedSourceDeployBinding.runtimeSourceState.candidateSourceSha);
assert.equal(reviewedSourceDeployBinding.exactCommandBinding.deployCommand.authorityNow, false);
assert.equal(reviewedSourceDeployBinding.exactCommandBinding.disabledRollbackCommand.authorityNow, false);
assert.equal(reviewedSourceDeployBinding.exactCommandBinding.executableAuthorityNow, false);
assert.equal(reviewedSourceDeployBinding.freshWindowProposal.acceptedNow, false);
assert.equal(reviewedSourceDeployBinding.autopilotDecision.developmentDeploymentExecutionMayContinueAfterMerge, true);
const devDeployCommandCorrection = JSON.parse(read('docs/cad-dev-deploy-command-target-correction.json'));
assert.equal(devDeployCommandCorrection.blockedReviewedCommandEvidence.outcome, 'PROMPT_BLOCKED_NO_DEPLOYMENT');
assert.equal(devDeployCommandCorrection.blockedReviewedCommandEvidence.productionMutationObserved, false);
assert.match(devDeployCommandCorrection.correctedDevelopmentCommand.command, /^npx --no-install convex dev --once /);
assert.doesNotMatch(devDeployCommandCorrection.correctedDevelopmentCommand.command, /\bdeploy\b/);
assert.equal(devDeployCommandCorrection.correctedDevelopmentCommand.commandMayExecuteAfterMerge, true);
assert.equal(devDeployCommandCorrection.correctedDevelopmentCommand.backendRowsMutatedByCommand, false);
for (const value of Object.values(devDeployCommandCorrection.authorityPreserved)) assert.equal(value, false);
const devOncePushEvidence = JSON.parse(read('docs/cad-dev-once-push-evidence-codegen.json'));
assert.equal(devOncePushEvidence.executedDevelopmentPush.exitCode, 0);
assert.equal(devOncePushEvidence.executedDevelopmentPush.observedDeploymentType, 'Development');
assert.equal(devOncePushEvidence.executedDevelopmentPush.liveRunExecuted, false);
assert.deepEqual(devOncePushEvidence.readOnlyVerification.backendEnvNamesOnly, ['JWKS', 'JWT_PRIVATE_KEY', 'SITE_URL']);
assert.equal(devOncePushEvidence.readOnlyVerification.backendEnvValuesRead, false);
assert.equal(devOncePushEvidence.readOnlyVerification.functionSpec.totalFunctions, 21);
assert.equal(devOncePushEvidence.readOnlyVerification.httpDiscovery.jwksPrivateFieldsObserved, false);
assert.equal(devOncePushEvidence.codegenAlignment.runtimeSourceChanged, false);
for (const value of Object.values(devOncePushEvidence.authorityPreserved)) assert.equal(value, false);
const devAuthSessionBridge = JSON.parse(read('docs/cad-dev-auth-session-qualification-bridge.json'));
assert.equal(devAuthSessionBridge.status, 'BRIDGE_DISABLED_BY_DEFAULT');
assert.equal(devAuthSessionBridge.sourceBridge.enabledByDefault, false);
assert.equal(devAuthSessionBridge.sourceBridge.deleteUsersOrAccounts, false);
assert.equal(devAuthSessionBridge.sourceBridge.retainUsersAndAccounts, true);
const devAuthSessionRebind = JSON.parse(read('docs/cad-dev-auth-session-immediate-rebind.json'));
assert.equal(devAuthSessionRebind.status, 'REBIND_READY_FOR_ONE_DEVELOPMENT_WINDOW_NO_RUN_EXECUTED');
assert.equal(devAuthSessionRebind.authorityPreserved.liveRunExecutedByThisPacket, false);
const devAuthSessionCloseout = JSON.parse(read('docs/cad-dev-auth-session-run-closeout.json'));
assert.equal(devAuthSessionCloseout.status, 'DEVELOPMENT_AUTH_SESSION_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT');
assert.equal(devAuthSessionCloseout.runResult.runCompleted, true);
assert.equal(devAuthSessionCloseout.runResult.unknownOutcome, false);
assert.equal(devAuthSessionCloseout.acceptedEvidence.projectionSha256, devAuthSessionRebind.acceptedProjectionSha256);
assert.equal(devAuthSessionCloseout.acceptedEvidence.runKeySha256, devAuthSessionRebind.runKeySha256);
assert.equal(devAuthSessionCloseout.postRunBindingDisposition.bindingDisabled, true);
assert.match(read('convex/cadDevAuthQualificationBinding.ts'), /enabled: false/);
assert.match(read('convex/cadDevAuthQualificationBinding.ts'), /mode: 'cad-dev-auth-session-disabled-post-run-closeout'/);
assert.match(read('convex/cadDevAuthQualificationBinding.ts'), /runKeySha256: null/);
assert.match(read('convex/cadDevAuthQualificationBinding.ts'), /acceptedProjectionSha256: null/);
assert.match(read('convex/cadDevAuthQualificationBinding.ts'), /acceptanceReceiptSha256: null/);
assert.match(read('convex/cadDevAuthQualification.ts'), /createAccount/);
assert.match(read('convex/cadDevAuthQualification.ts'), /invalidateSessions/);
assert.ok(!/ctx\.db\.delete/.test(read('convex/cadDevAuthQualification.ts')));
assert.match(read('convex/cadDevAuthQualificationStore.ts'), /getAuthSessionId\(ctx\)/);
assert.match(read('scripts/cad-dev-auth-session-qualification-runner.js'), /REGISTER_PATH_INVALID/);
const devUploadSessionPlan = JSON.parse(read('docs/cad-dev-upload-session-qualification-plan.json'));
assert.equal(devUploadSessionPlan.status, 'SOURCE_ONLY_UPLOAD_SESSION_QUALIFICATION_PLAN_READY');
assert.equal(devUploadSessionPlan.dependsOn.authSessionCloseout.status, devAuthSessionCloseout.status);
assert.equal(devUploadSessionPlan.dependsOn.disabledRouteContract.bodyAdmissionAuthorized, false);
assert.equal(devUploadSessionPlan.nextExecutableSlice.liveRunAuthorizedByThisPacket, false);
const browserSessionRunnerBinding = JSON.parse(read('docs/cad-dev-browser-session-runner-binding.json'));
assert.equal(browserSessionRunnerBinding.status, 'SOURCE_READY_RUN_BLOCKED_PENDING_ACCEPTED_BINDING');
assert.equal(browserSessionRunnerBinding.runner.executableAuthorityNow, false);
assert.equal(browserSessionRunnerBinding.runner.startsServer, false);
assert.equal(browserSessionRunnerBinding.runner.opensBrowser, false);
assert.equal(browserSessionRunnerBinding.runner.sendsNetworkRequest, false);
for (const value of Object.values(browserSessionRunnerBinding.authority)) assert.equal(value, false);
const browserSessionHttpsTargetBinding = JSON.parse(read('docs/cad-dev-browser-session-https-target-binding.json'));
assert.equal(browserSessionHttpsTargetBinding.status, 'SOURCE_READY_LOCAL_HTTPS_TARGET_BINDING_ALLOWED');
assert.equal(browserSessionHttpsTargetBinding.targetDecision.localLoopbackHttps, true);
assert.equal(browserSessionHttpsTargetBinding.targetDecision.productionHttps, false);
assert.equal(browserSessionHttpsTargetBinding.validator.liveRunAuthorized, false);
assert.equal(browserSessionHttpsTargetBinding.validator.startsServer, false);
assert.equal(browserSessionHttpsTargetBinding.validator.opensBrowser, false);
assert.equal(browserSessionHttpsTargetBinding.validator.sendsNetworkRequest, false);
for (const value of Object.values(browserSessionHttpsTargetBinding.authority)) assert.equal(value, false);
const browserSessionLocalRunner = JSON.parse(read('docs/cad-dev-browser-session-local-runner.json'));
assert.equal(browserSessionLocalRunner.status, 'SOURCE_READY_LOCAL_BROWSER_EXECUTOR_REVIEWED_NO_RUN');
assert.equal(browserSessionLocalRunner.runner.requiresLocalLoopbackHttpsBinding, true);
assert.equal(browserSessionLocalRunner.runner.executableImplemented, true);
assert.equal(browserSessionLocalRunner.runner.executableAuthorityNow, false);
assert.equal(browserSessionLocalRunner.runner.acceptsExecuteFlagNow, false);
assert.equal(browserSessionLocalRunner.runner.startsServerOnlyAfterExactFutureApproval, true);
assert.equal(browserSessionLocalRunner.runner.opensBrowserOnlyAfterExactFutureApproval, true);
assert.equal(browserSessionLocalRunner.runner.sendsNetworkRequestOnlyToRunOwnedLoopbackAfterExactFutureApproval, true);
assert.equal(browserSessionLocalRunner.runner.generatesTlsMaterial, false);
assert.equal(browserSessionLocalRunner.runner.readsSecrets, false);
assert.equal(browserSessionLocalRunner.runner.writesSecrets, false);
assert.equal(browserSessionLocalRunner.planGuards.requestBodyBytes, 0);
assert.equal(browserSessionLocalRunner.planGuards.bodyReads, 0);
assert.equal(browserSessionLocalRunner.planGuards.retry, false);
assert.equal(browserSessionLocalRunner.planGuards.secondRun, false);
for (const value of Object.values(browserSessionLocalRunner.authority)) assert.equal(value, false);
assert.ok(!/fetch\s*\(|https?\.request|child_process|process\.env/.test(read('scripts/cad-dev-browser-session-runner-binding.js')));
assert.ok(!/process\.env|child_process|puppeteer/.test(read('scripts/cad-dev-browser-session-local-runner.js')));
assert.match(read('scripts/cad-dev-browser-session-local-runner.js'), /--execute-approved-once/);
assert.match(read('scripts/cad-dev-browser-session-local-runner.js'), /ACCEPTED_BINDING_SHA_MISMATCH/);
assert.match(read('scripts/cad-dev-browser-session-local-runner.js'), /DISABLED_UPLOAD_CHECK_FAILED/);
assert.match(read('scripts/cad-dev-browser-session-local-runner.js'), /USER_UPLOADS_DISABLED/);
assert.match(read('server/cadUserUploadRouter.js'), /const BODY_ADMISSION_AUTHORIZED = false/);
assert.match(read('server/cadUserUploadRouter.js'), /USER_UPLOADS_DISABLED/);
for (const value of Object.values(devUploadSessionPlan.authorityPreserved)) assert.equal(value, false);
assert.equal(reviewedSourceDeployBinding.autopilotDecision.developmentLiveAuthRunMustStop, true);
for (const value of Object.values(reviewedSourceDeployBinding.authorityPreserved)) assert.equal(value, false);
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
        assert.ok(!/durableEngineAdapter|durableEngineRunner|durableEngineQualification|cad-durable-engine-fixture|durableEvidenceBinding|durableEvidencePrerequisites|cad-durable-evidence-fixture|runnerCommandCards|cad-runner-command-cards|durableAdapter|liveRunner|cad-live-runner|liveRunApprovalPacket|liveRunApprovalEnvelope|boundedLiveRunDossier|liveAdapterRunPacket|sharedControlsAdapterQualification|cad-shared-controls-adapter-double|sharedUploadControls|disabledUploadAdmissionAdapter|cad-upload-admission-disabled-adapter|cad-upload-admission-durable-adapter-plan|uploadAdmissionDurableAdapterPlan|uploadAdmissionDurableAdapter|cad-upload-admission-durable-adapter-source|cad-upload-admission-qualification-window|uploadAdmissionQualificationWindow|uploadAdmissionGuardedRouteBridge|cad-upload-admission-guarded-route-bridge|lockoutPrivateAdapters|privateAdapterReadiness|retainedTerminalState|lockoutReadiness|boundedRetentionPolicy|removalRetentionReview|syntheticRemovalBoundary|syntheticRunRegister|verifiedSyntheticTransport|positiveSyntheticSession|positiveSyntheticLedger|cad-positive-synthetic-fixture|passwordPolicy|liveReadiness|devWiring|configurationQualification|developmentConfigurationGate|executionInputs|executionBlockers|rollbackCompatibility|rollbackBaseline|rollbackFixtures|userUploadActivationReadiness|privateRestrictedRegisterReview|restrictedEvidenceCommandCardBytes|boundedDevQualificationExecutor|cad-bounded-dev-qualification-executor/.test(read(name)), 'Offline Password policy or readiness packet referenced by runtime');
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
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./.test(read('offline/cad-convex/restrictedEvidenceCommandCardBytes.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./.test(read('offline/cad-convex/privateRestrictedRegisterReview.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./.test(read('offline/cad-convex/freshReplacementRestrictedEvidence.js')));
const freshReplacement = JSON.parse(read('docs/cad-fresh-replacement-restricted-evidence.json'));
const freshReplacementResult = require('../offline/cad-convex/freshReplacementRestrictedEvidence').inspectFreshReplacementRestrictedEvidence(freshReplacement);
assert.equal(freshReplacementResult.structureValid, true);
assert.equal(freshReplacementResult.decision, 'LIVE_RUN_BLOCKED');
assert.equal(freshReplacementResult.readyForLiveRunApproval, false);
assert.equal(freshReplacementResult.successorExecutable, false);
const successorAcceptance = JSON.parse(read('docs/cad-successor-register-provenance-acceptance.json'));
const successorProjection = JSON.parse(read('docs/cad-successor-register-provenance-projection.json'));
const successorAcceptanceResult = require('../offline/cad-convex/successorRegisterProvenanceAcceptance')
  .inspectSuccessorRegisterProvenanceAcceptance(successorAcceptance, successorProjection);
assert.equal(successorAcceptanceResult.structureValid, true);
assert.equal(successorAcceptanceResult.decision, 'LIVE_RUN_BLOCKED');
assert.equal(successorAcceptanceResult.readyForRestrictedEvidenceAcceptance, true);
assert.equal(successorAcceptanceResult.readyForLiveRunApproval, false);
assert.equal(successorAcceptance.provenanceRecovery.olderAcceptedRegisterSubstituted, false);
assert.equal(successorAcceptance.evidenceReadiness.restrictedEvidenceAcceptanceGranted, false);
assert.equal(successorAcceptance.nextHumanGates.liveRunApproval,
  'BLOCKED_UNTIL_RESTRICTED_EVIDENCE_ACCEPTED_AND_EXECUTOR_REBIND_REVIEWED');
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./.test(read('offline/cad-convex/successorRegisterProvenanceAcceptance.js')));

for (const name of ['durableAdapter.js', 'liveRunner.js', 'durableEvidenceBinding.js'])
  assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/' + name)));

for (const name of ['durableEngine.js', 'durableEngineAdapter.js', 'durableEngineRunner.js'])
  assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/' + name)));
assert.match(read('server/cadUserUploadRouter.js'), /const BODY_ADMISSION_AUTHORIZED = false;/);
const runtimeBridgeReview = JSON.parse(read('offline/cad-convex/uploadAdmissionRuntimeBridgeReview.json'));
const runtimeBridgeResult = require('../offline/cad-convex/uploadAdmissionRuntimeBridgeReview')
  .inspectUploadAdmissionRuntimeBridgeReview(runtimeBridgeReview, read('server/cadUserUploadRouter.js'));
assert.equal(runtimeBridgeResult.structureValid, true);
assert.equal(runtimeBridgeResult.currentRouteStillClosed, true);
assert.equal(runtimeBridgeResult.readyForSourceOnlyBridgeFollowUp, true);
assert.equal(runtimeBridgeResult.readyForLiveRun, false);
assert.equal(runtimeBridgeResult.readyForUploadActivation, false);
assert.equal(runtimeBridgeReview.runtimeBridgeImplementedNow, false);
assert.equal(runtimeBridgeReview.runtimeBridgeMountedNow, false);
assert.equal(runtimeBridgeReview.bodyAdmissionAuthorized, false);
assert.ok(Object.values(runtimeBridgeReview.authorityPreserved).every(value => value === false));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionRuntimeBridgeReview.js')));
const runtimeBridgeSource = JSON.parse(read('offline/cad-convex/uploadAdmissionRuntimeBridgeSource.json'));
const { createCadUploadAdmissionRuntimeBridge } = require('../server/cadUploadAdmissionRuntimeBridge');
const runtimeBridge = createCadUploadAdmissionRuntimeBridge();
assert.equal(runtimeBridgeSource.mode, 'source-only-cad-upload-admission-runtime-bridge-source');
assert.equal(runtimeBridgeSource.runtimeBridgeSourceImplemented, true);
assert.equal(runtimeBridgeSource.runtimeBridgeMountedNow, false);
assert.equal(runtimeBridgeSource.enabledByDefault, false);
assert.equal(runtimeBridgeSource.bodyAdmissionAuthorized, false);
assert.ok(Object.values(runtimeBridgeSource.authorityPreserved).every(value => value === false));
assert.equal(runtimeBridge.sourceOnly, true);
assert.equal(runtimeBridge.runtimeMounted, false);
assert.equal(runtimeBridge.bodyAdmissionAuthorized, false);
assert.ok(!/cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('server/cadUploadAdmissionRuntimeBridge.js')));
const dryRunPlan = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.json'));
assert.equal(dryRunPlan.mode, 'source-only-cad-upload-admission-development-dry-run-plan');
assert.equal(dryRunPlan.syntheticDryRun.acceptedNow, false);
assert.equal(dryRunPlan.syntheticDryRun.liveRunAuthorizedNow, false);
assert.equal(dryRunPlan.syntheticDryRun.developmentStoreMutationAuthorizedNow, false);
assert.equal(dryRunPlan.syntheticDryRun.bodyAdmissionAuthorized, false);
assert.equal(dryRunPlan.costAndUsage.allInPlanningCapUsd, 50);
assert.equal(dryRunPlan.rollbackAndCustody.deleteRetainedState, false);
assert.equal(dryRunPlan.rollbackAndCustody.backupCustodian, 'Amina');
assert.ok(Object.values(dryRunPlan.authorityPreserved).every(value => value === false));
assert.ok(!/uploadAdmissionDevelopmentDryRunPlan|cad-upload-admission-development-dry-run-plan/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.js')));
const dryRunExecutor = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor.json'));
assert.equal(dryRunExecutor.mode, 'source-only-cad-upload-admission-development-dry-run-executor');
assert.equal(dryRunExecutor.executorCapabilities.sourceOnlyPreview, true);
assert.equal(dryRunExecutor.executorCapabilities.liveDevelopmentRun, false);
assert.equal(dryRunExecutor.executorCapabilities.developmentStoreMutationAuthorizedNow, false);
assert.equal(dryRunExecutor.executorCapabilities.bodyAdmissionAuthorized, false);
assert.equal(dryRunExecutor.runGuards.maxAttempts, 1);
assert.equal(dryRunExecutor.runGuards.automaticRetry, false);
assert.equal(dryRunExecutor.runGuards.secondRun, false);
assert.equal(dryRunExecutor.runGuards.allInPlanningCapUsd, 50);
assert.ok(Object.values(dryRunExecutor.authorityPreserved).every(value => value === false));
assert.ok(!/uploadAdmissionDevelopmentDryRunExecutor|cad-upload-admission-development-dry-run-executor/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor.js')));
const dryRunAcceptance = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentDryRunAcceptance.json'));
assert.equal(dryRunAcceptance.mode, 'source-only-cad-upload-admission-development-dry-run-acceptance');
assert.equal(dryRunAcceptance.acceptedExecutorPreview, true);
assert.equal(dryRunAcceptance.acceptedWindow.startUtc, '2026-09-16T04:15:00Z');
assert.equal(dryRunAcceptance.acceptedWindow.expiresUtc, '2026-09-16T04:30:00Z');
assert.equal(dryRunAcceptance.acceptedWindow.scheduleIfMoreThanFiveMinutesAway, true);
assert.equal(dryRunAcceptance.runBounds.maxAttempts, 1);
assert.equal(dryRunAcceptance.runBounds.automaticRetry, false);
assert.equal(dryRunAcceptance.runBounds.secondRun, false);
assert.equal(dryRunAcceptance.runBounds.allInPlanningCapUsd, 50);
assert.equal(dryRunAcceptance.authorityPreservedByThisPacket.liveDevelopmentRunAuthorizedNow, false);
assert.ok(Object.values(dryRunAcceptance.authorityPreservedByThisPacket).every(value => value === false));
assert.ok(!/uploadAdmissionDevelopmentDryRunAcceptance|cad-upload-admission-development-dry-run-acceptance/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionDevelopmentDryRunAcceptance.js')));
const bodyAdmissionPacket = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json'));
const activationCloseout = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout.json'));
const qualificationCloseout = JSON.parse(read('offline/cad-convex/uploadAdmissionQualificationCloseout.json'));
const bodyAdmissionPacketResult = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket')
  .inspectUploadAdmissionDevelopmentBodyAdmissionPacket(bodyAdmissionPacket, activationCloseout, qualificationCloseout);
assert.equal(bodyAdmissionPacketResult.readyForExecutorSourceSlice, true);
assert.equal(bodyAdmissionPacketResult.liveRunAuthorizedByThisPacket, false);
assert.ok(Object.values(bodyAdmissionPacket.authorityPreserved).every(value => value === false));
assert.ok(!/uploadAdmissionDevelopmentBodyAdmissionPacket|cad-upload-admission-development-body-admission-packet/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.js')));
const bodyAdmissionExecutor = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.json'));
const bodyAdmissionExecutorResult =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor')
    .inspectUploadAdmissionDevelopmentBodyAdmissionExecutor(
      bodyAdmissionExecutor,
      bodyAdmissionPacket,
      activationCloseout,
      qualificationCloseout,
    );
assert.equal(bodyAdmissionExecutorResult.readyForSourceMerge, true);
assert.equal(bodyAdmissionExecutorResult.readyForLiveRun, false);
assert.equal(bodyAdmissionExecutor.acceptedWindow, null);
assert.equal(bodyAdmissionExecutor.executorCapabilities.bodyReadAuthorizedByThisPacket, false);
assert.equal(bodyAdmissionExecutor.executorCapabilities.productionBodyAdmissionAuthorized, false);
assert.equal(bodyAdmissionExecutor.runPrerequisites.maxAttempts, 1);
assert.equal(bodyAdmissionExecutor.runPrerequisites.automaticRetry, false);
assert.equal(bodyAdmissionExecutor.runPrerequisites.secondRun, false);
assert.ok(Object.values(bodyAdmissionExecutor.authorityPreserved).every(value => value === false));
assert.ok(!/uploadAdmissionDevelopmentBodyAdmissionExecutor|cad-upload-admission-development-body-admission-executor/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.js')));
const bodyAdmissionWindow = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow.json'));
const bodyAdmissionWindowResult =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow')
    .inspectUploadAdmissionDevelopmentBodyAdmissionWindow(
      bodyAdmissionWindow,
      bodyAdmissionExecutor,
      bodyAdmissionPacket,
    );
assert.equal(bodyAdmissionWindowResult.readyForAutopilotDevelopmentBodyAdmissionRun, true);
assert.equal(bodyAdmissionWindowResult.liveDevelopmentRunAuthorizedByThisPacket, false);
assert.equal(bodyAdmissionWindow.acceptedWindow.startUtc, '2026-09-16T16:30:00Z');
assert.equal(bodyAdmissionWindow.acceptedWindow.expiresUtc, '2026-09-16T16:45:00Z');
assert.equal(bodyAdmissionWindow.acceptedWindow.scheduleIfMoreThanFiveMinutesAway, true);
assert.equal(bodyAdmissionWindow.runBounds.maxAttempts, 1);
assert.equal(bodyAdmissionWindow.runBounds.automaticRetry, false);
assert.equal(bodyAdmissionWindow.runBounds.secondRun, false);
assert.equal(bodyAdmissionWindow.runBounds.mountedProductionBodyAdmissionAuthorized, false);
assert.equal(bodyAdmissionWindow.runBounds.productionUploadActivationAuthorized, false);
assert.ok(Object.values(bodyAdmissionWindow.authorityPreservedByThisPacket).every(value => value === false));
assert.ok(!/uploadAdmissionDevelopmentBodyAdmissionWindow|cad-upload-admission-development-body-admission-window/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|https?\.request|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow.js')
    + read('scripts/run-cad-upload-admission-development-body-admission-window.js')));
const bodyAdmissionCloseout = JSON.parse(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout.json'));
const bodyAdmissionCloseoutResult =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout')
    .inspectUploadAdmissionDevelopmentBodyAdmissionCloseout(bodyAdmissionCloseout);
assert.equal(bodyAdmissionCloseoutResult.structureValid, true);
assert.equal(bodyAdmissionCloseoutResult.uploadActivationAuthorized, false);
assert.equal(bodyAdmissionCloseoutResult.productionBodyAdmissionAuthorized, false);
assert.equal(bodyAdmissionCloseoutResult.conversionAuthorized, false);
assert.equal(bodyAdmissionCloseoutResult.sandboxDispatchAuthorized, false);
assert.equal(bodyAdmissionCloseoutResult.privateCadAuthorized, false);
assert.equal(bodyAdmissionCloseout.operationCounts.uploadBodiesRead, 1);
assert.equal(bodyAdmissionCloseout.operationCounts.storeMutations, 0);
assert.ok(Object.values(bodyAdmissionCloseout.authorityPreserved).every(value => value === false));
assert.ok(!/uploadAdmissionDevelopmentBodyAdmissionCloseout|cad-upload-admission-development-body-admission-closeout/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout.js')));
const mountedDevelopmentReadiness = JSON.parse(read('offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json'));
const mountedDevelopmentReadinessResult =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness')
    .inspectUploadAdmissionMountedDevelopmentReadiness(mountedDevelopmentReadiness, bodyAdmissionCloseout);
assert.equal(mountedDevelopmentReadinessResult.readyForExactWindowSourcePacket, true);
assert.equal(mountedDevelopmentReadinessResult.liveRunAuthorizedByThisPacket, false);
assert.equal(mountedDevelopmentReadinessResult.uploadActivationAuthorizedByThisPacket, false);
assert.equal(mountedDevelopmentReadinessResult.conversionAuthorized, false);
assert.equal(mountedDevelopmentReadinessResult.sandboxDispatchAuthorized, false);
assert.equal(mountedDevelopmentReadinessResult.privateCadAuthorized, false);
assert.equal(mountedDevelopmentReadiness.mountedRouteGate.requiredDisabledLiteral,
  'const BODY_ADMISSION_AUTHORIZED = false;');
assert.equal(mountedDevelopmentReadiness.readinessForFutureMountedDevelopmentRun.maxAttempts, 1);
assert.equal(mountedDevelopmentReadiness.readinessForFutureMountedDevelopmentRun.allInPlanningCapUsd, 50);
assert.ok(Object.values(mountedDevelopmentReadiness.authorityPreserved).every(value => value === false));
assert.ok(!/uploadAdmissionMountedDevelopmentReadiness|cad-upload-admission-mounted-development-readiness/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.js')));
const mountedDevelopmentWindow = JSON.parse(read('offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.json'));
const mountedDevelopmentWindowResult =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentWindow')
    .inspectUploadAdmissionMountedDevelopmentWindow(mountedDevelopmentWindow, mountedDevelopmentReadiness);
assert.equal(mountedDevelopmentWindowResult.readyForAutopilotMountedDevelopmentWindow, true);
assert.equal(mountedDevelopmentWindowResult.liveDevelopmentRunAuthorizedByThisPacket, false);
assert.equal(mountedDevelopmentWindow.acceptedWindow.startUtc, '2026-09-16T18:00:00Z');
assert.equal(mountedDevelopmentWindow.acceptedWindow.expiresUtc, '2026-09-16T18:15:00Z');
assert.equal(mountedDevelopmentWindow.routeGate.requiredDisabledLiteral,
  'const BODY_ADMISSION_AUTHORIZED = false;');
assert.equal(mountedDevelopmentWindow.runBounds.maxAttempts, 1);
assert.equal(mountedDevelopmentWindow.runBounds.allInPlanningCapUsd, 50);
assert.equal(mountedDevelopmentWindow.runBounds.productionUploadActivationAuthorized, false);
assert.equal(mountedDevelopmentWindow.runBounds.cadConversionAuthorized, false);
assert.equal(mountedDevelopmentWindow.runBounds.sandboxDispatchAuthorized, false);
assert.ok(Object.values(mountedDevelopmentWindow.authorityPreservedByThisPacket).every(value => value === false));
assert.ok(!/uploadAdmissionMountedDevelopmentWindow|cad-upload-admission-mounted-development-window/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.js')));
const mountedDevelopmentExecutorBridge =
  JSON.parse(read('offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge.json'));
const mountedDevelopmentExecutorBridgeResult =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge')
    .inspectUploadAdmissionMountedDevelopmentExecutorBridge(
      mountedDevelopmentExecutorBridge,
      mountedDevelopmentWindow,
      mountedDevelopmentReadiness,
    );
assert.equal(mountedDevelopmentExecutorBridgeResult.readyForMountedDevelopmentRun, true);
assert.equal(mountedDevelopmentExecutorBridgeResult.liveRunAuthorizedByThisPacket, false);
assert.equal(mountedDevelopmentExecutorBridge.acceptedWindow.startUtc, '2026-09-16T18:00:00Z');
assert.equal(mountedDevelopmentExecutorBridge.acceptedWindow.expiresUtc, '2026-09-16T18:15:00Z');
assert.equal(mountedDevelopmentExecutorBridge.executorCapabilities.trackedRouteModified, false);
assert.equal(mountedDevelopmentExecutorBridge.runBounds.maxAttempts, 1);
assert.equal(mountedDevelopmentExecutorBridge.runBounds.productionUploadActivationAuthorized, false);
assert.equal(mountedDevelopmentExecutorBridge.runBounds.cadConversionAuthorized, false);
assert.equal(mountedDevelopmentExecutorBridge.runBounds.sandboxDispatchAuthorized, false);
assert.ok(Object.values(mountedDevelopmentExecutorBridge.authorityPreservedByThisPacket)
  .every(value => value === false));
assert.ok(!/uploadAdmissionMountedDevelopmentExecutorBridge|run-cad-upload-admission-mounted-development-window/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|https?\.request|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge.js')
    + read('scripts/run-cad-upload-admission-mounted-development-window.js')));
const mountedDevelopmentCloseout =
  JSON.parse(read('offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json'));
const mountedDevelopmentCloseoutResult =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout')
    .inspectUploadAdmissionMountedDevelopmentCloseout(mountedDevelopmentCloseout);
assert.equal(mountedDevelopmentCloseoutResult.structureValid, true);
assert.equal(mountedDevelopmentCloseoutResult.uploadActivationAuthorized, false);
assert.equal(mountedDevelopmentCloseoutResult.productionBodyAdmissionAuthorized, false);
assert.equal(mountedDevelopmentCloseoutResult.conversionAuthorized, false);
assert.equal(mountedDevelopmentCloseoutResult.sandboxDispatchAuthorized, false);
assert.equal(mountedDevelopmentCloseout.sanitizedRunEvidence.evidenceSha256,
  'a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75');
assert.ok(Object.values(mountedDevelopmentCloseout.authorityPreserved)
  .every(value => value === false));
assert.ok(!/uploadAdmissionMountedDevelopmentCloseout|cad-upload-admission-mounted-development-closeout/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.js')));
const uploadActivationDecisionRefresh =
  JSON.parse(read('offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json'));
const uploadActivationDecisionRefreshResult =
  require('../offline/cad-convex/uploadAdmissionActivationDecisionRefresh')
    .inspectUploadAdmissionActivationDecisionRefresh(uploadActivationDecisionRefresh);
assert.equal(uploadActivationDecisionRefreshResult.structureValid, true);
assert.equal(uploadActivationDecisionRefreshResult.liveRunAuthorized, false);
assert.equal(uploadActivationDecisionRefreshResult.productionUploadActivationAuthorized, false);
assert.equal(uploadActivationDecisionRefreshResult.conversionAuthorized, false);
assert.equal(uploadActivationDecisionRefreshResult.sandboxDispatchAuthorized, false);
assert.equal(uploadActivationDecisionRefresh.acceptedMountedDevelopmentCloseout.evidenceSha256,
  'a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75');
assert.ok(Object.values(uploadActivationDecisionRefresh.authorityPreserved)
  .every(value => value === false));
assert.ok(!/uploadAdmissionActivationDecisionRefresh|cad-upload-admission-activation-decision-refresh/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionActivationDecisionRefresh.js')));
const uploadActivationExactWindow =
  JSON.parse(read('offline/cad-convex/uploadAdmissionActivationExactWindow.json'));
const uploadActivationExactWindowResult =
  require('../offline/cad-convex/uploadAdmissionActivationExactWindow')
    .inspectUploadAdmissionActivationExactWindow(
      uploadActivationExactWindow,
      uploadActivationDecisionRefresh,
      mountedDevelopmentCloseout,
    );
assert.equal(uploadActivationExactWindowResult.readyForSourceOnlyRunnerRebind, true);
assert.equal(uploadActivationExactWindowResult.liveDevelopmentRunAuthorizedByThisPacket, false);
assert.equal(uploadActivationExactWindow.acceptedWindow.startUtc, '2026-09-16T20:30:00Z');
assert.equal(uploadActivationExactWindow.acceptedWindow.expiresUtc, '2026-09-16T20:45:00Z');
assert.equal(uploadActivationExactWindow.runnerDisposition.sourceOnlyRunnerRebindRequiredBeforeLiveRun, true);
assert.equal(uploadActivationExactWindow.runBounds.allInPlanningCapUsd, 50);
assert.equal(uploadActivationExactWindow.runBounds.productionUploadActivationAuthorized, false);
assert.equal(uploadActivationExactWindow.runBounds.cadConversionAuthorized, false);
assert.equal(uploadActivationExactWindow.runBounds.sandboxDispatchAuthorized, false);
assert.ok(Object.values(uploadActivationExactWindow.authorityPreservedByThisPacket)
  .every(value => value === false));
assert.ok(!/uploadAdmissionActivationExactWindow|cad-upload-admission-activation-exact-window/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionActivationExactWindow.js')));
const uploadActivationWindowRollover =
  JSON.parse(read('offline/cad-convex/uploadAdmissionActivationWindowRollover.json'));
const uploadActivationWindowRolloverResult =
  require('../offline/cad-convex/uploadAdmissionActivationWindowRollover')
    .inspectUploadAdmissionActivationWindowRollover(
      uploadActivationWindowRollover,
      uploadActivationExactWindow,
      uploadActivationDecisionRefresh,
      mountedDevelopmentCloseout,
    );
assert.equal(uploadActivationWindowRolloverResult.readyForSourceOnlyRunnerRebind, true);
assert.equal(uploadActivationWindowRolloverResult.liveDevelopmentRunAuthorizedByThisPacket, false);
assert.equal(uploadActivationWindowRollover.acceptedWindow.startUtc, '2026-09-16T22:30:00Z');
assert.equal(uploadActivationWindowRollover.acceptedWindow.expiresUtc, '2026-09-16T23:00:00Z');
assert.equal(uploadActivationWindowRollover.runBounds.allInPlanningCapUsd, 50);
assert.ok(Object.values(uploadActivationWindowRollover.authorityPreservedByThisPacket)
  .every(value => value === false));
assert.ok(!/uploadAdmissionActivationWindowRollover|cad-upload-admission-activation-window-rollover/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionActivationWindowRollover.js')));
const uploadActivationRolloverCloseout =
  JSON.parse(read('offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json'));
const uploadActivationRolloverCloseoutResult =
  require('../offline/cad-convex/uploadAdmissionActivationRolloverCloseout')
    .inspectUploadAdmissionActivationRolloverCloseout(
      uploadActivationRolloverCloseout,
      uploadActivationWindowRollover,
      JSON.parse(read('offline/cad-convex/uploadAdmissionActivationRunnerRebind.json')),
    );
assert.equal(uploadActivationRolloverCloseoutResult.developmentSyntheticUploadPathQualified, true);
assert.equal(uploadActivationRolloverCloseoutResult.productionUploadActivationAuthorized, false);
assert.equal(uploadActivationRolloverCloseoutResult.conversionAuthorized, false);
assert.equal(uploadActivationRolloverCloseoutResult.sandboxDispatchAuthorized, false);
assert.equal(uploadActivationRolloverCloseout.operationCounts.uploadBodiesRead, 1);
assert.equal(uploadActivationRolloverCloseout.operationCounts.conversionDispatches, 0);
assert.ok(Object.values(uploadActivationRolloverCloseout.authorityPreserved)
  .every(value => value === false));
assert.ok(!/uploadAdmissionActivationRolloverCloseout|cad-upload-admission-activation-rollover-closeout/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionActivationRolloverCloseout.js')));
const uploadConversionSandboxReadiness =
  JSON.parse(read('offline/cad-convex/uploadConversionSandboxReadiness.json'));
const uploadConversionSandboxReadinessResult =
  require('../offline/cad-convex/uploadConversionSandboxReadiness')
    .inspectUploadConversionSandboxReadiness(
      uploadConversionSandboxReadiness,
      uploadActivationRolloverCloseout,
    );
assert.equal(uploadConversionSandboxReadinessResult.readyForOneFutureDevelopmentConversionRun, true);
assert.equal(uploadConversionSandboxReadinessResult.liveRunAuthorizedByThisPacket, false);
assert.equal(uploadConversionSandboxReadiness.qualificationDecision.newStandaloneSandboxProofRequired, false);
assert.equal(uploadConversionSandboxReadiness.futureRunBounds.maxAttempts, 1);
assert.equal(uploadConversionSandboxReadiness.futureRunBounds.allInPlanningCapUsd, 50);
assert.equal(uploadConversionSandboxReadiness.futureRunBounds.privateCadAllowed, false);
assert.ok(Object.values(uploadConversionSandboxReadiness.authorityPreservedByThisPacket)
  .every(value => value === false));
assert.ok(!/uploadConversionSandboxReadiness|run-cad-upload-conversion-sandbox/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadConversionSandboxReadiness.js')));
const uploadActivationRunnerRebind =
  JSON.parse(read('offline/cad-convex/uploadAdmissionActivationRunnerRebind.json'));
const uploadActivationRunnerRebindResult =
  require('../offline/cad-convex/uploadAdmissionActivationRunnerRebind')
    .inspectUploadAdmissionActivationRunnerRebind(
      uploadActivationRunnerRebind,
      uploadActivationWindowRollover,
      uploadActivationDecisionRefresh,
      mountedDevelopmentCloseout,
    );
assert.equal(uploadActivationRunnerRebindResult.readyForWindowExecution, true);
assert.equal(uploadActivationRunnerRebindResult.liveRunAuthorizedByThisPacket, false);
assert.equal(uploadActivationRunnerRebind.acceptedWindow.startUtc, '2026-09-16T22:30:00Z');
assert.equal(uploadActivationRunnerRebind.acceptedWindow.expiresUtc, '2026-09-16T23:00:00Z');
assert.equal(uploadActivationRunnerRebind.runner.trackedRouteModified, false);
assert.equal(uploadActivationRunnerRebind.runBounds.allInPlanningCapUsd, 50);
assert.equal(uploadActivationRunnerRebind.runBounds.productionUploadActivationAuthorized, false);
assert.equal(uploadActivationRunnerRebind.runBounds.cadConversionAuthorized, false);
assert.equal(uploadActivationRunnerRebind.runBounds.sandboxDispatchAuthorized, false);
assert.ok(Object.values(uploadActivationRunnerRebind.authorityPreservedByThisPacket)
  .every(value => value === false));
assert.ok(!/uploadAdmissionActivationRunnerRebind|run-cad-upload-activation-exact-window/
  .test(read('server/cadUserUploadRouter.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|convex\/browser|console\./
  .test(read('offline/cad-convex/uploadAdmissionActivationRunnerRebind.js')));

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

const privateRestrictedReview = JSON.parse(read('offline/cad-convex/privateRestrictedRegisterReview.json'));
for (const key of ['executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled',
  'restrictedEvidenceAccepted', 'readyForLiveRunApproval']) assert.equal(privateRestrictedReview[key], false);
assert.ok(Object.values(privateRestrictedReview.gates).every(value => value === false));
assert.equal(privateRestrictedReview.publicProjectionOnly, true);
assert.equal(privateRestrictedReview.sourceBindings.restrictedEvidenceCommandCardBytesCommit, '882ebfe1b1aeccc11825843981ff1e569c8350e5');
assert.equal(privateRestrictedReview.privateRegisterContract.rawValuePublic, false);
assert.equal(privateRestrictedReview.privateRegisterContract.rawCommandBytesPublic, false);
assert.ok(privateRestrictedReview.nextHumanGates.restrictedEvidenceAcceptanceTemplate.includes('authorizes no live run'));

const boundedExecutor = JSON.parse(read('offline/cad-convex/boundedDevQualificationExecutor.json'));
assert.equal(boundedExecutor.mode, 'source-only-bounded-development-qualification-executor');
assert.equal(boundedExecutor.executableBridgeSource, true);
assert.equal(boundedExecutor.providerClientBundled, false);
for (const key of ['liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled']) assert.equal(boundedExecutor[key], false);
assert.ok(Object.values(boundedExecutor.gates).every(value => value === false));
assert.equal(boundedExecutor.acceptedEvidence.projectionSha256, '2355757d7415cb1512d234c69f90cd670cc4c1a405c31f7102140622507e77d4');
assert.equal(boundedExecutor.acceptedEvidence.acceptanceReceiptSha256, 'c1001e4c4ab59accebfa5bc49e8bf76d8799af75bfcc165fc43e5e03e61bf053');
assert.equal(boundedExecutor.acceptedEvidence.commandCardProjectionDigest, 'f3e864320f4f6aa146cac0cacf3f1e1a7e4e90b2c0001af0bfb23bcc1698ff1a');
assert.equal(boundedExecutor.acceptedRebuiltSuccessorEvidence.projectionSha256, '1dbdf153921a1676c8870827fd619706e1a6bd143835a6cb623be13590dae566');
assert.equal(boundedExecutor.acceptedRebuiltSuccessorEvidence.acceptanceReceiptSha256, '898bf16b7078730123aa9f1416d21dcfd1e5f07a2272ac15024563a6dbb498e8');
assert.equal(boundedExecutor.acceptedRebuiltSuccessorEvidence.privateRestrictedRegisterDigest, 'd2018ce44048a32a495a0c6095c4fafdffe375766dd0f9a4aafc5806e6ebb237');
assert.equal(boundedExecutor.acceptedRebuiltSuccessorEvidence.restrictedCommandSetDigest, 'e1a74e5b4ea72c55b6b72845a1e924c4659f11eebd8ef216c3104f2a3abd51ee');
assert.equal(boundedExecutor.acceptedRebuiltSuccessorEvidence.commandCardProjectionDigest, '2b79a9ca19197b12082301ef45dfe7dcc803e84238882f16304b56c8e09e5fac');
assert.equal(boundedExecutor.acceptedRebuiltSuccessorEvidence.sourcePr, 220);
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.projectionSha256, '6c0289bd0d59aeb2393112291341e49c5751f0fd8c74c0a1e218cf314a57bb61');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.acceptanceReceiptSha256, '6f8de5ff724ea1e19ee198fd5ba6793e6712e6684923cb7bd0c0a3e51387d23c');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.privateRestrictedRegisterDigest, '84e80c4a26096709e2d9b308597ec8107944d0ff321d40de8f3dd1c7ed933427');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.restrictedCommandSetDigest, 'f58fa1ad88e99d6cee4a96398c616b23ebfc4be415771c66acf75f671e2b9ad2');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.commandCardProjectionDigest, '296400ff9502a4a31d6eb7c1f123325e13b296875c73da43d34e5c3ad3ad5310');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.sourceMainCommit, '30196c62648e4bcbb080ae5c7a6ab9396b8d48a9');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.sourcePacketCommit, '273acc9f468366536387a8dc4db15167f2b0efcd');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.sourcePr, 222);
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.runRef, 'rrb-ref:fresh-window-0300-bounded-development-run');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.window.startUtc, '2026-09-15T03:00:00Z');
assert.equal(boundedExecutor.acceptedFreshWindowEvidence.window.expiresUtc, '2026-09-15T03:05:00Z');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.projectionSha256, '8cfdb4f8b6fdce4a6de3b494c060f518130707cccd2e514295773a226c5e5fbd');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.acceptanceReceiptSha256, '9170213b22b3945dd448670de615c71e3aad948dfd120fcc9b3ed3c42301d142');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.privateRestrictedRegisterDigest, 'c1cd10673951d7407be95fb77a5ae98d135d00976c8eab48d687f67b25283bfc');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.restrictedCommandSetDigest, '7beedfe71bad86353ccbf467390d38aaa188a6b30975521a34e546be3c42384e');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.commandCardProjectionDigest, '13f0a71d1ea7de9b2ad97374ecda246beed97b1cdff63184a0b4f445b9209910');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.sourceMainCommit, '4ac1deb6acecc4841716c5a98993ba0d823b56a4');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.sourcePacketCommit, '3d7ec5c3585886c6032f7f3ccce8fa3af5fd42f0');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.sourcePr, 223);
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.runRef, 'rrb-ref:fresh-window-1030-bounded-development-run');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.window.startUtc, '2026-09-15T10:30:00Z');
assert.equal(boundedExecutor.acceptedFreshWindow1030Evidence.window.expiresUtc, '2026-09-15T10:35:00Z');
assert.equal(boundedExecutor.transportDiagnosticHardening.stoppedEarlierWindowRun.transportFailureClass,
  'CLI_MUTATION_NO_COMMIT_OBSERVED');
assert.equal(boundedExecutor.transportDiagnosticHardening.stoppedEarlierWindowRun.commitState, 'NO_COMMIT_OBSERVED');
assert.ok(boundedExecutor.nextHumanGates.liveQualification.includes('Keep CAD uploads disabled'));
assert.ok(boundedExecutor.nextHumanGates.rebuiltSuccessorLiveQualification.includes('Keep CAD uploads disabled'));
assert.ok(boundedExecutor.nextHumanGates.freshWindowLiveQualification.includes('2026-09-15T03:00:00Z'));
assert.ok(boundedExecutor.nextHumanGates.freshWindowLiveQualification.includes('Keep CAD uploads disabled'));
assert.ok(boundedExecutor.nextHumanGates.freshWindow1030LiveQualification.includes('2026-09-15T10:30:00Z'));
assert.ok(boundedExecutor.nextHumanGates.freshWindow1030LiveQualification.includes('Keep CAD uploads disabled'));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/.test(read('offline/cad-convex/boundedDevQualificationExecutor.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./.test(read('offline/cad-convex/boundedDevQualificationTransport.js')));
assert.ok(!/process\.env|fetch\s*\(|https?\.request|convex\/browser/.test(read('scripts/cad-bounded-dev-qualification-executor.js')));

console.log(`CAD source audit passed: ${files.length} files, zero leak pattern matches; internal-only and runtime isolation checks passed`);
