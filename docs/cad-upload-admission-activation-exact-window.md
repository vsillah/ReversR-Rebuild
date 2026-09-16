# CAD upload admission activation exact window

Status: source-only exact UTC window packet. No live run happened. Base:
`fbd8628efc52d9ec0df55f106c1b5ce0c6487cd5`. Branch:
`codex/cad-upload-activation-exact-window`. Expenses: USD 0.

This packet accepts PR #289's upload activation decision refresh and binds the
next proposed development-only synthetic upload activation attempt to a fixed
UTC window: `2026-09-16T20:30:00Z` through `2026-09-16T20:45:00Z`.

It does not authorize live execution by itself. The existing mounted development
runner is still bound to the completed `18:00Z` window, so a source-only runner
rebind must be reviewed and merged before any run can execute in this new
window.

## Accepted inputs

- Decision refresh source: `offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json`
- Decision refresh commit: `ee0ce8b571fc23ad90492d319d63bbc33aa42f23`
- Decision refresh merge commit:
  `fbd8628efc52d9ec0df55f106c1b5ce0c6487cd5`
- Mounted-development closeout PR #288 merge commit:
  `c74de5b1deecfd1bb8741190ef702e670dce41c4`
- Mounted-development evidence SHA-256:
  `a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75`
- Mounted-development receipt SHA-256:
  `915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a`
- Public fixture SHA-256:
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`
- Public fixture bytes: `11562`

## Accepted window

- Run ref: `rrb-ref:cad-upload-activation-exact-window-2030z`
- Start: `2026-09-16T20:30:00Z`
- Expires: `2026-09-16T20:45:00Z`
- Max duration: 900 seconds
- Evidence root:
  `.local/cad-convex/upload-activation-exact-window-2030z`

If the final execution step is more than five minutes away, use a one-shot
schedule instead of holding the thread open.

## Route gate

The checked-in route must still contain:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

This packet may not flip that literal. The future runner rebind must pre-check
and post-check the disabled route and stop on unknown outcome.

## Bounds

The future execution remains bounded to development only:

- target: `reversr-cad-auth-dev` / `majestic-alligator-31`
- public synthetic fixture only
- one attempt
- no automatic retry
- no second run
- USD 50 all-in planning cap
- no retained-state deletion
- sanitized local evidence only

## Still not authorized

Still blocked:

- live execution before a reviewed source-only runner rebind
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

After this source-only packet merges, run production fail-closed smoke and
cleanup. Then prepare `codex/cad-upload-activation-runner-rebind` as the
source-only runner rebind for this exact window. Stop before live execution
unless the rebind has merged, the route smoke passes, and the current time is
inside the accepted window.

## Validation

```sh
node --test scripts/cad-upload-admission-activation-exact-window.test.js scripts/cad-upload-admission-activation-decision-refresh.test.js scripts/cad-upload-admission-mounted-development-closeout.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
git diff --check
```
