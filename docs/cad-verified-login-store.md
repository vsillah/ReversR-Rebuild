# Verified login and durable upload storage — Phase 1

Status: provider gate, uploads disabled. No production adapter, configuration,
issuer endpoint, migration execution, provider call or conversion is implemented.
This phase specifies the adapter and closes the missing login-reference contract.

## Repository inventory and decision

Inspected at base `a6ba2d3b08ea4efed1b982ba98e7fabdf29de490`:

- `server/commercialization.js`: `requestProfile` accepts caller claims;
  `ensureAccount` derives identities from those claims. Passwords/tester/admin
  grants authorize commercial access, with no authoritative login lifecycle.
  `loadStore`/`saveStore` use whole-file JSON, defaulting to the OS temp directory.
- `hooks/useCommercialization.tsx`: client AsyncStorage and profile/password
  headers supply commercial context, not authoritative login or shop membership.
- `server/uploadSessionStore.js`: injected privileged callbacks and explicit
  test-only Map storage. No production backing or environment loader.
- `server/uploadSession.js`: credential verification consumes the server lookup.
  `server/index.js` mounts the disabled user router before body parsing. The
  operator router remains separate and unchanged.
- `package.json` and lockfile: no direct login/session or database client dependency.
  Stripe is billing; AsyncStorage is client persistence; Sandbox is execution.
  A transitive `jose` dependency does not supply a configured identity provider,
  callback flow, session lifecycle, membership authority or database.

Decision: existing dependencies cannot establish these trust guarantees without
provider selection and configuration. No handwritten authentication system or
local-file production store is substituted.

## Mandatory server adapter interface

The existing `createUploadSessionService` interface is retained. Its two privileged
callbacks now require this result (or null for denied, throw for unavailable):

```js
{
  userId, shopId, loginSessionId, // opaque server-owned IDs, not email or credentials
  authMethod,                  // password | passkey | oidc
  cadUploadAllowed,            // explicit authoritative boolean
  expiresAt                    // integer epoch milliseconds; earliest auth expiry
}
```

`resolveAuthorization(context, {signal})` must validate an authenticated server
session using the chosen provider and read authoritative membership and permission.
Caller-provided IDs, a decoded token, and a `verified` flag are insufficient.
`refreshAuthorization({userId, shopId, sessionId, loginSessionId, authMethod},
{signal})` must re-read that exact login and current membership on every lookup.
No lookup by user ID alone, positive caching, or switching to another live login.
A logged-out, revoked, expired or missing login/membership returns null; an outage
throws. The adapter must reject a mismatched user or authentication method.

The service atomically includes `loginSessionId` in the record passed to insert.
It validates the same ID on refresh and keeps it out of issuance responses,
lookup projections and verifier principals. This ID is a non-secret database
reference; never put a cookie, bearer token or provider refresh token in it.
Stored schema is now **2**; verifier/principal schema stays **1**. Stored v1 records
fail closed and must be discarded, never backfilled from user/profile IDs. There
are no legitimate production sessions to migrate at this disabled stage.

Shape checking cannot establish authority or durability. Injected callbacks remain
trusted server code. The default singleton has no adapters and no environment
activation path; configuring environment variables alone cannot enable issuance.

## Storage contract and schema to implement after selection

Choose a managed relational backing with primary, strongly consistent reads and
transactions (PostgreSQL is the concrete schema target below), and a reviewed OIDC
provider with a server-managed application session lifecycle. These are proposed
implementation choices, not installed providers or approval to create resources.
Name the actual provider/tenant, database host/region and membership owner before
implementation. A different choice must demonstrate the same semantics.

Logical schema, all times integer epoch milliseconds:

| Relation | Required columns and constraints |
| --- | --- |
| users | user_id primary key; issuer + subject unique; disabled flag. No email-based identity linking. |
| memberships | (user_id, shop_id) primary key; active; cad_upload_allowed. Controlled by reviewed server/admin workflow. |
| login_sessions | login_session_id primary key; user_id foreign key; auth_method; created_at; expires_at; revoked_at nullable. Handle never reused. |
| cad_upload_sessions | credential_digest primary key (64 lowercase hex); schema_version = 2; session_id unique; login_session_id + user_id bound to login row; user_id + shop_id bound to membership row; auth_method; cad_upload_allowed; transport; issued_at; expires_at; status; csrf_digest nullable; revoked_at nullable. |

Migration must enforce status/transport/auth-method enums, expiry after issue and
at most 900000 ms, cookie CSRF digest presence/shape, and irreversible revocation.
Use a composite unique login key for the composite foreign key. Active-row
insertion must transactionally validate the login/membership relationship; a
foreign key alone cannot establish current activity or permission. Do not grant
the application role arbitrary UPDATE/DELETE. Expose restricted insert/read/revoke
operations; login logout and membership writes must obey the same locking order.

| Method | Required semantics |
| --- | --- |
| insertIfAbsent(digest, record, {signal}) | Unique insert; true only after durable commit acknowledgement, false on duplicate without overwrite. Never persist credentials. Validate linkage and live login/membership in the transaction. |
| read(digest, {signal}) | Detached current record or null; read primary, never stale replicas or positive cache. Unknown and expired records never become default grants. |
| revoke(digest, revokedAt, {signal}) | Atomic active-to-revoked transition; true after commit, repeated revoke true, unknown false. No resurrection or extending expiry. |

Keep tombstones through at least original expiry and retry horizon. Expiry is
checked synchronously by the service/verifier, independent of cleanup scheduling.
Cleanup cannot renew or resurrect sessions. Rotation must insert a new digest and
revoke the old one atomically; no rotation endpoint exists in this phase.

All adapter operations must honor AbortSignal before commit and bound DB/provider
I/O below the service's one-second deadline. If commit outcome becomes uncertain,
throw; never acknowledge optimistically, return a credential, or retry insertion
with a new token automatically. A committed-but-unacknowledged row can remain
inaccessible until expiry; reconcile using its digest and never log raw credentials.
Test cancellation both before commit and during ambiguous connection loss.
Revocation prevents subsequent authoritative lookups; it cannot undo an already
completed verification. Phase 2 must separately define dispatch-time admission.

## Exact next human/provider gate

1. Select the OIDC provider/tenant and PostgreSQL hosting target (or supply an
   equivalent adapter design), region, account owner and budget. Identify who can
   create shop memberships and grant CAD permission. Return those choices to the
   captain; no secrets need to be pasted into the task.
2. Approve a synthetic development setup and its callback URL. In the chosen
   identity console, create a web application with only the reviewed HTTPS callback;
   obtain issuer and client ID, and place any client secret in the approved secret
   store. Success means a synthetic login yields a validated issuer/subject and a
   revocable server session, with state/nonce/PKCE and secure cookie handling tested.
3. In the selected database console, create an isolated development database and
   least-privilege runtime role. Review a migration implementing the schema and
   restricted operations above before applying it. Confirm unique/FK constraints,
   restricted permissions and two independent clients see acknowledged writes.
4. Proposed server-only configuration names for that implementation:
   `CAD_LOGIN_OIDC_ISSUER`, `CAD_LOGIN_OIDC_CLIENT_ID`,
   `CAD_LOGIN_OIDC_CLIENT_SECRET` (if required by the selected flow),
   `CAD_LOGIN_OIDC_REDIRECT_URI`, `CAD_AUTH_DATABASE_URL`, and
   `CAD_LOGIN_ALLOWED_ORIGINS`. These names are reserved documentation only;
   no loader reads them today. Exact secret storage, TLS settings and provider SDK
   are part of the next review. Partial configuration must leave wiring unavailable.
5. Attach sanitized acceptance results below to the captain's adapter review.
   Only then scope Phase 2 issuer wiring and secure credential delivery. Production
   configuration, upload activation, parsing and conversion remain separate gates.

## Required provider acceptance evidence

Use synthetic identities and independent processes/connections against the actual
selected backing. Do not certify a Map or two wrappers around one Map as durable.

- Restart writer; second process still reads committed session. Race identical
  digests: exactly one true insert; dropped acknowledgement never returns a token.
- Revoke on process B; subsequent lookup on A denies. Repeat revoke, restart,
  attempt overwrite/reinsert, and race revoke/read; no post-ack revival.
- Two logins for one user: log out A, A's upload denies while B remains valid.
  Logout during insert cannot create a usable session. Remove membership or CAD
  permission from another process; next lookup denies. No email/profile shortcuts.
- At exact login/upload expiry, deny even if cleanup has not run. Cleanup and
  retries cannot extend validity. Exercise rotation transaction rollback.
- Disconnect provider/database, deny permissions, return malformed records, delay
  reads/writes beyond deadline, and abort before commit: sanitized unavailable,
  no fallback and no token on uncertain writes. Restore service without stale cache.
- Attempt direct unauthorized inserts/updates, v1 records and mismatched login/user/
  shop bindings. Database constraints and adapter checks must reject them.
- Missing/partial configuration must issue nothing and user route remains disabled.
  Test issuer CSRF/origin/rate limits separately before adding any HTTP issuer.

Current local tests exercise binding, logout isolation, expiry, revocation,
acknowledgements, cancellation and outage behavior using synthetic doubles only.
They are executable interface evidence, not provider conformance certification.
No UI changed and no live upload QA is appropriate at this gate.

## Provider/store design follow-up

The [review-only PostgreSQL design](cad-provider-store-design.md) adds a DDL draft,
transaction/role contracts, synthetic scenarios and staged setup gates. It does not
select a provider, apply a migration or configure the default service.
