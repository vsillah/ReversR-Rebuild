# CAD upload admission qualification window

Status: source-only window assembly. Uploads remain disabled. Base:
`b03540f7c5901d9f4d04372f60027f302e113c56`, after PR #263. Branch:
`codex/cad-upload-admission-qualification-window`. Expenses: USD 0.

This packet binds the future bounded development upload-admission qualification
inputs, but it does not authorize or execute a live run. The current route still
returns `USER_UPLOADS_DISABLED` for valid sessions because
`BODY_ADMISSION_AUTHORIZED` remains `false`, and no guarded runtime bridge is
mounted.

## Bound inputs

- Adapter source: `offline/cad-convex/uploadAdmissionDurableAdapter.js`.
- Disabled rollback target:
  `offline/cad-convex/disabledUploadAdmissionAdapter.js`.
- Accepted upload-session qualification closeout:
  `docs/cad-dev-upload-session-successful-closeout.json`.
- Activation run manifest:
  `docs/cad-upload-activation-run-manifest.json`.
- Shared controls:
  `offline/cad-convex/sharedUploadControls.js`.
- Public fixture candidate: `cube` from
  `scripts/fixtures/cad-public-matrix.json`, SHA-256
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`,
  11,562 bytes, IGES.

The `cube` fixture is only a future admission candidate. This packet grants no
CAD conversion or Sandbox dispatch authority.

## Remaining blockers

- A guarded development runtime bridge is not implemented or mounted.
- A fresh UTC run window is not accepted.
- The exact deployment reference must be rebound after merge.
- Synthetic cohort/window/register evidence must be accepted.
- Rollback and post-run cleanup commands must be source-reviewed.

If the eventual accepted run time is more than five minutes away, use a scheduled
one-shot wakeup instead of holding the thread open.

## Validation

```sh
node --test scripts/cad-upload-admission-qualification-window.test.js scripts/cad-upload-admission-durable-adapter-source.test.js scripts/cad-upload-admission-disabled-adapter.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-qualification-window to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission qualification window packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only guarded CAD upload admission route bridge planning. Scope is local source-only implementation and tests for a disabled-by-default guarded development bridge that can bind an accepted one-run qualification window while preserving production fail-closed behavior, BODY_ADMISSION_AUTHORIZED=false by default, disabled rollback target, exact session/shared-control refs, USD 50 cap, stop-on-unknown handling, and no conversion/Sandbox authority. Do not push, merge, deploy, run live tests, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, retry, start a second run, or cleanup branches/worktrees.
