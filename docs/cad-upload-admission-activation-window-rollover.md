# CAD upload admission activation window rollover

Status: source-only rollover packet. No live run happened. Base:
`8ed710f63574a1ef40df25beb5d6fb80c58f22c1`. Branch:
`codex/cad-upload-activation-window-rollover-2230z`. Expenses: USD 0.

The prior `20:30Z` window expired without execution or evidence. This is not an
automatic retry and does not reuse the prior run reference. It binds one future
development-only synthetic upload activation attempt to `2026-09-16T22:30:00Z`
through `2026-09-16T23:00:00Z`.

The run remains capped at 900 seconds. The 30-minute eligibility window gives
the one-shot scheduler bounded delivery tolerance without expanding the run
duration or authorizing a second attempt.

## Accepted rollover

- New run ref: `rrb-ref:cad-upload-activation-window-rollover-2230z`
- Evidence root: `.local/cad-convex/upload-activation-window-rollover-2230z`
- Development target: `reversr-cad-auth-dev` / `majestic-alligator-31`
- Fixture: public synthetic `Cube 10x10.igs`, SHA-256
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`
- All-in planning cap: USD 50

## Preserved route gate

The checked-in route must remain disabled:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

The future runner rebind must pre-check and post-check that literal, stop on
unknown outcome, write only sanitized ignored evidence, and perform at most one
attempt.

## Still blocked

This packet does not authorize live execution by itself. Production upload
activation, production body admission, CAD conversion, Sandbox dispatch,
private CAD, real users, provider/resource/env changes, retries, and second runs
remain blocked.

## Next safe action

After merge, production fail-closed smoke, and cleanup, rebind the reviewed
runner to this rollover packet on
`codex/cad-upload-activation-runner-rebind-2230z`. Merge and smoke that
source-only change before scheduling the one bounded development run.

## Validation

```sh
node --test scripts/cad-upload-admission-activation-window-rollover.test.js scripts/cad-upload-admission-activation-exact-window.test.js scripts/cad-upload-admission-activation-runner-rebind.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
git diff --check
```
