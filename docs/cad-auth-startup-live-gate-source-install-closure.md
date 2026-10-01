# CAD Auth deployed startup active-window binding repair

Roadmap: 5/6 complete. This source-only gate closes the deployed-startup
active-window binding gap without activating upload admission.

## Scope

The production entry calls `createCadStartupLiveGateSourceInstallClosure()` with
its no-argument startup path. The exported disabled source stays available for
default-closed proof, while the no-argument startup path now derives its
reviewed startup source, deployment reference, target, command-card digest, and
installation digest from validated current production metadata and a bounded
active UTC window. This closes the stale-window binding gap while preserving
source-owned `vercel-target:<host>@<commit>` deployment references without
reading provider credentials, private credentials, or activating upload
admission.

The proof is source-only:

- no provider, environment, resource, billing, or secret changes
- no private evidence reads
- no private credential reads
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
- stopped post-merge rebind refresh disposition SHA-256:
  `eaa74f2b5c287e7dc008b0317b1f4b297532c087e5ebc9686c47baae0ffd58fb`
- historical startup default repair packet SHA-256:
  `988386d4eb807cb6cbb98aa1f39253fb88f11f1b17ad18ccc1416f32c6bff38c`
- repair base main commit:
  `fc3a2e20c07922f4188e4c7e2c4878b53f22f6bb`
- repair base production deployment: `dpl_ArAQeKQ5Gey4fz9BP87KRYSqYo4R`
- production target:
  `https://reversr-8gns2sgrw-vsillahs-projects.vercel.app`
- source-owned deployment reference:
  `vercel-target:reversr-8gns2sgrw-vsillahs-projects.vercel.app@fc3a2e20c07922f4188e4c7e2c4878b53f22f6bb`
- active-window repair stopped live-opening disposition SHA-256:
  `1d5e73cd6104f473a2c4469d7efb9aa1b9f42775bea572bc2f776c01f6a507d0`
- active-window repair approved live-opening refresh SHA-256:
  `735674f9af7a72ce9be12cb73c433f54aa693f6e5aad159183b07c55110fb308`
- active-window repair base main commit:
  `3df734c7478c037845e8c72a9e32669de3d4093d`
- active-window repair production deployment: `6793483139`
- active-window repair production target:
  `https://reversr-333l201xx-vsillahs-projects.vercel.app`
- active-window repair source-owned deployment reference:
  `vercel-target:reversr-333l201xx-vsillahs-projects.vercel.app@3df734c7478c037845e8c72a9e32669de3d4093d`
- command-card SHA-256:
  `c91b47ae9d2d9e92b18a92e76c3806dce7acde0426a08a50fcb124339d94c922`
- installation SHA-256:
  `c2615944bf3e3fb57fe0852f3a6839eb0c85ba336f5bc8fa6259c71359996454`
- bounded session ref:
  `rrb-ref:cad-upload-internal-mark-test-session-v1`
- durable evidence SHA-256:
  `8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7`
- private credential supply ref:
  `rrb-ref:cad-auth-live-opening-private-session-credential-supply-v1`
- private supply receipt SHA-256:
  `6da997122386aefce6c31cd86f060af1a848bae80bfd763eb47b94f61399f150`
- proof window:
  `2026-10-01T15:00:00Z` to `2026-10-01T15:30:00Z`
- active-window repair proof window:
  `2026-10-01T23:00:00Z` to `2026-10-01T23:30:00Z`
- active-window repair command-card SHA-256:
  `46f806282fababa97966500a40e53ecbc48144cdf2573378b05f23cdc8c052be`
- active-window repair installation SHA-256:
  `86ab7f459736683a9e8ce85a207657fe16eba091ebe0b34b2870dd20b3d61dd3`

## Validation

Run:

```sh
node scripts/cad-auth-startup-live-gate-source-install-closure-checker.js
node --test scripts/cad-auth-startup-live-gate-source-install-closure.test.js
```

The checker records
`STARTUP_LIVE_GATE_ACTIVE_WINDOW_BINDING_REPAIRED_DEFAULT_CLOSED` only when the
startup import, no-argument startup path, current metadata derivation, active
window derivation, exact command-card digest, exact installation digest,
source-owned durable adapter path, generated private supply receipt requirement,
route body gate, default fail-closed proof, no-argument fresh-deployment
derivation proof, and stale-metadata rejection proof all remain intact.

## Next Approval Phrase

`I approve a bounded source-only/no-live CAD Auth post-merge deployed startup active-window binding repair deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to deployed startup active-window binding repair packet SHA-256 <activeWindowBindingRepairPacketSha256> at source commit <repairSourceCommit>, stopped live-opening disposition SHA-256 1d5e73cd6104f473a2c4469d7efb9aa1b9f42775bea572bc2f776c01f6a507d0, approved live-opening refresh SHA-256 735674f9af7a72ce9be12cb73c433f54aa693f6e5aad159183b07c55110fb308, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed no-arg server/index.js startup path can resolve a non-null executable runtime from reviewed current-production metadata, exact live-gate source values, exact private credential supply controls, a non-closed source-owned durable adapter path, and a fresh active UTC window while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the deployed startup path is proven executable for the active window without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, private credential reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved active-window source binding, unresolved deployed startup default source path, closed durable adapter path, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply requirement, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.`
