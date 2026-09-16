# CAD upload admission durable adapter plan

Status: source-only durable-adapter planning. Uploads remain disabled. Base:
`cd17a5f0150894af207ca34349bff00864937c20`, after PR #261. Branch:
`codex/cad-upload-admission-durable-adapter-plan`. Expenses: USD 0.

This packet defines the source contract for a future durable development adapter
for `POST /api/cad/user-import`. It does not mount an adapter, open the request
body parser, mutate any store, change provider/auth/resource settings, read
secrets, enable uploads, dispatch conversion or dispatch Sandbox work.

The durable adapter must use the disabled admission adapter as its rollback
target. If any source, authority, session, budget, revocation, transaction,
evidence or rollback check is missing, the route must remain at
`USER_UPLOADS_DISABLED`.

## Bound refs

- Disabled rollback target:
  `offline/cad-convex/disabledUploadAdmissionAdapter.js` and
  `offline/cad-convex/disabledUploadAdmissionAdapter.json`.
- Activation readiness:
  `offline/cad-convex/userUploadActivationReadiness.json`.
- Run manifest and rollback refs:
  `docs/cad-upload-activation-run-manifest.json`.
- Shared controls and adapter qualification:
  `offline/cad-convex/sharedUploadControls.js`,
  `docs/cad-shared-controls-adapter-qualification.md` and
  `offline/cad-convex/sharedControlsAdapterQualification.json`.
- Development upload-session authority:
  `docs/cad-dev-upload-session-successful-closeout.json`.
- Route gate:
  `server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED`.

## Future adapter contract

The future adapter must select the durable selector server-side, read exact auth
session, upload session, user/shop binding, membership, permission, revocation
revision, ledger window and rollback state inside one serializable transaction,
then commit admission reservation, attempt accounting, cost hold, concurrency
leases, selector fence and sanitized evidence reference atomically.

Only explicit transaction conflicts may retry, and only within a reviewed finite
deadline. Schema failures, missing authority, binding conflicts, revocation,
budget rejection, rollback gate mismatch and malformed inputs are terminal
fail-closed outcomes. Unknown commit outcomes must reconcile with the original
selector only; they cannot switch keys, replay dispatch, delete rows or assume
the operation aborted.

The adapter must not write CAD bytes, conversion jobs, Sandbox dispatch records,
provider credentials, production records or real-user enrollment. It must retain
unresolved reservations, holds, fences and evidence refs through rollback until a
separately reviewed retained-state disposition exists.

## Validation

```sh
node --test scripts/cad-upload-admission-durable-adapter-plan.test.js scripts/cad-upload-admission-disabled-adapter.test.js scripts/cad-upload-activation-run-manifest.test.js scripts/cad-user-upload-activation-readiness.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-durable-adapter-plan to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission durable adapter planning packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Next source-only slice:

> I approve starting the next CAD Import phase for source-only CAD upload admission durable adapter implementation. Scope is local source-only implementation and tests using docs/cad-upload-admission-durable-adapter-plan.json, exact reviewed session/shared-control/run-manifest refs, and offline/cad-convex/disabledUploadAdmissionAdapter.js as rollback target. Preserve BODY_ADMISSION_AUTHORIZED=false and do not mount the adapter in runtime. Do not push, merge, deploy, run live tests, enable CAD uploads, dispatch conversion, use private CAD, mutate stores, change env/provider/auth/resource or usage/billing settings, read or generate secrets, dispatch Sandbox work, send email/SMS/Slack, or cleanup branches/worktrees.
