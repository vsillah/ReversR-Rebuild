# CAD Auth deployed startup default live-gate execution source repair

Roadmap: 5/6 complete. This source-only gate closes the deployed-startup
installation gap without activating upload admission.

## Scope

The production entry calls `createCadStartupLiveGateSourceInstallClosure()` with
its no-argument startup path. The exported disabled source stays available for
default-closed proof, while the no-argument startup path now derives its
reviewed startup source, deployment reference, target, command-card digest, and
installation digest from validated current production metadata. This closes the
stale-deployment binding gap and canonicalizes Vercel `dpl_...` deployment ids
to source-owned `vercel-target:<host>@<commit>` references without reading
provider credentials or activating upload admission.

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
  `ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1`
- proof window:
  `2026-10-01T15:00:00Z` to `2026-10-01T15:30:00Z`

## Validation

Run:

```sh
node scripts/cad-auth-startup-live-gate-source-install-closure-checker.js
node --test scripts/cad-auth-startup-live-gate-source-install-closure.test.js
```

The checker records
`STARTUP_LIVE_GATE_DEFAULT_STARTUP_PATH_PROVEN_DEFAULT_CLOSED` only when the
startup import, no-argument startup path, current metadata derivation, exact
command-card digest, exact installation digest, source-owned durable adapter
path, private supply receipt requirement, route body gate, default fail-closed
proof, no-argument fresh-deployment derivation proof, and stale-metadata
rejection proof all remain intact.

## Next Approval Phrase

`I approve a bounded source-only/no-live CAD Auth post-merge deployed startup default live-gate execution source deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to deployed startup default live-gate execution source repair packet SHA-256 <startupDefaultGateRepairPacketSha256> at source commit <repairSourceCommit>, stopped live-opening disposition SHA-256 2981866f2d55a16ab1586d9c297ff58af63aa627dd09536bab40b736aed9de4b, approved live-opening refresh SHA-256 5ceafc4693650f42989cc320fb653254428565056d005b3536e3dc7489eb5c11, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed no-arg server/index.js startup path can resolve a non-null executable runtime from reviewed current-production metadata, exact live-gate source values, exact private credential supply controls, and a non-closed source-owned durable adapter path while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the deployed startup path is proven executable without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved deployed startup default source path, closed durable adapter path, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply requirement, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.`
