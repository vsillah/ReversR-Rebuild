# CAD development auth/session issuer route mount

Base: `5ebec65f19bac85f56f59afff3e3ec41d9c22688`, after PR #312.
Branch: `codex/cad-dev-session-issuer-route-mount`.
Status: source-only development route mount for the CAD upload-session issuer.
Expenses: USD 0.

## What Changed

`server/cadDevAuthSessionIssuerRouter.js` mounts
`POST /api/cad/dev-upload-session` around the reviewed
`cadDevAuthSessionIssuerBridge` envelope. The production server imports the
router, but passes no provider, store, login resolver, authorization refresher,
or environment switch. That default route therefore returns
`USER_AUTH_UNAVAILABLE` with `Cache-Control: no-store`.

The router serializes only the sanitized response body from the issuer bridge.
It may set the ephemeral `Set-Cookie` header only when an explicitly injected,
non-production development bridge returns success. The route does not register a
body parser and tests instrument request streams to prove it does not read CAD
bytes, form bodies, or generic request bodies.

`server/index.js` mounts the route before general API body parsing and before the
existing `/api/cad/user-import` route. The upload route itself is unchanged and
still keeps `BODY_ADMISSION_AUTHORIZED = false`.

## Preserved Boundaries

- no production upload activation
- no upload body admission
- no CAD file body reads
- no conversion or Sandbox dispatch
- no private CAD
- no default test store or provider fallback
- no environment, provider, resource, secret, usage, or billing changes
- no real-user enrollment or external messages

## Validation

```sh
NODE_PATH=./node_modules node --test scripts/cad-dev-auth-session-issuer-bridge.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-upload-session-browser.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-import-bridge.test.js
node --check server/cadDevAuthSessionIssuerRouter.js
node --check server/cadDevAuthSessionIssuerBridge.js
node --check scripts/cad-dev-auth-session-issuer-bridge.test.js
git diff --check
```

## Next Gate

After this source-only mount is merged and production-smoked fail-closed, the
next CAD Import development-readiness gate is a reviewed development-only
browser/session harness that can call `/api/cad/dev-upload-session` with the
approved synthetic Auth context. That later gate still must stop before upload
body admission, production upload activation, CAD conversion, private CAD,
Sandbox dispatch, provider/resource mutation, or real-user use.
