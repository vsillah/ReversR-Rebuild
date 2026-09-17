# CAD upload activation rollover closeout

Status: source-only closeout for the completed `22:30Z` development
qualification run. No rerun happened. Base:
`48edc745d500bd2ffe418ca3aebbc9bd77a465f8`. Branch:
`codex/cad-upload-activation-rollover-closeout`. Expenses: USD 0.

The one bounded run completed at `2026-09-16T22:31:41.938Z`:

- Decision: `UPLOAD_ACTIVATION_WINDOW_ROLLOVER_EXECUTED`
- `runCompleted: true`
- `unknownOutcome: false`
- Terminal code: `USER_UPLOADS_DISABLED`
- Public synthetic body reads: 1
- Body admission validated: true
- Checked-in route disabled checks: 2
- Conversion dispatches: 0
- Sandbox dispatches: 0
- Store mutations: 0
- Automatic retry: false
- Second run: false

Sanitized local evidence remains ignored and mode locked:

- Evidence SHA-256:
  `29be0ace835239dcaa46ebdb71b247a850b360e072a7043f446b0a418c7e4a8f`
- Receipt SHA-256:
  `298f25e13ca43aee29432954853bd4cc13924b2c39c3767a70552575f313e847`
- Directory mode: `700`
- File mode: `600`
- Obvious private-pattern leak: none observed

PR #293's post-merge production smoke remained fail-closed:

- `GET /` -> `200`, title `ReversR Rebuild`
- `GET /api/cad/capabilities` -> `200`
- `POST /api/cad/user-import {}` -> `401 USER_SESSION_REQUIRED`
- `POST /api/cad/import {}` -> `401 UNAUTHORIZED`
- `GET /api/cad/import-source-record` -> `404`

## Qualification boundary

This proves the reviewed development harness read and validated one public
synthetic IGES body inside the accepted window while the checked-in route
remained disabled. It does not mean uploads are enabled for Mark or any other
user, and it does not prove conversion, Sandbox dispatch, private CAD, or
production readiness.

## Next safe action

Prepare a source-only development conversion and Sandbox readiness decision
that consumes this closeout. The next packet may plan a public-fixture-only
bounded conversion qualification, but it must stop before any live dispatch
until resource bounds, cost cap, exact window, rollback, and sanitized evidence
requirements are reviewed.

## Validation

```sh
node --test scripts/cad-upload-admission-activation-rollover-closeout.test.js scripts/cad-upload-admission-activation-runner-rebind.test.js scripts/cad-upload-admission-activation-window-rollover.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
git diff --check
```
