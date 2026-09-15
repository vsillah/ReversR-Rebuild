# CAD development upload/session qualification rebind

Base: `4ad8ff8e50ac78e8171c4ff8ae6cb6e0d2b14467`, after PR #248.
Branch: `codex/cad-upload-session-2230z-rebind`.
Status: source-only rebind for one future development-only upload-session
qualification run. Expenses: USD 0.

## What Changed

This slice binds the disabled-by-default bridge from PR #248 to one accepted
restricted local register and one fresh UTC window after the stopped `21:30Z` attempt:

- run ID: `cad-dev-upload-session-2230z`
- window: `2026-09-15T22:30:00Z` through `2026-09-15T22:45:00Z`
- projection digest: `5d56b109da11edc6ca71cd48fcaa9a960055e71aeb2f1ea4ca690b3ca7ba7383`
- acceptance receipt digest: `e5a38f6164daca7dd474823e99b3c49571359794d7833ece49cddc17ce7d7d56`
- private register digest: `0dbdedbc727fed0e5f87dfa636b638a1cf9a5780df5c004d81643ac2089a6a74`

The raw run key remains only in ignored local evidence under
`.local/cad-convex/upload-session-qualification-rebind-2230z/`.

## Boundary

This source rebind does not authorize a live run by itself. It also does not
authorize upload activation, body admission, CAD files, private CAD, conversion,
Sandbox dispatch, real users, production mutation, provider/resource/env changes,
usage/billing changes, email/SMS/Slack, retry or a second run.

## Expected Development-Only Sequence

When separately triggered inside the accepted window on development deployment
`majestic-alligator-31`, the bridge may perform only:

1. digest and UTC-window validation,
2. one run-owned synthetic authority provision,
3. one synthetic upload-session insert-if-absent,
4. one active read,
5. one upload-session revoke without deletion,
6. one synthetic authority revoke without deletion,
7. one post-revoke read that must observe revocation.

The route gate remains disabled: `bodyAdmissionAuthorized` is false, conversion
is false and retained revoked state is required.

## Validation

```sh
node --test scripts/cad-dev-upload-session-qualification-rebind.test.js
node --test scripts/cad-dev-upload-session-qualification-bridge.test.js
npm run cad:convex:codegen:check
npm run typecheck
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next

After this source-only rebind is merged, deployed and production-smoked
fail-closed, the next gate is the bounded development-only Convex qualification
run inside the accepted UTC window. If the window is more than five minutes away,
schedule the run instead of idle polling.
