# CAD upload admission development body-admission window

Status: source-only exact window packet. No live run happened. Base:
`8a333f534c1824d2899010269efba75b98937fc5`. Branch:
`codex/cad-upload-admission-development-body-admission-window`. Expenses:
USD 0.

This packet binds the reviewed body-admission executor to one future
development-only window:

- Start: `2026-09-16T16:30:00Z`
- End: `2026-09-16T16:45:00Z`
- Run ref: `rrb-ref:cad-upload-admission-development-body-admission-1630z`
- Sanitized evidence root:
  `.local/cad-convex/upload-admission-development-body-admission-1630z`

The window runner uses the reviewed source-only executor and the accepted
window packet. It still keeps the mounted route closed:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

## Required pre-run checks

- Production route smoke remains fail-closed before the run.
- Accepted window is current and not expired.
- Local main is at or after `8a333f534c1824d2899010269efba75b98937fc5`.
- Route source still contains `const BODY_ADMISSION_AUTHORIZED = false;`.
- No private CAD, private paths, raw credentials or CAD bytes are present.
- Evidence destination is ignored and mode locked.
- Use a one-shot schedule if execution is more than five minutes away.

## Boundaries

- One attempt only.
- No automatic retry or second run.
- Public synthetic fixture only.
- Body admission only in the isolated route copy.
- Mounted production body admission remains closed.
- No production upload activation.
- No CAD conversion or Sandbox dispatch.
- No private CAD, real users, provider/resource changes, secrets or external
  messages.

## Validation

```sh
node --test scripts/cad-upload-admission-development-body-admission-window.test.js scripts/cad-upload-admission-development-body-admission-executor.test.js scripts/cad-upload-admission-development-body-admission-packet.test.js
node scripts/run-cad-upload-admission-development-body-admission-window.js --preflight
node scripts/run-cad-upload-admission-development-body-admission-window.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

The plain runner command is expected to block before `2026-09-16T16:30:00Z`.

## Next safe action

After this packet is merged, deployed, smoked fail-closed and cleaned up,
schedule or run exactly one bounded development-only body-admission execution
during the accepted window if the pre-run checks still pass.
