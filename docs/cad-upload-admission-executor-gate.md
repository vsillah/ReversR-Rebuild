# CAD upload admission executor gate

Status: source-only executor gate. No live run happened. Base:
`8da5535909e2c4e8724a78c3e92ccf7cff53dd9b`, after PR #274. Branch:
`codex/cad-upload-admission-executor-gate`. Expenses: USD 0.

This packet adds a local runner for one future bounded development-only upload
admission qualification during `2026-09-16T11:00:00Z` through
`2026-09-16T11:15:00Z`.

The runner uses an in-memory synthetic upload session and a VM-instrumented copy
of `server/cadUserUploadRouter.js` to exercise the body validator with the
public `occt-import-js` cube fixture. The mounted production route remains
unchanged and still contains `const BODY_ADMISSION_AUTHORIZED = false;`.

## What this proves when run

- The public fixture can be materialized from the installed `occt-import-js`
  dependency with SHA-256
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`.
- The mounted route stays disabled before and after the isolated body-read path.
- The isolated route copy can validate the public IGES upload body and still
  terminate at `USER_UPLOADS_DISABLED`.
- The runner writes sanitized ignored evidence only; it does not record
  `contentBase64`, raw credentials, private CAD, provider values, or raw request
  bodies.

## Boundaries

- One attempt only; no automatic retry and no second run.
- Development-only, local synthetic session only.
- Public fixture only; no private CAD and no real users.
- Stop before conversion and Sandbox dispatch.
- No Convex, Supabase, provider, env, billing, production store, email, SMS or
  Slack mutation.
- Production upload activation remains false.

## Validation

```sh
node --test scripts/cad-upload-admission-executor-gate.test.js scripts/cad-upload-admission-execution-packet.test.js scripts/cad-user-upload-admission.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-admission-executor-gate to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload admission executor gate. No live tests, upload activation, conversion, Sandbox dispatch, private CAD, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, retry, second run, merge, deployment, or branch/worktree cleanup.

Merge:

> I approve marking PR #[number] ready for review and merging it into main. Allow the normal Vercel production deployment from main, then run production fail-closed route smoke and cleanup only if smoke passes. Preserve current production and development environment settings; do not enable CAD uploads, do not dispatch CAD conversion, do not run live tests, do not use private CAD, do not dispatch Sandbox work, do not retry any completed or stopped run, do not start a second run, and do not send email/SMS/Slack.

Run:

> I approve one bounded development-only CAD upload admission qualification run during the accepted window from 2026-09-16T11:00:00Z through 2026-09-16T11:15:00Z using scripts/run-cad-upload-admission-executor-gate.js on the merged main commit for this source packet, public fixture node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.igs with SHA-256 5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3, isolated development-only route copy, in-memory synthetic upload session, sanitized evidence root .local/cad-convex/upload-admission-qualification-1100z, stop-on-unknown/no-retry/no-second-run handling, and pre/post mounted-route fail-closed checks. Keep production CAD uploads disabled. No production body admission, CAD conversion, Sandbox dispatch, private CAD, real users, enrollment, email/SMS/Slack, new secrets, env/provider/auth/resource or usage/billing changes, deployment, merge, automatic retry, second run, or branch/worktree cleanup.
