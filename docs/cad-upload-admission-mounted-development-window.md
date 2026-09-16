# CAD upload admission mounted development window

Status: source-only exact UTC window packet. This packet binds the next mounted
development upload-admission gate to a specific future window. It does not run
the gate, activate uploads, change the mounted route, or authorize conversion.
This packet does not run the gate.

Base: `d89290c61511006c849954275602f21f57092457`.
Branch: `codex/cad-mounted-dev-upload-exact-window`.
Expenses: USD 0.

## Accepted readiness input

This packet consumes PR #285's mounted development readiness packet:

- readiness commit: `8c7889b3bfdd894644e1eee41f31b6b6d8653611`
- readiness merge commit: `d89290c61511006c849954275602f21f57092457`
- accepted isolated body-admission evidence:
  `d5d561c9dbb69fd8c398e46290e960a9078f74c3966671dd88bef71c318ca604`
- accepted isolated body-admission receipt:
  `90840cf2af29203e17ec2234ef99d662abd77518f012b3b9bbe4be74bd465b84`

## Accepted window

- Run ref: `rrb-ref:cad-upload-admission-mounted-development-1800z`
- Start: `2026-09-16T18:00:00Z`
- Expires: `2026-09-16T18:15:00Z`
- Max duration: 900 seconds
- Evidence root:
  `.local/cad-convex/upload-admission-mounted-development-1800z`

If the final execution step is more than five minutes away, use a one-shot
schedule instead of holding the thread open.

## Route gate

The mounted route must still contain:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

This packet may not flip that literal. Any future run must pre-check and
post-check the mounted route and stop on unknown outcome.

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

This packet does not authorize live mounted upload execution by itself. If no
reviewed mounted-development executor bridge exists after merge, the next gate
is that source-only bridge.

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

After this source-only packet merges, run production fail-closed smoke and
cleanup. Then either:

1. execute one bounded development-only run during the accepted window if a
   reviewed mounted-development executor bridge exists, or
2. prepare that source-only executor bridge and stop before live execution.

## Validation

```sh
node --test scripts/cad-upload-admission-mounted-development-window.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
