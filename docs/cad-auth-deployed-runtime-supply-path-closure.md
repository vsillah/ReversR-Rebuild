# CAD Auth deployed runtime supply path closure

Roadmap: **5/6 complete**. This packet closes the current Step 6 blocker where
the source-owned live-opening proof path existed, but the deployed
`server/index.js` startup path still did not call a reviewed supply-path wrapper.

## Scope

This is source-only and disabled by default. It installs the reviewed startup
composition point so the deployed server can resolve a non-null live-opening
session service and executable runtime only when a later source-owned gate binds
all exact values:

- stopped live-opening disposition SHA-256:
  `49a3e56d788ebfc5195225e3a6a8874b07187403a7acbe4811652bcb17a0778f`
- approved live-opening refresh SHA-256:
  `fb3b8e86e6334931840651ca044c81635e18922dfbae153a918aeecf31f6cb35`
- reviewed main commit:
  `363501f667b1421a3d40d3fc50fb1eac880dae0e`
- production deployment reference: `6774037135`
- production target:
  `https://reversr-8mzd86ytj-vsillahs-projects.vercel.app`
- source-owned deployment reference:
  `vercel-target:reversr-8mzd86ytj-vsillahs-projects.vercel.app@363501f667b1421a3d40d3fc50fb1eac880dae0e`
- command-card SHA-256:
  `c7b7c61a7b131b5824195c6a89ff2001184b89aa40d26b3f4c83b8d83152e608`
- installation SHA-256:
  `0bc156e717eb8455c5a7482ec5c1b13f98bdcf7dc8bea9206558f36395cb3e03`
- durable evidence SHA-256:
  `8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7`
- bounded session ref:
  `rrb-ref:cad-upload-internal-mark-test-session-v1`
- durable service ref:
  `rrb-ref:cad-auth-durable-service-20260928T161754Z`
- private supply receipt SHA-256:
  `ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1`
- digest-bound session credential precondition SHA-256:
  `2165440ab2035b4fa249cf960cc036b449b9eb780776c89ad5cba46b9033e359`

The private supply receipt digest is a non-secret source requirement. It is not
a credential value and does not authorize upload-session issuance.

## Implementation

`server/cadDeployedRuntimeSupplyPathClosure.js` wraps
`createCadLiveOpeningGateCredentialClosure`. The default gate is disabled and
returns the existing fail-closed behavior. The reviewed proof gate is accepted
only when all bound inputs match and current production metadata is read from the
server-owned Vercel environment:

- deployment target and commit match the reviewed production target and main
  commit,
- the deployment reference is source-owned target-at-commit metadata,
- the private credential supply is represented only by digest-bound source
  controls,
- the command-card SHA-256 and installation SHA-256 match the reviewed values,
- the bounded session and durable evidence references match the reviewed source
  packet.

`server/index.js` now constructs `cadLiveGateCredentialClosure` through the
deployed supply-path wrapper. With no later explicit gate bound, production still
receives a closed session service and disabled executable runtime.

## Closed Controls

- `liveOpeningAuthorized`: false
- `uploadSessionIssued`: false
- `productionUploadActivated`: false
- `requestBodyAdmittedOrRead`: false
- `runtimeInstallationActivated`: false
- `runtimeActivated`: false
- `executableCommandCardIssuedForLiveExecution`: false
- `durableServiceLiveQualified`: false
- `privateEvidenceRead`: false
- `effectsExecuted`: 0

The production route still requires an upload-session credential before the
runtime gate can be reached, and `BODY_ADMISSION_AUTHORIZED` remains false.

## Validation

Run:

```bash
node scripts/cad-auth-deployed-runtime-supply-path-closure-checker.js
node --test scripts/cad-auth-deployed-runtime-supply-path-closure.test.js
```

Relevant guard checks:

```bash
node scripts/cad-auth-credential-closure-binding-repair-checker.js
node scripts/cad-auth-credential-metadata-source-repair-checker.js
node scripts/cad-auth-live-gate-credential-closure-checker.js
node scripts/cad-auth-production-binding-source-install-checker.js
node --test scripts/cad-auth-credential-metadata-source-repair.test.js scripts/cad-auth-credential-closure-binding-repair.test.js scripts/cad-auth-live-gate-credential-closure.test.js
node --test scripts/cad-auth-production-binding-source-install.test.js scripts/cad-auth-production-execution-binding-finalization.test.js scripts/cad-auth-live-opening-execution-gap-closure.test.js scripts/cad-auth-live-opening-executable-runtime-wiring.test.js scripts/cad-auth-final-live-opening-rebind-prep.test.js
```

## Next Gate

After public review, merge, production deployment, and fail-closed smoke, the
next source-only approval phrase is:

`I approve a bounded source-only/no-live CAD Auth post-merge deployed runtime supply path closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to deployed runtime supply path closure packet SHA-256 <deployedRuntimeSupplyPathClosurePacketSha256> at source commit <closureSourceCommit>, stopped live-opening disposition SHA-256 49a3e56d788ebfc5195225e3a6a8874b07187403a7acbe4811652bcb17a0778f, approved live-opening refresh SHA-256 fb3b8e86e6334931840651ca044c81635e18922dfbae153a918aeecf31f6cb35, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed server startup path can resolve a non-null live-opening session service and executable runtime from reviewed current-production metadata and private credential supply controls while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the deployed startup path is proven executable without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved deployed startup supply path, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply requirement, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.`
