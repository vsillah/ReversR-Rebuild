# CAD upload admission development dry-run executor

Status: source-only executor/evidence harness. No live run happened. Base:
`665b86f4ce466edfcd0b40fb9493fadee1474cf7`, after PR #268. Branch:
`codex/cad-upload-admission-development-dry-run-executor`. Expenses: USD 0.

This packet adds a source-only executor preview for the future bounded
development dry-run of the disabled CAD upload admission runtime bridge. The
executor validates the accepted plan shape, replays the offline preview, and
produces a sanitized evidence-preview object. It does not call Convex, mutate
stores, read secrets, parse CAD, enable uploads, dispatch conversion or dispatch
Sandbox work.

The preview remains intentionally short of execution: `liveDevelopmentRun=false`
and `developmentStoreMutationAuthorizedNow=false`. The next gate is source-only
acceptance of this executor preview and an exact future window. Any actual
development run must still remain one attempt, stop on unknown, keep
`BODY_ADMISSION_AUTHORIZED=false`, and write sanitized ignored evidence only.

## Validation

```sh
node --test scripts/cad-upload-admission-development-dry-run-executor.test.js scripts/cad-upload-admission-development-dry-run-plan.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-development-dry-run-executor to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission development dry-run executor packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only CAD upload admission development dry-run acceptance. Scope is local source-only docs/tests/manifests to accept the dry-run executor preview, bind an exact bounded development window, preserve USD 50 cap, no-body-before-gate behavior, stop-on-unknown/no-retry handling, no-delete retained custody, sanitized ignored evidence path requirements, and fail-closed production route checks before any future run. Do not push, merge, deploy, run live tests, start the development dry-run, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, retry, start a second run, or cleanup branches/worktrees.
