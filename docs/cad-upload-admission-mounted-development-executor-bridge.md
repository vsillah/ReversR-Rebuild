# CAD upload admission mounted development executor bridge

Status: source-only executor bridge for one future mounted development
upload-admission run. This adds the reviewed local runner needed by the
`2026-09-16T18:00:00Z` to `2026-09-16T18:15:00Z` exact-window packet.

Base: `816c773a128a3d44ba26ce54227fa45be1db8d1b`.
Branch: `codex/cad-mounted-dev-upload-executor-bridge`.
Expenses: USD 0.

## Binding

- Run ref: `rrb-ref:cad-upload-admission-mounted-development-1800z`
- Window source: `offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.json`
- Readiness source:
  `offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json`
- Runner:
  `scripts/run-cad-upload-admission-mounted-development-window.js`

## Execution shape

The runner:

- checks the mounted route remains disabled before body admission
- mounts a development-only harness from the reviewed router source
- flips `BODY_ADMISSION_AUTHORIZED` only inside the VM harness
- admits only the public synthetic cube fixture
- writes sanitized local evidence and receipt
- checks the mounted route remains disabled after the harness check
- stops outside the exact UTC window

The tracked route remains source-closed:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

## Still not authorized

This packet does not run the live step by itself.

Still blocked:

- production upload activation
- production body admission
- CAD conversion
- Sandbox dispatch
- private CAD
- real users
- provider, resource, auth, env, usage or billing changes
- email, SMS or Slack
- retry or second run

## Next safe action

After merge, production smoke, and cleanup, execute exactly one bounded
development-only mounted upload-admission run during the accepted window if
pre-run checks still pass.

## Validation

```sh
NODE_PATH=<installed-node-modules> node --test scripts/cad-upload-admission-mounted-development-executor-bridge.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
