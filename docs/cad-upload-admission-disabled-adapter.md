# CAD disabled upload admission adapter

Status: source-only disabled adapter skeleton. Uploads remain disabled. Base:
`2c0cd73ebd916acf2c164879503c63add981030c`, after PR #260. Branch:
`codex/cad-upload-admission-disabled-adapter`. Expenses: USD 0.

This packet adds an offline adapter model that reads the reviewed upload
activation readiness manifest and run-manifest references, validates that every
authority flag remains closed, and returns `USER_UPLOADS_DISABLED`. It is not
imported by runtime server code and it cannot open the request body parser,
conversion, Sandbox dispatch or provider/store writes.

## What changed

- `offline/cad-convex/disabledUploadAdmissionAdapter.js` validates the readiness
  and run-manifest refs that were reviewed in PR #259 and PR #260.
- `offline/cad-convex/disabledUploadAdmissionAdapter.json` records the closed
  adapter state and the next source-only planning step.
- `scripts/cad-upload-admission-disabled-adapter.test.js` proves the adapter
  returns `USER_UPLOADS_DISABLED`, the route still has
  `BODY_ADMISSION_AUTHORIZED = false`, and runtime code does not import the
  offline adapter.

## Preserved boundaries

No live tests, upload activation, CAD conversion, Sandbox dispatch, private CAD,
real users, store mutation, env/provider/auth/resource changes, usage/billing
changes, secret reads, enrollment, email/SMS/Slack or cleanup are authorized by
this packet.

## Validation

```sh
node --test scripts/cad-upload-admission-disabled-adapter.test.js scripts/cad-upload-activation-run-manifest.test.js scripts/cad-user-upload-activation-readiness.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-disabled-adapter to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD disabled upload admission adapter packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only CAD upload admission durable adapter planning. Scope is docs/tests/contracts only: design a durable development adapter that uses the disabled adapter as rollback target, binds exact admission/session/shared-control refs, and stops before live store mutation or route activation. Do not push, merge, deploy, run live tests, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, or cleanup branches/worktrees.
