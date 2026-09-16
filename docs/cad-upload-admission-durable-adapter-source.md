# CAD upload admission durable adapter source

Status: source-only adapter model. Uploads remain disabled. Base:
`e8bd6ee81b76d6f63cb2c2abb7c0f8880fd322a0`, after PR #262. Branch:
`codex/cad-upload-admission-durable-adapter-source`. Expenses: USD 0.

This packet adds an offline durable adapter model for future CAD user-upload
admission qualification. It validates the reviewed plan, uses the disabled
admission adapter as its rollback target, and delegates source-only dry-run
transaction proposals to `offline/cad-convex/sharedUploadControls.js`.

It is not imported by runtime code. `BODY_ADMISSION_AUTHORIZED` remains `false`.
Normal calls return `USER_UPLOADS_DISABLED`; only test-only dry-run calls can
preview reserve, fence, unknown, cancel, reconcile and bounded reconciliation
selection. Those previews return no upload, conversion, Sandbox, store-mutation
or external-effect authority.

## Source contract

- `offline/cad-convex/uploadAdmissionDurableAdapter.js` validates the closed plan,
  disabled rollback target, activation readiness and run manifest before creating
  a source-only adapter.
- `offline/cad-convex/uploadAdmissionDurableAdapter.json` records that the model
  is disabled, unmounted and not live-ready.
- `scripts/cad-upload-admission-durable-adapter-source.test.js` proves the adapter
  falls back to `USER_UPLOADS_DISABLED`, dry-run proposals preserve closed
  authority, route body admission stays false, and runtime code does not import
  the offline adapter.

## Validation

```sh
node --test scripts/cad-upload-admission-durable-adapter-source.test.js scripts/cad-upload-admission-durable-adapter-plan.test.js scripts/cad-upload-admission-disabled-adapter.test.js scripts/cad-upload-shared-controls.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-durable-adapter-source to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission durable adapter source packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only CAD upload admission qualification window assembly. Scope is docs/tests/contracts only: bind one future bounded development upload-admission qualification window to the disabled-by-default durable adapter source, accepted session evidence, shared-control state, rollback target, all-in USD 50 cap, synthetic/public fixture reference, and stop-on-unknown reconciliation. Do not push, merge, deploy, run live tests, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, retry, start a second run, or cleanup branches/worktrees.
