# CAD upload admission activation runner rebind

Status: source-only runner rebind. No live run happened. Base:
`f848b56449c6e192cf3ea57ed8119776eba73481`. Branch:
`codex/cad-upload-activation-runner-rebind`. Expenses: USD 0.

This packet binds the reviewed mounted-development upload harness to PR #290's
accepted exact window: `2026-09-16T20:30:00Z` through
`2026-09-16T20:45:00Z`.

The wrapper command is:

```sh
NODE_PATH=<installed-node-modules> node scripts/run-cad-upload-activation-exact-window.js
```

It reuses the already reviewed mounted-development route harness in memory, maps
it to the exact-window run ref, and writes a fresh activation-window evidence
receipt under `.local/cad-convex/upload-activation-exact-window-2030z`.

## Accepted inputs

- Exact-window PR #290 merge commit:
  `f848b56449c6e192cf3ea57ed8119776eba73481`
- Exact-window source commit:
  `3f1590f157d89b917501cdd4ac5e0496e4d58668`
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
`2026-09-16T20:30:00Z`, create a one-shot scheduler for the command above.
If the current time is already inside the accepted window and all preflight
checks pass, execute the command once. Stop on unknown outcome.

## Validation

```sh
NODE_PATH=<installed-node-modules> node --test scripts/cad-upload-admission-activation-runner-rebind.test.js scripts/cad-upload-admission-activation-exact-window.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
git diff --check
```
