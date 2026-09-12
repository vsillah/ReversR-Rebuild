# CAD Import Convex-first authority design

Status: preferred replacement, local transport slice only, 2026-09-12. Base:
`7c37ba0ea8befdcd16b359ef553372c898810b90`; branch `codex/cad-convex-store-adapter`.
Vambah selected Convex as the preferred default to avoid a separate recurring
Supabase project cost. This is not a claim that Convex is free or a budget approval.
The Supabase/PostgreSQL packet and SQL are historical alternatives, not active setup
instructions. No existing Supabase resource or migration branch is used by this code.

## Implemented boundary

`server/convexUploadSessionStore.js` implements the existing store port using an
explicit trusted `call(operation, payload, {signal})` injection. It validates v2
records, sends only credential digests and whitelisted record fields, checks boolean
write acknowledgements, performs fresh reads, sanitizes errors and supplies an 800 ms
absolute deadline. It does not implement networking, authentication, transactions,
Convex functions, SDK references or persistent storage. It is not imported by the
route/default service. No env-based selection or fallback exists.

The injection is a protocol seam, not a `ConvexHttpClient` drop-in. The operation
names below are local port labels, not registered Convex function names. A future
server-authenticated HTTP action gateway must authenticate the Node service, allow
only these operations, validate args/returns, and call internal query/mutation
functions. Do not use a deployment/admin key in the app. Browser clients must never
receive this gateway authority. Internal functions cannot be invoked directly by an
ordinary Convex client. [Internal functions](https://docs.convex.dev/functions/internal-functions).

No `convex/` scaffold or package changes are included: unselected auth/session
semantics and an unauthenticated gateway would make deployable CRUD misleading.
The next implementation can proceed locally after those decisions, without resource
creation. It must include schema, object-form internal functions, validators and
return validators, generated types, and offline backend tests. Add `auth.config.ts`,
`auth.ts`, `http.ts` and library `authTables` together if selecting Convex Auth.
Do not run `convex dev`, including anonymous mode, in this bounded lane.

## Verified login and current authority

Prefer evaluation of **Convex Auth**, using its library-managed users/accounts/session
lifecycle instead of building an application password/login/session database. Its
server API exposes `getAuthSessionId` and library auth tables. Resolve the session
from verified auth context, then read its exact current library session and owner;
a session ID extracted from a JWT alone is insufficient. Pin/review the library
version and prove expiry, session deletion/logout and account disable behavior.
Convex Auth is documented beta; acceptance remains a decision gate.
[Auth overview](https://docs.convex.dev/auth/overview),
[session helper and tables](https://labs.convex.dev/auth/api_reference/server).

Alternatively use an approved OIDC/JWT issuer with fixed issuer/audience/signature
validation and an authoritative exact-session liveness check. Identity is the exact
issuer + subject, never email. A JWT subject or tokenIdentifier identifies a user,
not a unique login. Require a verified stable session reference. No synthetic
loginSessionId derived only from user ID, email or raw JWT is acceptable.

For either choice, preserve immediate provider-side revocation as a qualification
requirement. For social/OIDC login, local Convex Auth logout does not prove upstream
provider revocation. Require an authoritative upstream check on each issue/refresh,
or return to the captain for an explicitly changed revocation contract. Webhooks,
short JWT expiry, cached liveness and successful sign-in do not satisfy this gate.
No available provider is certified by this packet.

`resolveAuthorization` must receive verified login context, choose the requested shop
only as a selector, and check current session, user enabled state, membership and CAD
permission. `refreshAuthorization` must independently reread the exact upload by
sessionId as well as its exact login, owner, shop and permission. It must deny a revoke
committed between the service's read and refresh. Both return only the existing
{userId, shopId, loginSessionId, authMethod, cadUploadAllowed, expiresAt} grant shape;
null means denied and sanitized exceptions mean unavailable. Neither callback is
implemented here. Methods come from verified login provenance, never client claims.

## Proposed bounded Convex data model

All entries below are design, not deployed tables. Document references use `v.id`;
opaque external identifiers use bounded strings. Do not add custom auth/session
or account tables; CAD upload sessions are application capabilities, not logins.

| Table / source | Fields and access path |
| --- | --- |
| Library users and authSessions | Exact library IDs; point reads for current user/session; retain library indexes and lifecycle; no provider-table writes outside supported APIs |
| cadUserAuthority | userId, enabled, generation; unique-by-contract index `by_userId`; one persistent row per user |
| cadMemberships | userId, shopId, active, cadUploadAllowed, generation; index `by_userId_and_shopId`; never delete/recreate for regrant |
| cadUploadSessions | credentialDigest, existing v2 record, captured userGeneration and membershipGeneration, optional revokedAt; indexes `by_credentialDigest`, `by_sessionId`, `by_expiresAt` |

Convex indexes are not SQL unique constraints. Each insertion checks the appropriate
index with `.unique()` in the same mutation before writing. Concurrent inserts must
be tested against OCC; existing duplicates throw/deny, never select an arbitrary row.
All reads use a point ID or the named index. Cleanup uses indexed `.take(100)` batches
or pagination, never unbounded `.collect()` or table `.filter()`.

Each disable/removal/permission-denial increments the relevant authority generation
in the same mutation that changes permission. Old uploads retain their captured
values; mismatch denies permanently even after regrant. Issuance reads the same
current authority documents and stamps generations itself; caller-supplied epochs
are not accepted. Guard safe integer overflow by denying writes. Never reset or
reuse generations/IDs. This invalidates arbitrarily many capabilities with bounded
writes. Physical row cleanup is not a security operation. Logout relies on absence
or revocation of the exact library authSession, whose ID must never be reused.

An issued false permission stays false even if permission is later granted. Each
operation compares exact user/shop/login/auth method and current authority. Expiry
cannot extend beyond original issuance + 900000 ms or current login expiry.
Store only SHA-256 digests of upload/CSRF secrets; never store raw upload credentials,
provider tokens, passwords, filenames, CAD bytes or private provider diagnostics.

## Required function semantics

| Port/function | One authoritative operation |
| --- | --- |
| insertIfAbsent | Internal mutation checks digest uniqueness, upload sessionId uniqueness, record validity, current login/user/membership/permission and generation; stamp generations; reject expired/future issuance; insert active immutable record; false only for digest conflict, other invalidity throws |
| read | Fresh internal query by digest; return null for absent/invalidated authority or a detached whitelisted v2 record; no arbitrary Convex metadata/generations in Node projection |
| revoke | Internal mutation by digest; missing false; active becomes revoked; repeated revoke true without changing original time; backend clock validates supplied time; acknowledgement only after mutation returns |
| resolveAuthorization | Authenticated gateway/context plus exact current authority; no client principal overrides |
| refreshAuthorization | Fresh internal query by unique upload sessionId, compare all binding fields, upload status/expiry/generations and exact current login; null for denial |

Use one mutation for issuance validation + insertion. Convex serializable OCC
reexecutes conflicting transactions; no SQL locks, RLS or direct-table browser
access is carried over. External upstream validation belongs in an action preceding
the mutation, with a bounded observation interval and no positive cache. Separate
action calls are not one transaction: record that boundary in conformance evidence.
[OCC/atomicity](https://docs.convex.dev/database/advanced/occ),
[action transaction boundaries](https://docs.convex.dev/functions/actions).

A lookup overlapping revocation may linearize before it; a lookup begun after an
acknowledged revocation must deny. Conversion admission must later recheck authority
at dispatch; passing auth never enables `POST /api/cad/user-import`.

## Deadlines, uncertain commits and restore

The existing service's 1000 ms outer deadline includes resolve/refresh and storage.
The local port caps each call at 800 ms and propagates cancellation. The gateway
must cap caller deadlines to its own short budget, validate clocks, and check expiry
and deadline inside the mutation on every attempt. The parent signal remains the
shared outer budget. No SDK retry/subscription cache is assumed safe.

**AbortSignal cannot cancel or roll back a remote Convex mutation.** The existing
store comment requires cancellation before commit; this port does not establish
that guarantee and therefore cannot be wired into the default service yet. Prove
backend deadline/commit semantics or propose a separately reviewed reservation and
finalization protocol. Do not label an HTTP abort as rollback. An uncertain/late
acknowledgement returns no credential and triggers no automatic second insert;
possibly committed inaccessible rows expire under their original lifetime.

Keep tombstones through expiry plus the proposed 24-hour retry horizon; owner must
approve retention. Restore with issuance disabled and invalidate all restored CAD
authority generations before any reopening. Provider session invalidation and
acknowledged-write durability/recovery need explicit evidence for the chosen plan.

## Validation and next step

Local tests cover payload projection, malformed records, exact boolean results,
timeouts/abort, no retry/cache, service binding and lost acknowledgements. Existing
CAD tests cover transport/CSRF and disabled-route behavior. These tests establish
port behavior only. They do not prove authentication, Convex indexing, uniqueness,
concurrency, durability, failover, provider logout, permissions or actual networking.

Next: settle Convex Auth version/beta and exact-session semantics, then implement
internal functions and authenticated gateway with an offline Convex test harness.
Before live qualification: prove two-client digest races; logout/issuance and
revoke/read races; permission deny/regrant non-revival; same-user wrong-login denial;
missing/expired session; denied gateway calls; deadline/unknown commit; restart and
restore; secret-free outputs. Upload activation, CAD conversion, production env and
deployment remain separate gates. See [review packet](cad-convex-store-review.md).
