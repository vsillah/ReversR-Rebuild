# CAD upload admission mounted-development closeout

Status: source-only closeout for the completed bounded mounted-development
upload-admission run. No rerun happened in this packet. Base:
`8bcbca81d24aa0f483bbc7a95274a6590fab56ef`. Branch:
`codex/cad-mounted-dev-upload-run-closeout`. Expenses: USD 0.

The accepted `2026-09-16T18:00:00Z` to `2026-09-16T18:15:00Z`
mounted-development window ran once at `2026-09-16T18:00:43.190Z`.

## What completed

The sanitized local evidence reports:

- Decision: `UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED`
- `runCompleted: true`
- `unknownOutcome: false`
- terminal code: `USER_UPLOADS_DISABLED`
- body admission validated: true
- automatic retry: false
- second run: false

The run stayed bound to PR #287 and the reviewed mounted-development executor
bridge:

- merge commit `8bcbca81d24aa0f483bbc7a95274a6590fab56ef`
- executor bridge commit
  `379e47aa8ece3bf1608ef7324bdfc852ed37826e`
- run ref `rrb-ref:cad-upload-admission-mounted-development-1800z`
- public fixture SHA-256:
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`
- public fixture bytes: `11562`

Sanitized local evidence:

- evidence SHA-256:
  `a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75`
- receipt SHA-256:
  `915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a`
- evidence path:
  `.local/cad-convex/upload-admission-mounted-development-1800z/sanitized-evidence.json`
- receipt path:
  `.local/cad-convex/upload-admission-mounted-development-1800z/sanitized-run-receipt.json`

The local evidence directory is Git-ignored, mode `700`, and the evidence files
are mode `600`. The evidence records no CAD bytes, raw credentials, private CAD,
or content base64.

## Operation evidence

The bounded runner checked the checked-in mounted route before and after the
development-only mounted route copy:

- mounted route disabled checks: 2
- mounted-development body-validation checks: 1
- upload bodies read: 1
- conversion dispatches: 0
- Sandbox dispatches: 0
- store mutations: 0

The checked-in route remained fail-closed before and after the development-only
validation. The route source still keeps:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

## Production smoke

The production smoke after PR #287 stayed fail-closed with cache buster
`qa=8bcbca8`:

- `GET /` -> `200`, title `ReversR Rebuild`
- `GET /api/cad/capabilities` -> `200`
- `POST /api/cad/user-import {}` -> `401 USER_SESSION_REQUIRED`
- `POST /api/cad/import {}` -> `401 UNAUTHORIZED`
- `GET /api/cad/import-source-record` -> `404`

## What this proves

This closeout proves the reviewed mounted-development harness can admit and
validate the public synthetic CAD fixture body while the checked-in user upload
route remains disabled. The run completed once, with no unknown outcome, retry,
second run, conversion dispatch, Sandbox dispatch, store mutation or private CAD.

## What this does not prove

This does not prove user-facing CAD upload readiness.

Still separate:

- production upload activation
- production body admission
- CAD conversion or Sandbox dispatch
- private CAD handling
- real-user enrollment
- provider/resource/auth configuration authority
- production store mutation

## Validation

```sh
node --test scripts/cad-upload-admission-mounted-development-closeout.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next safe action

Prepare a source-only CAD upload activation decision refresh using this
successful mounted-development closeout as input. Stop before production upload
activation, production body admission, CAD conversion, Sandbox dispatch,
provider/resource/env changes, private CAD, real users, retry or a second run.
