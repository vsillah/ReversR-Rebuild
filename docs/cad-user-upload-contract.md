# Proposed user CAD upload contract

Status: blocked at authentication design; specification only. No route, feature flag,
capability response, UI, operator behavior, or deployment changes are implemented.
Baseline: `83e94e060c24690bdc197ed7fa99a74963462cd7` (PR #164).

## Evidence and exact blocker

- `server/commercialization.js`: `requestProfile` derives identity from caller-supplied
  profile headers/body and falls back to an anonymous identity. `ensureAccount` uses
  that identity; it is not a verified session boundary.
- `getCommercialAccessGrant` also supports profile-based tester and client-bound invite
  grants. Those paths cannot establish a trustworthy upload principal on their own.
- `resolveAuthenticatedGrant` verifies a stored password, but is an internal
  commercial helper. It does not establish a session issuance, expiry, revocation,
  CSRF, or CAD entitlement contract.
- `hooks/useCommercialization.tsx` sends locally stored profile and access-password
  headers. No verified upload-session adapter is established by this flow.
- `server/index.js` mounts the protected CAD router before the general JSON parser.
  `server/cadSandboxRouter.js` authenticates operator requests before its own parser.
  That ordering and operator authentication must remain intact.

The requested stop condition applies: choosing a user identity mechanism here would
be guesswork. A client ID, email, tester grant, existing account row, or operator token
must not be repurposed as a user upload session. Runtime implementation and its
acceptance tests remain outstanding; this document is not evidence they pass.

## Decision required to unblock

Approve a session foundation (recommended) or identify an existing server verifier
with the same guarantees. Define credential transport for web and native clients,
issuer/store, expiry and revocation, verified user/shop binding, and explicit CAD
permission. A session foundation is additional scope; the upload lane should consume
its reviewed verifier rather than implement an ad hoc credential protocol.

The proposed server-only verifier interface is `verifyUploadSession(req)` returning
an authenticated principal containing stable user and shop IDs, session ID, expiry,
authentication method, and CAD permission. Invalid/expired/revoked credentials return
no principal; verifier failures fail closed. It must inspect credentials in headers
or cookies only, never read the request body, and never trust profile headers.
Cookie sessions additionally require session-bound CSRF validation.

## Proposed request pipeline (not implemented)

A separate `POST /api/cad/user-import` handler must be mounted before every body
parser. Keep `/api/cad/import` operator-only and unchanged.

1. Set `Cache-Control: no-store`. Verify the session without reading upload content.
   Invalid/missing sessions return 401 `USER_SESSION_REQUIRED`; unavailable verifier
   returns 503 `USER_AUTH_UNAVAILABLE`. No upload decoding or dispatch occurs.
2. Check server-side CAD permission; reject with 403 `USER_UPLOAD_FORBIDDEN`.
3. For cookie auth, require exact Origin membership in a dedicated server-configured
   HTTPS allowlist and a session-bound CSRF token in a header. Missing/mismatched
   values return 403 `ORIGIN_OR_CSRF_REJECTED`. No wildcard or reflected origin; no
   forwarded-host-derived trust. Native bearer transport needs an explicit reviewed
   exemption from cookie CSRF requirements and must never fall back to cookies.
4. Check a future server-only `CAD_USER_UPLOADS_ENABLED` switch, default false, and
   reviewed session, quota, budget and executor adapters. The switch alone cannot
   authorize dispatch. While disabled, return 503 `USER_UPLOADS_DISABLED` without
   reading the body. Operator infrastructure configuration never enables this gate.
5. Reserve an atomic, expiring per-user/per-shop rate and concurrency lease plus an
   enforceable shared cost budget before decoding. Absent/unavailable control adapters
   return 503 `UPLOAD_CONTROLS_UNAVAILABLE`; exhausted limits return 429
   `UPLOAD_LIMIT_REACHED`. Proposed initial bounds: one concurrent upload per user
   and per shop, five attempts per minute per user, and the existing executor limit.
   No implicit nonzero spending budget. Cross-instance enforcement is required;
   in-memory counters alone cannot authorize hosted dispatch.
6. Accept only uncompressed `application/json`, at most 384 KiB, with a streaming
   limit that also covers chunked requests and dishonest/missing Content-Length.
   Reject unsupported content encoding/type with 415, size overflow with 413 and
   malformed JSON with 400. Use fixed safe errors, including parser errors.
7. Require exactly `fileName`, `mimeType`, `contentBase64`; reject arrays, unknown
   fields, empty content, unsafe names, path syntax and noncanonical base64. Enforce
   256 KiB decoded and bounded encoded length before allocation. Proposed extension
   allowlist: `.igs`, `.iges`; MIME allowlist: `model/iges`, `application/iges`,
   `application/octet-stream`. Generic MIME is permitted only with an IGES extension
   and the existing IGES content validation. MIME never proves content validity.
   Reuse `cadWorkerContract.upload` after removing validated MIME metadata.
8. Dispatch only through the reviewed Sandbox executor with abort propagation.
   Preserve 1 vCPU, 2048 MB, deny-all network, 60-second lifetime, request/command/
   cleanup deadlines, output bounds, and cleanup-failure blocking. Never replace
   cleanup confirmation with lease release. Retain/reconcile budget reservations
   when dispatch or cleanup outcome is uncertain; otherwise release in `finally`.

Earlier gates take precedence: disabled requests intentionally do not parse malformed
or oversized bodies. Validation cases run against injected, synthetic authenticated
and enabled test adapters; they never enable production or use a real Sandbox.

## Safe response and capability semantics

User errors have exactly `{ schemaVersion: 1, status: "error", code, message }` with
allowlisted constant codes/messages. Do not forward executor diagnostics, exceptions,
headers, original filenames, paths, base64, CAD content, or credentials. Logs may
record only an opaque request ID and safe outcome code, with no request/body logging.

Retain the current capability fields for existing operator consumers. A future
additive `userUploads` object should independently report `available: false`,
`status: "disabled"`, and a constant reason code. It must remain false even when
operator `configured`/`enabled` is true, until every reviewed user gate is ready.
Do not return environment values or provider/operator credentials. Capability status
is informational; the POST route independently enforces all gates.

## Required offline acceptance matrix

- Missing, forged, expired and revoked sessions: reject before body-read/decode and
  with zero executor calls; profile and operator-token headers cannot bypass auth.
- Valid session plus disabled switch: fixed disabled response, zero body reads and
  zero dispatch; test even when operator infrastructure is configured.
- Valid cookie session with absent/wrong Origin or CSRF: reject before parser.
- Synthetic enabled adapters: malformed/chunked/oversized JSON, unsupported MIME or
  extension, unsafe names, invalid base64 and oversized decoded input fail safely.
- Missing control adapter, quota exhaustion, overlapping requests and budget failure:
  no dispatch; cancellation and uncertain cleanup retain the required blocking state.
- Inject synthetic payload and token sentinels into headers, bodies and thrown errors;
  assert they never appear in serialized responses or captured logs. No real secrets
  or private CAD fixtures are needed.
- Existing protected/operator tests remain unchanged and pass. Capability tests cover
  operator-configured/user-disabled separately. Run typecheck, API preflight,
  changed-file leak scan and `git diff --check` after runtime implementation.

## Handoff

No user CAD upload behavior is implemented or enabled. Authentication design approval
is the next gate, followed by implementation of this contract and its offline tests.
Merge, deployment, production configuration, private CAD inputs, user activation,
and human QA remain with the captain and their separately authorized gates.
