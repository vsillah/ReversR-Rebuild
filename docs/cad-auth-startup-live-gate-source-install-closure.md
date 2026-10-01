# CAD Auth deployed startup default live-gate execution source repair

Roadmap: 5/6 complete. This source-only gate closes the deployed-startup
installation gap without activating upload admission.

## Scope

The production entry now calls
`createCadStartupLiveGateSourceInstallClosure()` with its no-argument startup
path. The exported disabled source stays available for default-closed proof,
while the reviewed startup source proves that deployed startup code can resolve
a non-null executable runtime from current-production metadata, exact live-gate
values, private supply controls, and a non-closed source-owned durable adapter
path.

The proof is source-only:

- no provider, environment, resource, billing, or secret changes
- no private evidence reads
- no upload-session issuance
- no production upload activation
- no request-body admission or body read
- no conversion, Sandbox dispatch, private CAD, external messages, retry, or
  second live run
- no runtime activation or executable command-card issuance for live execution

## Bound Inputs

- stopped live-opening disposition SHA-256:
  `2981866f2d55a16ab1586d9c297ff58af63aa627dd09536bab40b736aed9de4b`
- approved live-opening refresh SHA-256:
  `5ceafc4693650f42989cc320fb653254428565056d005b3536e3dc7489eb5c11`
- main commit: `a0708899e4e74f18ddacdbcc72e667ab983f7e23`
- GitHub production deployment: `6775936794`
- production target:
  `https://reversr-m754g3gt2-vsillahs-projects.vercel.app`
- source-owned deployment reference:
  `vercel-target:reversr-m754g3gt2-vsillahs-projects.vercel.app@a0708899e4e74f18ddacdbcc72e667ab983f7e23`
- command-card SHA-256:
  `d694d980449baf1ce7a61104183344c1f3b36b10ac932cfbafda9b12817f026e`
- installation SHA-256:
  `3afbbaa8861627871948c30a46c5774e799f7542634439ab583b12314e12c3c7`
- bounded session ref:
  `rrb-ref:cad-upload-internal-mark-test-session-v1`
- durable evidence SHA-256:
  `8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7`
- private credential supply ref:
  `rrb-ref:cad-auth-live-opening-private-session-credential-supply-v1`
- private supply receipt SHA-256:
  `ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1`
- proof window:
  `2026-10-01T10:00:00Z` to `2026-10-01T10:30:00Z`

## Validation

Run:

```sh
node scripts/cad-auth-startup-live-gate-source-install-closure-checker.js
node --test scripts/cad-auth-startup-live-gate-source-install-closure.test.js
```

The checker records
`STARTUP_LIVE_GATE_DEFAULT_STARTUP_PATH_PROVEN_DEFAULT_CLOSED` only when the
startup import, no-argument startup path, current metadata normalization, exact
command-card digest, exact installation digest, source-owned durable adapter
path, private supply receipt requirement, route body gate, and default
fail-closed proof all remain intact.

## Next Approval Phrase

`I approve a bounded source-only/no-live CAD Auth post-merge deployed startup default live-gate execution source deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to deployed startup default live-gate execution source repair packet SHA-256 <startupDefaultGateRepairPacketSha256> at source commit <repairSourceCommit>, stopped live-opening disposition SHA-256 2981866f2d55a16ab1586d9c297ff58af63aa627dd09536bab40b736aed9de4b, approved live-opening refresh SHA-256 5ceafc4693650f42989cc320fb653254428565056d005b3536e3dc7489eb5c11, GitHub production deployment <currentGithubProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed no-arg server/index.js startup path can resolve a non-null executable runtime from reviewed current-production metadata, exact live-gate source values, exact private credential supply controls, and a non-closed source-owned durable adapter path while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the deployed startup path is proven executable without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved deployed startup default source path, closed durable adapter path, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply requirement, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.`
