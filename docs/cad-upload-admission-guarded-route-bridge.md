# CAD upload admission guarded route bridge

Status: source-only guarded bridge model. Uploads remain disabled. Base:
`ada5a8878377f76246724333893a2b1ba5aab94a`, after PR #264. Branch:
`codex/cad-upload-admission-guarded-route-bridge`. Expenses: USD 0.

This packet adds an offline model for the guarded route bridge needed before any
future bounded development upload-admission qualification. It is not imported by
`server/cadUserUploadRouter.js`; the route still has
`BODY_ADMISSION_AUTHORIZED = false` and still returns `USER_UPLOADS_DISABLED`
for otherwise valid sessions.

The model validates the closed qualification-window packet, the disabled adapter
rollback target and the source-only durable adapter. Until a future accepted
window is injected by a test, the bridge can only return the disabled admission
decision. Even accepted test-only dry-runs grant no upload, conversion, Sandbox,
store-mutation or external-effect authority.

## Validation

```sh
node --test scripts/cad-upload-admission-guarded-route-bridge.test.js scripts/cad-upload-admission-qualification-window.test.js scripts/cad-upload-admission-durable-adapter-source.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-guarded-route-bridge to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission guarded route bridge packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only CAD upload admission runtime bridge review. Scope is local source-only implementation and tests to determine whether a disabled-by-default runtime bridge can be introduced without opening production uploads, while preserving BODY_ADMISSION_AUTHORIZED=false, disabled rollback target, exact session/shared-control refs, USD 50 cap, stop-on-unknown handling, and no conversion/Sandbox authority. Do not push, merge, deploy, run live tests, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, retry, start a second run, or cleanup branches/worktrees.
