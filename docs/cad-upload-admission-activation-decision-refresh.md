# CAD upload admission activation decision refresh

Status: source-only decision refresh. It accepts the mounted-development
upload-admission closeout as planning evidence and authorizes no execution.
Base: `c74de5b1deecfd1bb8741190ef702e670dce41c4`. Branch:
`codex/cad-upload-activation-decision-refresh`. Expenses: USD 0.

## Accepted input

The latest mounted-development upload-admission closeout is accepted as the input
for this decision refresh:

- PR #288 merge commit `c74de5b1deecfd1bb8741190ef702e670dce41c4`
- Run ref `rrb-ref:cad-upload-admission-mounted-development-1800z`
- Decision: `UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED`
- Evidence SHA-256:
  `a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75`
- Receipt SHA-256:
  `915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a`
- Public fixture SHA-256:
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`
- Public fixture bytes: `11562`

That closeout proved a reviewed mounted-development harness can validate the
public IGES body once, with a known terminal `USER_UPLOADS_DISABLED` result, no
unknown outcome, no retry, no second run, no conversion dispatch, no Sandbox
dispatch and no store mutation.

## Current guards

- `server/cadUserUploadRouter.js` must retain
  `const BODY_ADMISSION_AUTHORIZED = false;`.
- The checked-in production route remains disabled.
- The runtime bridge remains unmounted for production body admission.
- The current terminal code remains `USER_UPLOADS_DISABLED`.
- Conversion and Sandbox dispatch remain unauthorized.
- Private CAD, real users, external messages, env/provider/resource changes,
  usage/billing changes and secret reads remain unauthorized.

## Decision

The development synthetic upload path may proceed to a source-only exact-window
packet. That is not a live run approval. The future packet must bind:

- exact UTC window
- reviewed runner and merged source commit
- sanitized local evidence destination
- pre/post checks proving the checked-in route stays disabled
- rollback receipt contract
- one attempt, no automatic retry and no second run
- USD 50 all-in ceiling
- public synthetic fixture only

Production upload activation, production body admission, conversion, Sandbox
dispatch, private CAD and real users remain separate gates.

## Next safe action

Create `codex/cad-upload-activation-exact-window` as a source-only exact-window
packet for one future development-only synthetic upload activation attempt. Stop
before live execution, production upload activation, production body admission,
CAD conversion, Sandbox dispatch, private CAD, real users, provider/resource/env
changes, usage/billing changes, retry or a second run.

## Validation

```sh
node --test scripts/cad-upload-admission-activation-decision-refresh.test.js scripts/cad-upload-admission-mounted-development-closeout.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
