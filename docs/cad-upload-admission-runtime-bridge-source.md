# CAD upload admission runtime bridge source

Status: source-only runtime bridge source. Uploads remain disabled. Base:
`17b79c511dfe47eb6b7c250f8840849403ff0cd4`, after PR #266. Branch:
`codex/cad-upload-admission-runtime-bridge-source`. Expenses: USD 0.

This packet adds `server/cadUploadAdmissionRuntimeBridge.js` as reviewed source
for a future disabled-by-default runtime bridge. It is not imported by
`server/cadUserUploadRouter.js`; the mounted route still keeps
`BODY_ADMISSION_AUTHORIZED = false` and still returns `USER_UPLOADS_DISABLED`
for otherwise valid upload sessions.

The bridge has no environment switch, request flag, provider client, store
client, body parser, conversion path or Sandbox path. By default it returns the
disabled rollback. A test-only accepted window can inject a dry-run planner, but
the bridge rejects any proposal that authorizes admission, conversion, Sandbox
dispatch or store mutation.

## Runtime source constraints

- Default-disabled: `enabled=false` and `acceptedWindow=false`.
- No body authority: callers must pass `bodyAdmissionAuthorized=false`, and the
  bridge returns `BODY_ADMISSION_MUST_REMAIN_FALSE` if that is not true.
- Session-bound: dry-run planning requires a validated upload-session principal
  with `cadUploadAllowed=true`.
- Proposal-bound: returned proposals must preserve false admission, conversion,
  Sandbox dispatch and store mutation authority.
- Route-isolated: `cadUserUploadRouter.js` does not import the bridge.

## Validation

```sh
node --test scripts/cad-upload-admission-runtime-bridge-source.test.js scripts/cad-upload-admission-runtime-bridge-review.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-runtime-bridge-source to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission runtime bridge source packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only CAD upload admission development dry-run planning. Scope is local source-only docs/tests/manifests to bind the disabled runtime bridge source to a bounded development dry-run plan using synthetic upload-session/shared-control refs, accepted evidence bindings, USD 50 cap, rollback/cleanup receipts, stop-on-unknown handling, no automatic retry, no body admission opening, no CAD conversion, no Sandbox authority, and fail-closed production route preservation. Do not push, merge, deploy, run live tests, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, retry, start a second run, or cleanup branches/worktrees.
