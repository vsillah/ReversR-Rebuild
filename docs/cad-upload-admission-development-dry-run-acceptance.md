# CAD upload admission development dry-run acceptance

Status: source-only acceptance packet. No live run happened. Base:
`8c00d30acdc242d8900fcf87f700afffc8d36b02`, after PR #269. Branch:
`codex/cad-upload-admission-development-dry-run-acceptance`. Expenses: USD 0.

This packet accepts the source-only dry-run executor preview and binds an exact
future bounded development window: `2026-09-16T04:15:00Z` through
`2026-09-16T04:30:00Z`. It does not itself authorize a live run, mutate stores,
read secrets, enable uploads, dispatch conversion or dispatch Sandbox work.

Under the existing development-readiness autopilot gate, the next action may be
one bounded development-only dry-run during that window only if the pre-run
checks pass. If execution is more than five minutes away, use a one-shot
schedule instead of waiting manually. Stop on unknown outcome, do not retry, do
not start a second run, and preserve retained-state custody.

## Required pre-run checks

- Production route smoke remains fail-closed before the run.
- The accepted window is current and not expired.
- Local `main` is at or after `8c00d30acdc242d8900fcf87f700afffc8d36b02`.
- No private CAD or CAD bytes are present.
- Sanitized evidence destination is ignored and mode locked.
- A one-shot schedule is used if the run is more than five minutes away.

## Validation

```sh
node --test scripts/cad-upload-admission-development-dry-run-acceptance.test.js scripts/cad-upload-admission-development-dry-run-executor.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-development-dry-run-acceptance to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission development dry-run acceptance packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Run gate, if autopilot pauses:

> I approve one bounded development-only CAD upload admission dry-run during the accepted window from 2026-09-16T04:15:00Z through 2026-09-16T04:30:00Z on Convex development deployment majestic-alligator-31 using source-only executor preview from merged main commit [merge SHA]. Scope is synthetic refs only, disabled runtime bridge source, no body admission opening, sanitized ignored evidence, stop-on-unknown/no-retry/no-second-run handling, no-delete retained custody, and fail-closed production route checks before and after. Keep CAD uploads disabled. No production, CAD files, private CAD, CAD upload activation, CAD conversion, Sandbox dispatch, real users, enrollment, email/SMS/Slack, new secrets, env/provider/auth/resource or usage/billing changes, deployment, merge, automatic retry, second run, or branch/worktree cleanup.
