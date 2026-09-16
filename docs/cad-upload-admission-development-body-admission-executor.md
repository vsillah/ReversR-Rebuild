# CAD upload admission development body-admission executor

Status: source-only executor. No live run happened. Base:
`b0f5760f886bf5028f8d2ebb92a5a7d2eb6fc536`. Branch:
`codex/cad-upload-admission-development-body-admission-executor`. Expenses:
USD 0.

This packet adds a bounded local executor for a future development-only
body-admission run. It consumes the accepted body-admission packet and keeps the
mounted route closed:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

The runner can only validate upload bodies through an isolated VM route copy
where that literal is replaced in memory. The default runner path has no
accepted window and therefore blocks with `BODY_ADMISSION_WINDOW_NOT_ACCEPTED`.

## What the executor can do after a future window packet

- Verify the body-admission packet and prior closeouts.
- Pre-check the mounted route with a malformed body and confirm no body read.
- Materialize only the public synthetic cube fixture from `occt-import-js`.
- Validate the public fixture body through an isolated route copy.
- Post-check the mounted route and confirm it is still fail-closed.
- Write sanitized ignored evidence under `.local/` with directory mode `700` and
  file mode `600`.

## What it does not do

- It does not authorize a live run by this packet.
- It does not edit or mount `server/cadUserUploadRouter.js`.
- It does not enable production CAD uploads or production body admission.
- It does not dispatch conversion or Sandbox work.
- It does not use private CAD, real users, secrets, provider changes or external
  messages.
- It does not retry, start a second run or delete retained state.

## Validation

```sh
node --test scripts/cad-upload-admission-development-body-admission-executor.test.js scripts/cad-upload-admission-development-body-admission-packet.test.js scripts/cad-upload-admission-development-activation-closeout.test.js scripts/cad-upload-admission-qualification-closeout.test.js
node scripts/run-cad-upload-admission-development-body-admission-executor.js --preflight
node scripts/run-cad-upload-admission-development-body-admission-executor.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

The plain runner command is expected to exit non-zero until a separate accepted
window packet exists.

## Next safe action

Prepare a source-only body-admission window packet with one exact future UTC
window, sanitized evidence destination and cost/custody confirmation. That next
gate remains separate from live execution and still stops before production
upload activation, conversion, Sandbox dispatch, private CAD, real users and
external delivery.
