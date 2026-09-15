# CAD development upload/session qualification rebind

Base: `c0194fba15bcdb340b006758f45fbfcc4aeba6ef`, after PR #248.
Branch: `codex/cad-dev-upload-session-qualification-rebind`.
Status: source-only rebind for one future development-only upload-session
qualification run. Expenses: USD 0.

## What Changed

This slice binds the disabled-by-default bridge from PR #248 to one accepted
restricted local register and one UTC window:

- run ID: `cad-dev-upload-session-2130z`
- window: `2026-09-15T21:30:00Z` through `2026-09-15T21:45:00Z`
- projection digest: `9ba800eb47ccec11923149a0af9f3c05558abbce38a2a9c0c856db75783cf036`
- acceptance receipt digest: `de8c962603a1ccace7f899b8b00a6771ade6acd63a7c4437b761ab90feca17dc`
- private register digest: `fbfba940d28e565a89d43535c83a0f647e2197dea3c1a5fcd9df8f5c9427200f`

The raw run key remains only in ignored local evidence under
`.local/cad-convex/upload-session-qualification-rebind/`.

## Boundary

This source rebind does not authorize a live run by itself. It also does not
authorize upload activation, body admission, CAD files, private CAD, conversion,
Sandbox dispatch, real users, production mutation, provider/resource/env changes,
usage/billing changes, email/SMS/Slack, retry or a second run.

## Expected Development-Only Sequence

When separately triggered inside the accepted window on development deployment
`majestic-alligator-31`, the bridge may perform only:

1. digest and UTC-window validation,
2. one synthetic upload-session insert-if-absent,
3. one active read,
4. one revoke without deletion,
5. one post-revoke read that must observe revocation.

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
