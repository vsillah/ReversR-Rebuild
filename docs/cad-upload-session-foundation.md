# CAD upload session verifier foundation

Status: verifier-only, unconfigured and unmounted. User CAD uploads remain disabled.
No issuer, production session store, environment value, upload route, operator route
change, provider call, private CAD input, or deployment is part of this change.

## Integration contract

`server/uploadSession.js` exports `verifyUploadSession(req)`, whose default always
returns `{ ok: false, code: 'AUTH_UNAVAILABLE' }`, and a server-only factory:

```js
const { createUploadSessionVerifier } = require('./uploadSession');
const verifyUploadSession = createUploadSessionVerifier({
  lookupSession, // reviewed authoritative store adapter; no production adapter exists
  allowedOrigins: ['https://approved-app.example'], // cookie transport only
});
```

This module belongs exclusively in the Node server dependency graph. Never import
it from app, hooks, shared client libraries or Expo entrypoints. It reads only Node
request headers/rawHeaders. It never accepts a body, profile, request query, account
row, commercial grant, access password or operator token as identity evidence.

The credential is `us1.` followed by canonical, unpadded base64url encoding of 32
cryptographically random bytes. This is an opaque lookup secret, not client claims
or a self-signed token. Future server issuance must use a CSPRNG after verified
login and verified user/shop membership. There is deliberately no issuance helper
or credential minting endpoint in this foundation. Do not derive credentials from
IDs, passwords or profile data. Version changes require explicit verifier support.

The adapter receives only `sha256(fullCredential)` as lowercase hex and an
`{ signal }` cancellation option. Store this digest rather than the credential.
An altered credential misses the lookup; security depends on 256-bit random secrets
and an access-controlled authoritative store. The adapter must fetch current
revocation, membership and CAD permission on every request, across instances;
stale positive caches, commercial profile matching and permissive fallbacks are
forbidden. Return null for unknown credentials; throw for store unavailability.
Honor the AbortSignal and bound underlying I/O: the verifier stops waiting after
one second, but cannot forcibly cancel an adapter that ignores cancellation.

The authoritative record must contain:

| Field | Required value |
| --- | --- |
| schemaVersion | integer 1 |
| userId, shopId, sessionId | stable opaque IDs, 1–128 characters; alphanumeric first, then alphanumeric or `._:-` |
| expiresAt | positive safe-integer Unix epoch milliseconds; no clock-skew grace |
| authMethod | `password`, `passkey`, or `oidc`, established by the issuer |
| status | explicit `active` or `revoked` |
| transport | `bearer` or `cookie`, bound at issuance |
| cadUploadAllowed | explicit boolean from current server permission/membership state |
| csrfDigest | cookie only: SHA-256 hex of a separate session-bound random 32-byte base64url CSRF secret |

Future issuance must set a bounded lifetime and enforce rotation/logout/revocation.
Missing or malformed fields, unknown schema versions and transport mismatches deny
access. Success returns `{ ok: true, principal }`, with only schemaVersion, userId,
shopId, sessionId, expiresAt, authMethod, transport and cadUploadAllowed (true).
The principal is frozen and excludes store extras and credentials. Permission is
necessary but never sufficient to activate uploads or authorize Sandbox dispatch.

## Transport and safe failure codes

Bearer: `Authorization: Bearer us1.<secret>`. Cookie:
`__Host-reversr-upload-session=us1.<secret>`. Future issuance must use Secure,
HttpOnly, Path=/, no Domain, and an appropriate SameSite setting for that cookie.
Cookie requests additionally require exact Origin membership in the immutable
HTTPS allowlist and `X-Upload-CSRF` matching the session-bound digest. Empty origin
configuration disables cookie authentication. Bearer never falls back to cookies;
mixed transports, duplicate relevant raw headers and duplicate session cookies deny
access. Native bearer integration remains subject to separate review; this module
is not a CSRF exemption or route activation approval.

All failures return exactly `{ ok: false, code }`, without a principal or diagnostic:

| Code | Meaning |
| --- | --- |
| AUTH_UNAVAILABLE | missing/invalid configuration, store error/timeout, invalid clock or unexpected failure |
| SESSION_MISSING | no accepted credential |
| SESSION_MALFORMED | invalid/ambiguous credential transport or token encoding |
| SESSION_INVALID | unknown credential or invalid stored record |
| SESSION_REVOKED | authoritative record revoked |
| SESSION_EXPIRED | expiry reached or passed |
| CAD_PERMISSION_REQUIRED | explicit CAD permission false |
| ORIGIN_OR_CSRF_REJECTED | cookie origin or session-bound CSRF check failed |

There is no request or error logging. These codes are internal adapter outcomes;
a future upload handler should map missing/invalid/revoked/expired/malformed to the
contract's generic 401 USER_SESSION_REQUIRED, unavailable to 503
USER_AUTH_UNAVAILABLE, permission denial to 403 USER_UPLOAD_FORBIDDEN, and cookie
CSRF rejection to 403 ORIGIN_OR_CSRF_REJECTED. Apply no-store before verification.

## Validation and remaining gates

Run `node --test scripts/cad-upload-session.test.js`. Tests use random synthetic
credentials and an in-memory test adapter only, with throwing request-access guards.
They cover forgery, profile/operator bypass attempts, expired/revoked/no-permission
sessions, malformed records, duplicate headers, transport binding, CSRF/origin,
store failures/timeouts and safe response projection. The test adapter is not a
production store or evidence of deployment readiness.

PR #165 (`docs/cad-user-upload-contract.md` on `codex/cad-upload-backend-contract`)
is the source contract; it was open and unmerged when implementation began from
origin/main `83e94e060c24690bdc197ed7fa99a74963462cd7`. That document is not copied
or changed here. Its session foundation gate now has this reviewable implementation;
real issuer/store selection, login integration, cross-instance revocation, membership
and entitlement enforcement remain explicit architecture work. Before any upload
route, review those adapters plus the full disabled gate, shared quotas/concurrency,
enforceable budget, parsing limits and Sandbox controls from the source contract.
Captain review, merge, deployment and human QA are separate downstream gates.
