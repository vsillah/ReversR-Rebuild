# CAD Auth startup live-gate source install closure

Roadmap: 5/6 complete. This source-only gate closes the deployed-startup
installation gap without activating upload admission.

## Scope

The production entry now calls
`createCadStartupLiveGateSourceInstallClosure()`. Its default source stays
disabled and fail-closed, but the reviewed source path proves that the deployed
startup code can install the exact live-opening credential closure from
server-owned current-production metadata and private supply controls.

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
  `ae64570f5b101235fa1f2aa56a020d3d0a694e21f718267e8f4a2f1f5a5df40e`
- approved live-opening refresh SHA-256:
  `c6373fa18ebc2d5d93e852aef50c721f17164b88bbca7d5e5b9f4e76e1d9ea2e`
- main commit: `82dd2cb8af66edf2b4926efa1cd2213e5de770e8`
- production deployment: `dpl_Fmr2h4sZRgujHQarkgxvqvcueiW9`
- production target:
  `https://reversr-htg38n648-vsillahs-projects.vercel.app`
- source-owned deployment reference:
  `vercel-target:reversr-htg38n648-vsillahs-projects.vercel.app@82dd2cb8af66edf2b4926efa1cd2213e5de770e8`
- command-card SHA-256:
  `22d7af21abf6576cc5bae8c4a287e82b7d4eaf56c4a264418f48ff0baf9f4f0f`
- installation SHA-256:
  `7a49f15dadb27e9c8a8c32422aae67b7d7fd7ea2764fd81242e4efce269f0cf5`
- private credential supply ref:
  `rrb-ref:cad-auth-live-opening-private-session-credential-supply-v1`
- private supply receipt SHA-256:
  `ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1`

## Validation

Run:

```sh
node scripts/cad-auth-startup-live-gate-source-install-closure-checker.js
node --test scripts/cad-auth-startup-live-gate-source-install-closure.test.js
```

The checker records `STARTUP_LIVE_GATE_SOURCE_INSTALL_PATH_PROVEN_DEFAULT_CLOSED`
only when the startup import, current metadata normalization, exact command-card
digest, exact installation digest, private supply receipt requirement, route
body gate, and default fail-closed proof all remain intact.

## Next Approval Phrase

`I approve a bounded source-only/no-live CAD Auth post-merge deployed startup live-gate source installation closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to deployed startup live-gate source installation closure packet SHA-256 <startupLiveGateSourceInstallClosurePacketSha256> at source commit <closureSourceCommit>, stopped live-opening disposition SHA-256 ae64570f5b101235fa1f2aa56a020d3d0a694e21f718267e8f4a2f1f5a5df40e, approved live-opening refresh SHA-256 c6373fa18ebc2d5d93e852aef50c721f17164b88bbca7d5e5b9f4e76e1d9ea2e, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed server startup default path can install the exact reviewed live-opening gate from server-owned current-production metadata and private credential supply controls while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase only if the deployed startup path is proven executable without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved deployed startup gate installation path, unresolved digest, private-data leakage risk, unknown outcome, missing exact private credential supply requirement, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.`
