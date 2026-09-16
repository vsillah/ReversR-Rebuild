# CAD upload admission development activation window

Status: source-only activation-window packet. No live run happened. Base:
`1dbbd4fffa423b240e39ed09a93d7e4eca693c2b`, after PR #278. Branch:
`codex/cad-upload-admission-development-activation-window`. Expenses: USD 0.

This packet accepts the source-only activation executor preview and binds an
exact future bounded development window: `2026-09-16T12:15:00Z` through
`2026-09-16T12:30:00Z`. It does not itself authorize a live run, mutate stores,
read secrets, enable production uploads, dispatch conversion or dispatch
Sandbox work.

Under the existing CAD Import development-readiness autopilot gate, the next
action may be one bounded development-only activation preview during that window
only if the pre-run checks pass. If execution is more than five minutes away,
use a one-shot schedule instead of waiting manually. Stop on unknown outcome, do
not retry, do not start a second run, and preserve retained-state custody.

## Required pre-run checks

- Production route smoke remains fail-closed before the run.
- The accepted window is current and not expired.
- Local `main` is at or after `1dbbd4fffa423b240e39ed09a93d7e4eca693c2b`.
- `server/cadUserUploadRouter.js` still contains
  `const BODY_ADMISSION_AUTHORIZED = false;`.
- No private CAD or CAD bytes are present.
- Sanitized evidence destination is ignored and mode locked.
- A one-shot schedule is used if the run is more than five minutes away.

## Validation

```sh
node --test scripts/cad-upload-admission-development-activation-window.test.js scripts/cad-upload-admission-development-activation-executor.test.js scripts/cad-upload-admission-development-activation-decision.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-development-activation-window to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission development activation window packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Run gate, if autopilot pauses:

> I approve one bounded development-only CAD upload admission activation preview during the accepted window from 2026-09-16T12:15:00Z through 2026-09-16T12:30:00Z on Convex development deployment majestic-alligator-31 using source-only executor preview from merged main commit [merge SHA]. Scope is synthetic refs only, disabled mounted production route, source-reviewed runtime bridge, public fixture metadata only, sanitized ignored evidence, stop-on-unknown/no-retry/no-second-run handling, no-delete retained custody, and fail-closed production route checks before and after. Keep production CAD uploads disabled. No production body admission, CAD files, private CAD, CAD conversion, Sandbox dispatch, real users, enrollment, email/SMS/Slack, new secrets, env/provider/auth/resource or usage/billing changes, deployment, merge, automatic retry, second run, or branch/worktree cleanup.
