# CAD development upload/session qualification rebind

Base: `1f5eeae09583d51f411209a7a07a926126070e1b`, after PR #255.
Branch: `codex/cad-upload-session-0100z-rebind`.
Status: source-only rebind for one future development-only upload-session
qualification run. Expenses: USD 0.

## What Changed

This slice binds the disabled-by-default bridge to one accepted restricted local
register and one fresh UTC window after the stopped `22:30Z` attempt and the
source-only authenticated bridge-call repair:

- run ID: `cad-dev-upload-session-0100z`
- window: `2026-09-16T01:00:00Z` through `2026-09-16T01:15:00Z`
- projection digest: `3f405f0eafa4e3834b99d9ee69547402a0690e79e705dacd13a764b8e4b7e640`
- acceptance receipt digest: `d6a09751cece8326d6a242686ca310fa9b4a3abace455dcbd23e739b9223f930`
- private register digest: `a491d8ac48374942ecb2662b88e148cf4d42e45bac048cfdc92e50c3eb262dce`

The raw run key remains only in ignored local evidence under
`.local/cad-convex/upload-session-qualification-rebind-0100z/`.

## Boundary

This source rebind does not authorize a live run by itself. It also does not
authorize upload activation, body admission, CAD files, private CAD, conversion,
Sandbox dispatch, real users, production mutation, provider/resource/env changes,
usage/billing changes, email/SMS/Slack, retry or a second run.

## Expected Development-Only Sequence

When separately triggered inside the accepted window on development deployment
`majestic-alligator-31`, the bridge may perform only:

1. digest and UTC-window validation,
2. execution through the authenticated synthetic session client,
3. one run-owned synthetic authority provision,
4. one synthetic upload-session insert-if-absent,
5. one active read,
6. one upload-session revoke without deletion,
7. one synthetic authority revoke without deletion,
8. one post-revoke read that must observe revocation.

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
