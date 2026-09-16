# CAD upload admission activation runner rebind

Status: source-only runner rebind. No live run happened. Base:
`11f45049f1ce138c887482d5d68d25d9642e7284`. Branch:
`codex/cad-upload-activation-runner-rebind-2230z`. Expenses: USD 0.

This packet binds the reviewed mounted-development upload harness to PR #292's
accepted rollover window: `2026-09-16T22:30:00Z` through
`2026-09-16T23:00:00Z`.

The wrapper command is:

```sh
NODE_PATH=<installed-node-modules> node scripts/run-cad-upload-activation-exact-window.js
```

It reuses the already reviewed mounted-development route harness in memory, maps
it to the exact-window run ref, and writes a fresh activation-window evidence
receipt under `.local/cad-convex/upload-activation-window-rollover-2230z`.

## Accepted inputs

- Rollover-window PR #292 merge commit:
  `11f45049f1ce138c887482d5d68d25d9642e7284`
- Rollover-window source commit:
  `77d9a71a8e07c180493ebb13e7d6eda5c1c8e7d8`
- Decision refresh PR #289 merge commit:
  `fbd8628efc52d9ec0df55f106c1b5ce0c6487cd5`
- Mounted-development closeout evidence:
  `a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75`
- Mounted-development closeout receipt:
  `915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a`
- Public fixture SHA-256:
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`

## Execution bounds

- target: `reversr-cad-auth-dev` / `majestic-alligator-31`
- public synthetic fixture only
- one attempt
- no automatic retry
- no second run
- stop on unknown outcome
- USD 50 all-in planning cap
- no retained-state deletion
- sanitized ignored local evidence only

The checked-in route still must contain:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

The wrapper creates only an in-memory compatibility config for the reviewed
mounted-development harness. It does not change tracked route source and does
not enable production body admission.

## Still not authorized

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

After this source-only rebind merges, run production fail-closed smoke and
cleanup. If the current time is more than five minutes before
`2026-09-16T22:30:00Z`, create a one-shot scheduler for the command above.
If the current time is already inside the accepted window and all preflight
checks pass, execute the command once. Stop on unknown outcome.

## Validation

```sh
NODE_PATH=<installed-node-modules> node --test scripts/cad-upload-admission-activation-runner-rebind.test.js scripts/cad-upload-admission-activation-window-rollover.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
git diff --check
```
