# CAD upload admission development dry-run plan

Status: source-only development dry-run plan. No live run happened. Base:
`2d13fdbb72a5369bd4edfd6fa802a75f94ddd02f`, after PR #267. Branch:
`codex/cad-upload-admission-development-dry-run-plan`. Expenses: USD 0.

This packet binds the disabled runtime bridge source to a future bounded
development dry-run plan using synthetic upload-session and shared-control refs.
It does not run the dry-run, mutate Convex, enable body admission, read secrets,
activate uploads, dispatch conversion or dispatch Sandbox work.

The local preview uses `server/cadUploadAdmissionRuntimeBridge.js` with
`enabled=true` and `acceptedWindow=true` only inside a source-only test harness.
The injected planner calls the offline shared-controls transaction model and
then forces admission, conversion, Sandbox dispatch and store mutation authority
to remain false. The mounted production route still does not import the bridge.

## Boundaries

- All-in planning cap remains USD 50.
- One attempt only; no automatic retry and no second run.
- Stop on unknown outcome.
- No body read authority and `BODY_ADMISSION_AUTHORIZED=false`.
- No deletion of retained state; Amina is backup custodian and Vambah remains
  accountable custodian.
- Production route smoke must remain fail-closed before and after any future
  bounded development execution.

## Validation

```sh
node --test scripts/cad-upload-admission-development-dry-run-plan.test.js scripts/cad-upload-admission-runtime-bridge-source.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-development-dry-run-plan to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission development dry-run plan packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only CAD upload admission development dry-run executor. Scope is local source-only implementation and tests for one bounded development dry-run executor/evidence harness using the disabled runtime bridge source, accepted synthetic upload-session/shared-control refs, USD 50 cap, no-body-before-gate behavior, stop-on-unknown/no-retry handling, no-delete retained custody, sanitized evidence, and fail-closed production route preservation. Do not push, merge, deploy, run live tests, start the development dry-run, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, retry, start a second run, or cleanup branches/worktrees.
