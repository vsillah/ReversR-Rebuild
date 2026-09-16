# CAD upload admission development body-admission closeout

Status: source-only closeout for the completed bounded development
body-admission run. No rerun happened in this packet. Base:
`ce6494ca1bd250b7d0051ffcaff3e8ac86a3054d`. Branch:
`codex/cad-upload-body-admission-run-closeout`. Expenses: USD 0.

The accepted `2026-09-16T16:30:00Z` to `2026-09-16T16:45:00Z`
body-admission window ran once at `2026-09-16T16:34:38.082Z`.

## What completed

The sanitized local evidence reports:

- Decision: `UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED`
- `runCompleted: true`
- `unknownOutcome: false`
- terminal code: `USER_UPLOADS_DISABLED`
- body admission validated: true
- automatic retry: false
- second run: false

The run stayed bound to PR #283 and the reviewed exact-window packet:

- merge commit `ce6494ca1bd250b7d0051ffcaff3e8ac86a3054d`
- body-admission window commit
  `367789c0d448c156a12a6846936bef6330c07293`
- body-admission executor commit
  `9cdcb68d7b11095a0bc6cb849c6ecdc9d7d71fab`
- run ref `rrb-ref:cad-upload-admission-development-body-admission-1630z`

Sanitized local evidence:

- evidence SHA-256:
  `d5d561c9dbb69fd8c398e46290e960a9078f74c3966671dd88bef71c318ca604`
- receipt SHA-256:
  `90840cf2af29203e17ec2234ef99d662abd77518f012b3b9bbe4be74bd465b84`
- evidence path:
  `.local/cad-convex/upload-admission-development-body-admission-1630z/sanitized-evidence.json`
- receipt path:
  `.local/cad-convex/upload-admission-development-body-admission-1630z/sanitized-run-receipt.json`

The local evidence directory is Git-ignored, mode `700`, and the evidence files
are mode `600`. The evidence records no CAD bytes, raw credentials, private CAD,
or content base64.

## Operation evidence

The bounded runner checked the mounted route before and after the isolated route
copy:

- mounted route disabled checks: 2
- isolated route body-validation checks: 1
- upload bodies read: 1
- conversion dispatches: 0
- Sandbox dispatches: 0
- store mutations: 0

The mounted route remained fail-closed before and after the isolated route-copy
validation. The route source still keeps:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

## Production smoke

The production smoke after PR #283 stayed fail-closed with cache buster
`qa=ce6494c`:

- `GET /` -> `200`, title `ReversR Rebuild`
- `GET /api/cad/capabilities` -> `200`
- `POST /api/cad/user-import {}` -> `401 USER_SESSION_REQUIRED`
- `POST /api/cad/import {}` -> `401 UNAUTHORIZED`
- `GET /api/cad/import-source-record` -> `404`

## What this proves

This closeout proves the reviewed development runner can admit and validate the
public synthetic CAD fixture body inside an isolated route copy while the mounted
route remains disabled. The mounted route remains disabled after the closeout.

## What this does not prove

This does not prove user-facing CAD upload readiness.

Still separate:

- mounted development upload activation
- production upload activation
- CAD conversion or Sandbox dispatch
- private CAD handling
- real-user enrollment
- provider/resource/auth configuration authority
- production store mutation

## Validation

```sh
node --test scripts/cad-upload-admission-development-body-admission-closeout.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next safe action

Prepare a source-only mounted development upload-readiness packet using this
successful isolated body-admission closeout as input. Stop before live mounted
upload activation, production upload activation, CAD conversion, Sandbox
dispatch, provider/resource/env changes, private CAD, real users, retry or a
second run.
