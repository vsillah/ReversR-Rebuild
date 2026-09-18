# Development CAD auth/session issuer bridge

Source-only composition based on main `383ff41c958085dc76f04a6c27746b9861e20b0a`
(includes the PR #309 browser/session contract harness).

`server/cadDevAuthSessionIssuerBridge.js` composes the existing bounded session
service and verifier. No shipped server/API route or UI imports it. The factory
requires explicit `enabled: true`, `environment: 'development'`, an exact HTTPS
origin, and server-owned store, login resolution, and authorization refresh
adapters. Missing configuration and production process contexts fail closed.
There is no default provider, test-store fallback, or environment enable switch.

The issuer accepts POST and validates the exact Origin before login resolution.
It passes only a frozen header context to the login resolver; it never passes a
request body, stream, profile claim, user-selected lifetime, or file. The resolver
must authenticate the exact login session and membership using an authoritative
source. Headers are untrusted transport inputs, never identity evidence by
themselves. Provider wiring remains a separate gate.

The lifetime defaults to 60 seconds, is capped at 15 minutes, and cannot exceed
current login expiry. CAD entitlement must be true at issuance and validation.
The shared service stores only credential digests and rechecks the login binding
and entitlement on every validation. Revocation, expiration, malformed records,
unavailable adapters, and bounded-operation timeouts fail closed.

`issueSession(req)` returns a **server-only HTTP envelope** with `statusCode`,
`headers`, and `body`. A future approved HTTP wrapper must set the headers and
serialize **only body**. Never serialize or log the entire envelope: its
`Set-Cookie` carries the ephemeral session credential. The cookie is host-only,
Secure, HttpOnly, SameSite=Strict, Path=/, and bounded by Max-Age. Responses are
no-store. The success body contains only the canonical schema version, status,
and cookie session transport/expiry/CSRF fields expected by
`createCadUploadSessionAdapter`. It contains no login, shop, user, or upload
session identifier. The bridge validates the freshly stored session before
returning success.

`lookupSession` can supply the existing guarded upload router; `verifySession`
uses the same shared verifier directly. A valid session still encounters the
router's literal closed body-admission gate. Guest and default routes are
unchanged. No upload body or conversion executor is wired.

## Validation

Synthetic local tests cover the issuer-to-browser-contract roundtrip, cookie
security, default/non-development/production rejection, denied login and
entitlement, malformed inputs and authoritative records, exact origin and CSRF,
login/store revocation, expiry, unavailable/stalled adapters, no body access, and
the actual upload route handler's closed response. Existing browser harness,
service/store, route, and client bridge tests provide regression coverage.

No live Auth, hosted browser, provider store, private CAD, conversion, Sandbox,
real user, enrollment, message, environment/configuration change, deployment,
merge, or cleanup is part of this gate. No UI changed. The tests use synthetic
identities and ephemeral process-local credentials; they establish source
compatibility, not live readiness.

## Next gate

Captain review and explicit push/draft-PR authorization precede publication.
Live development login/store binding and route mounting require a separate
reviewed scope. Cookie transport assumes HTTPS; this change does not configure
local TLS or make the existing browser's synthetic fixture into real sign-in.

Reproduction (with repository dependencies available):

```sh
node --test scripts/cad-dev-auth-session-issuer-bridge.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-upload-session-browser.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-import-bridge.test.js
node --check server/cadDevAuthSessionIssuerBridge.js
node --check scripts/cad-dev-auth-session-issuer-bridge.test.js
git diff --cached --check
```

This worktree used the existing main checkout's dependencies through `NODE_PATH`;
no package installation or dependency changes were needed. Cookie issuance also
rejects less than one second of remaining validity, so a success cannot produce
an immediately expired Max-Age cookie. No build or live smoke was run.
