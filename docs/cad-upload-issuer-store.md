# CAD upload issuer/store foundation

Status: server-only contract plus synthetic in-memory adapter. The disabled user
route consumes the unconfigured default lookup service. CAD uploads remain disabled.
This does not authorize session issuance, Sandbox dispatch, production
configuration, deployment, or user activation.

Phase 1 follow-up: [verified login and durable storage contract](cad-verified-login-store.md)
now requires `loginSessionId` in both callbacks and persisted schema v2. The
production provider gate remains unresolved.

## Existing trust boundary

Inspected `server/commercialization.js`: `requestProfile` accepts client/profile
headers and body fields. `findMatchingStoredGrant` matches client ID, email, profile
name or shop name. `getCommercialAccessGrant` includes environment allowlists and
client-bound invite matching, as well as password branches. A commercial grant
therefore does not universally prove a verified user login and shop membership.
The password branches do not supply a durable upload-session identity contract.
`loadStore`/`saveStore` use a local JSON file (default under the OS temporary
folder), without shared transactional revocation semantics. None is consumed here.

No suitable authoritative login/session source and shared durable upload store were
established by this inspection. The lowest-risk next step is to review and select
those adapters explicitly. This slice does not select a database or auth provider.

## Module contract

`server/uploadSessionStore.js` exports `createUploadSessionService`, the default
`uploadSessionService` (always unconfigured), `MAX_LIFETIME_MS`, and
`createInMemoryUploadSessionStoreForTests({ testOnly: true })`. Never import these
modules into app, hooks, Expo entrypoints or shared client libraries. The server entrypoint mounts the disabled route, which consumes this module without
configuring a production store or mounting issuance/revocation endpoints.

A configured service requires all three dependencies:

- `store`: `insertIfAbsent(credentialDigest, record, { signal })`,
  `read(credentialDigest, { signal })`, `revoke(credentialDigest, revokedAt, { signal })`.
- `resolveAuthorization(context, { signal })`: verify login, current membership and
  CAD permission using an authoritative server source. `context` is an opaque
  caller-defined login handle, not a trusted principal merely because it has IDs.
- `refreshAuthorization(binding, { signal })`: fetch current login validity,
  user/shop membership and CAD permission on every active, unexpired lookup.
  Binding contains only userId, shopId, sessionId, loginSessionId and authMethod; no credential,
  request, profile or body. A production adapter must maintain the linkage from
  this upload session to its authoritative login, including logout invalidation.

Both auth callbacks return `{ userId, shopId, loginSessionId, authMethod, cadUploadAllowed,
expiresAt }`, with the identity/permission schema used by the existing verifier
and `expiresAt` bounding the underlying authorization lifetime. Return null for
unverified/revoked identity or membership, and throw for unavailable infrastructure.
Callbacks are privileged injected code: schema checking does not authenticate a
callback's claims. Do not implement either callback by echoing the context, profile
headers, a commercial grant or client-submitted `{ verified: true }`.

`issueSession(context, { transport = 'bearer', lifetimeMs = MAX_LIFETIME_MS })`
returns `{ ok: true, credential, sessionId, expiresAt, csrf? }`. Credentials contain
32 CSPRNG bytes and the existing `us1.` prefix. Cookie CSRF uses independent random
32-byte base64url material. Only SHA-256 digests of the full credential and CSRF
secret reach persistence. Raw values are returned once for future secure delivery;
never log them. There is no delivery endpoint in this slice.

The foundation caps lifetime at 15 minutes and at authorization expiry; this is a
conservative code ceiling, not an approved production login policy. Lifetimes must
be positive integer milliseconds. Permission false may be recorded, but such a
session never gains CAD permission even if a later refresh is true: reissue after
a fresh authorization decision. Renewal/rotation must issue a new credential and
revoke the old one; no renewal API or HTTP logout route is mounted here.

`lookupSession(sha256Hex, { signal })` plugs directly into
`createUploadSessionVerifier({ lookupSession: service.lookupSession, ... })`.
Every call reads the store, checks record shape, lifetime and transport metadata,
then refreshes current authorization for active, unexpired sessions. It never
caches positive results. Changed user/shop/auth-method binding denies access.
Revoked/expired records are returned for the verifier's existing safe codes;
unknown records or denied current membership return null. Records and callback
bindings are projected to allowed fields. No request body is accepted or read.

`revokeSession(sha256Hex)` returns `{ ok: true }` only after store acknowledgement;
unknown digests return `SESSION_INVALID`. This is a privileged module operation,
not a public token-revocation endpoint. Revocation is irreversible for a stored
credential. Repeated revocation is idempotent.

Issuer/revoker failures return `{ ok: false, code }` only: `AUTH_UNAVAILABLE`,
`ISSUE_INVALID`, `AUTHORIZATION_REQUIRED`, or `SESSION_INVALID`. Lookup throws only
`Error('AUTH_UNAVAILABLE')` on infrastructure/schema failures, allowing the existing
verifier to produce its fail-closed result. No internal error messages are logged
or returned. Operations stop waiting after one second and propagate cancellation.

## Required production backing and remaining decisions

The test store is process-local, explicitly opted in, and loses all records on
restart. Two service objects sharing that test store exercise freshness semantics;
this is not evidence of cross-process or cross-region consistency.

A production adapter must provide atomic insert-if-absent keyed by a unique
credential digest; acknowledged durable writes; strongly consistent current reads;
atomic irreversible revocation; protected storage and access controls; expiry
cleanup; and authoritative logout/membership/permission invalidation across all
instances. Errors must never fall back to a default record or local positive cache.
Keep verifier schema v1; persisted schema v2 adds required loginSessionId, issuedAt
and optional revokedAt metadata. Reject old stored records without login linkage.

Honor AbortSignal and bound underlying database/auth I/O. A Promise timeout cannot
undo an external write or forcibly cancel an adapter. A timed-out issue must never
return its credential, but an adapter ignoring cancellation could leave an
inaccessible expiring record. Production transaction/cancellation and retry
semantics must be reviewed before wiring. Atomic rotation and bulk logout linkage
remain production-adapter requirements. Concurrent verification and revocation
have the store read's consistency boundary; revocation does not undo an already
completed verification. Future dispatch authorization must account for that boundary.

Before activation, explicitly decide the authoritative login/membership source,
durable store and consistency model, login-session linkage, revocation/rotation
policy, and secure credential delivery. Cookie delivery must follow Secure,
HttpOnly, Path=/, no Domain, SameSite and exact-origin/CSRF requirements in the
existing verifier contract. The remaining upload admission, quota, budget and
Sandbox gates in `cad-user-upload-contract.md` still apply.

## Validation

Run `node --test scripts/cad-upload-session-store.test.js scripts/cad-upload-session.test.js`.
Only random synthetic credentials and server-handle fixtures are used. Tests cover
issuance, digest-only persistence, record-copy isolation, collision denial, bounded
expiry, revocation, current permissions/membership, transport binding, cookie CSRF,
profile/operator bypass denial, missing configuration, failure sanitization,
timeouts and cancellation. Existing verifier request-access guards remain in use.

No UI changed; browser or human upload testing would imply an unavailable surface.
The captain owns PR review, merge sequencing, deployment and any later human QA.

## Disabled route follow-up

See [cad-user-upload-contract.md](cad-user-upload-contract.md) for the current mounted
scaffold. Historical foundation scope above does not imply that the route is still
unmounted. Production login/store selection, cross-instance revocation, quota and
budget controls, bounded parsing and executor integration require separate review
and approval before any upload activation.

## Production auth/store audit — 2026-09-12

Decision: **blocked; retain the unconfigured default service**. The inspected
server and client helpers provide neither a suitable verified login boundary nor
an upload store with durable cross-instance revocation. No issuer route or adapter
is added by this audit. This is a source-code finding, not a live production probe.

| Inspected boundary | Evidence | Upload-session decision |
| --- | --- | --- |
| `commercialization.js`: `requestProfile`, `ensureAccount`, `/api/me` | User ID comes from a supplied client ID or email hash; shop IDs are derived or read from that account. Reading `/api/me` can create these local account records. | A profile, owner role, account response, or derived shop ID does not prove login or membership. |
| `getCommercialAccessGrant`, `findMatchingStoredGrant` | Tester allowlists accept profile fields; reset invite grants accept client-ID matching without a password. | Tester access and commercial entitlements, including `canUseCadReviewQueue`, are not CAD-upload permission. |
| `verifyPassword`, `resolveAuthenticatedGrant` | Password verification exists, but resolves a profile-matched commercial grant in the JSON store. | Successful password verification alone provides no durable login-session handle, logout invalidation, or authoritative shop-membership relationship. |
| `loadStore`, `saveStore`, `readJson`, `writeJson` | Whole-file JSON reads/writes; default file is in the OS temporary directory. | No atomic unique insertion or shared revocation guarantee. Changing `COMMERCIAL_STORE_FILE` does not establish these guarantees. |
| `hooks/useCommercialization.tsx` | Client ID, profile and access password use AsyncStorage; requests send profile/access-password headers. | Client persistence is not a server identity boundary. |
| `server/index.js`, `cadUserUploadRouter.js` | Disabled user route is mounted before parsing and uses the unconfigured lookup service. | Missing credentials remain 401; syntactically valid upload credentials remain 503 `USER_AUTH_UNAVAILABLE`. |
| `uploadSessionStore.js`, `uploadSession.js` | Privileged injectable callbacks and an opt-in process-local test store. | A function-shaped adapter or schema-valid grant is not evidence of production authority or durability. |

### Historical dependency gate (updated by Phase 1 contract)

Before implementing production wiring, provide a reviewed server adapter design
with these concrete artifacts:

1. Identify the verified login source and server-side session handle, authoritative
   user/shop membership records, explicit CAD permission, and expiration policy.
   Define denied identity versus unavailable infrastructure without accepting
   profile headers, client email, tester grants or operator credentials as login.
2. Specify the durable store schema and transaction operations: unique credential
   digest, acknowledged insert, consistent lookup, irreversible revoke, expiry
   cleanup, cancellation and retry behavior. Attach tests using independent
   processes against the selected backing store; restart and revocation must not
   resurrect credentials. An in-memory fixture cannot satisfy this gate.
3. Define an atomic relationship between each upload session and its originating
   verified login. The current resolver returns before `issueSession` generates
   `sessionId`; refresh receives that upload ID but no login handle. The existing
   interface therefore does **not** itself persist a login linkage. Review an
   explicit server-only binding/schema extension before implementing this adapter;
   a mutable closure keyed only by user ID cannot safely distinguish concurrent
   logins or invalidate one logged-out session.
4. Demonstrate logout, membership removal, permission loss, store outage and
   concurrent revoke behavior with sanitized results. Keep secure credential
   delivery and any issuer HTTP route separately reviewed. Session readiness alone
   does not authorize upload activation, parsing, quota spending or conversion.

Phase 1 now implements the binding/schema extension in item 3; the provider and
durable backing in items 1–2 remain unconfigured. Use the concrete next gate in
[cad-verified-login-store.md](cad-verified-login-store.md).

The captain's next action is to review this rejection evidence and scope the
verified-login plus durable-store dependency. Provider selection/configuration,
production credentials, deployment and upload activation remain separate gates.

### Executable rejection evidence

`cad-user-upload-route.test.js` executes the actual commercial source in an
isolated VM with synthetic JSON persistence and environment values. It proves
profile-only accounts, environment tester grants, client-bound invite grants,
password grants and super-admin grants can produce commercial account responses
while the default upload issuer and user route still reject them. The VM permits
no provider calls or real account-file access. Upload request body/stream guards
and conversion counters remain active for these cases.

`cad-upload-session-store.test.js` also rejects incomplete auth dependencies and
local JSON-shaped storage before invoking them, with sanitized unavailable codes.
These tests protect the current rejection boundary; they do not certify arbitrary
injected callbacks or detect a fake store that implements all required methods.
Run both alongside the verifier and readiness suites. No UI or production behavior
changes in this slice; the operator import implementation remains unchanged.
