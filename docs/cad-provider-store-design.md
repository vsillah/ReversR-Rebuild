# CAD login provider and PostgreSQL store design (historical alternative)

> **SUPERSEDED DEFAULT — 2026-09-12.** Convex is now the preferred CAD authority
> store. Start with [Convex-first design](cad-convex-store-design.md) and
> [current review/setup gates](cad-convex-store-review.md). The PostgreSQL /
> Supabase recommendation, SQL, checkboxes and approval phrases below are
> retained as historical alternative material only. They are not the active
> setup path. Supabase dev project `jydipbkofvvpvaylxwbb` is superseded and
> must not be mutated or reused under this lane. No cleanup is authorized.

Review-only slice, based on `90268606225d91ff1cd48b9a682eaf5a444afbc4` (PR #170).
No provider selected or contacted, database created, migration applied, production
configuration changed, issuer mounted, CAD parsed, conversion dispatched or deployment
performed. The default service remains unconfigured and the user route disabled.

## Decision packet

Recommend a managed OIDC provider plus a server-owned application login lifecycle
and a private PostgreSQL primary. This is an architecture recommendation, not a
vendor commitment. Membership and CAD permission belong to reviewed application
administration; provider identity claims alone never grant shop access.

| Choice | Selection evidence required | Reject when |
| --- | --- | --- |
| Existing organization OIDC tenant | Named owner, isolated test client, supported server SDK, exact callback allowlist, key rotation, revocation/logout integration | Only profile/email assertions or unverifiable logout state |
| New managed OIDC tenant | Same evidence, plus region, retention, export/deletion process, support and approved cost | Recurring cost or account owner unresolved |
| Self-hosted provider | Same evidence plus patching, backup, incident response and availability owner | No operational owner; avoid custom password handling |
| Managed PostgreSQL | Named host/version/region, verified TLS, primary-only reads, durable commit/failover semantics, private credentials, pooling/cancellation, restore drill | Replica-only reads, acknowledged-write loss on failover, no restricted role |

First choice is an existing suitable tenant, if one exists; otherwise captain obtains
an explicit vendor choice. No vendor compatibility or price is asserted in this slice.
Provider and database may be separate vendors. OIDC provider, tenant, DB host/region,
account owner, budget, and membership administrator are still required decisions.

## Login lifecycle and authority

1. Server begins authorization-code login with one-use state, nonce and PKCE S256.
   Callback URI and issuer are fixed configuration. Validate with the provider's
   maintained SDK: signature/algorithm, issuer, audience/authorized party, expiry,
   nonce and code binding. Reject replay and arbitrary discovery URLs.
2. Resolve identity by exact `(issuer, subject)`, never email. Create a new opaque
   application `loginSessionId` and independent random browser login secret. Persist
   only its digest in the login table. Bind the exact upstream session through a
   non-secret `provider_session_ref`; any provider token needed for online validation
   belongs in a separately approved encrypted secret store, never this schema.
   A provider unable to bind/check that exact upstream session fails selection.
   No ID/access/refresh token is a login ID.
   Proposed web login cookie: Secure, HttpOnly, Path=/, no Domain, SameSite=Lax;
   exact origin and CSRF checks protect state-changing application endpoints.
3. Login lifetime is bounded by approved application policy and authoritative
   provider expiry. Do not silently renew a login referenced by existing uploads.
   Reauthentication creates a new ID. All OIDC-backed logins use `authMethod=oidc`;
   do not infer local passkey/password method from arbitrary claims.
4. Issue uses a verified server login handle and explicit shop selection checked
   against current membership. Caller-supplied shop ID is a selector, never proof.
5. Refresh rechecks the exact login, user enabled state, membership, upload status
   and current CAD permission from the primary. For provider-side revocation, require
   authoritative online session validation on every issue/refresh, or a separately
   reviewed equivalent with a stated revocation bound. Signature-only JWT validation
   or delayed webhook delivery alone does not meet immediate provider revocation.
   If the provider cannot supply this guarantee, selection fails this design gate.
6. Local logout permanently revokes that login and its uploads in one transaction.
   User disable revokes all their logins/uploads. Membership removal or CAD denial
   revokes matching uploads in the same transaction, so later regrant cannot revive
   them. Membership rows remain as inactive tombstones; IDs are never reassigned.
7. Rotation is a future privileged transaction: reauthorize, insert a fresh digest,
   revoke old digest, commit, then deliver. On rollback old state remains; on uncertain
   commit return no credential. No rotation or login HTTP endpoint is added here.

Callback validation follows [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html).
Code-flow protection is informed by [OAuth security BCP](https://www.rfc-editor.org/rfc/rfc9700.html).
The local lifecycle and immediate revocation requirement above are application design decisions.

## Schema and migration plan

[Review-only DDL](cad-provider-store-schema.sql) defines five relations and constrained
scalar types. Stored schema stays v2; public verifier stays v1. Database fields map
snake_case to the existing camelCase record; `credential_digest` stays the lookup
key, never an extra public record field. SQL NULL `csrf_digest`/`revoked_at` becomes
an omitted property. Convert bigint strings only after safe-integer/range checks.

The file ends in ROLLBACK and is outside migration discovery. It is a schema proposal,
not an installable adapter. No SQL execution occurred in this slice. Cross-row live
checks, immutability and irreversible revocation require the functions below;
constraints alone do not enforce the complete policy.

Future migration sequence: inspect selected DB version and existing schemas; create
private schema and non-login owner; add tables/constraints/indexes; implement reviewed
functions and immutable-record guards; revoke defaults; grant only named operations;
run actual database conformance; record migration checksum and applied version.
Do not use IF NOT EXISTS to conceal drift. No production v1 upload records are
legitimate: invalidate/discard them, never invent login linkage. Do not import
commercial JSON/profile records as authenticated identities. Before any future
populated migration, obtain a backup and test restore. Rollback means remove adapter
wiring and leave uploads disabled; preserve revocation evidence, never restore old
sessions from a backup into an active issuer.

## Restricted adapter and transaction contract

Keep `createUploadSessionService` unchanged. Three store methods and two authorization
callbacks retain the signatures in [Phase 1](cad-verified-login-store.md). Driver is
not selected or installed. Queries must use parameters and fixed qualified names.

| Operation | Proposed DB function / behavior |
| --- | --- |
| resolveAuthorization(context, {signal}) | Validate server login secret/provider; `resolve_login(digest, shop)` returns live authoritative binding or null |
| refreshAuthorization(binding, {signal}) | Validate provider liveness, then `refresh_upload(session_id, login_id, user_id, shop_id, auth_method)` rechecks the exact upload and all authority; null on denial |
| insertIfAbsent(digest, record, {signal}) | `insert_upload(...)` checks live linkage and expiry transactionally; digest conflict returns false without UPDATE; other constraint/infrastructure failures throw |
| read(digest, {signal}) | `read_upload(digest)` returns detached whitelisted v2 record or null from primary; no token, login secret digest or provider metadata projected |
| revoke(digest, revokedAt, {signal}) | `revoke_upload(...)` active to revoked; true only after commit, repeated revoke true without timestamp mutation, missing false |

Use a short READ COMMITTED transaction per operation. All authority writers and
issuance take `FOR UPDATE` on the user row first, then membership rows ordered by
shop ID, login rows ordered by login ID, then upload rows ordered by digest. The
user lock serializes same-user authority changes, including insert versus logout.
Resolve and refresh must acquire the same authority locks and re-read after waiting.
An initial digest lookup to locate the user is tentative; re-read after locking.
Cross-user admin batches acquire users in sorted order. No provider network calls
while DB locks are held. Provider validation precedes the DB transaction; document
its observation instant in future conformance evidence.

At insert, under locks, check user enabled, exact login/user/auth method, unrevoked
login, active membership, and permission equal to the supplied grant. Permit a false
permission record only as a permanently non-granting session, as current service does.
Check DB clock after locks: issued_at <= now < expires_at <= login expiry and lifetime
<= 900000 ms. Clock disagreement fails closed. Only active rows may be inserted.
`ON CONFLICT (credential_digest) DO NOTHING` must not suppress other constraints.
Never mutate immutable binding, lifetime, transport or CSRF fields. Revoke is the only
upload update and cannot change a revoked row. Reject arbitrary updates with a trigger
as defense in depth; runtime has no table UPDATE privilege in any case.

Refresh must re-read upload status, not merely login/membership: service.read and
refresh are separate calls, and revocation may commit between them. A lookup begun
after acknowledged revocation must deny. An overlapping lookup may linearize before
revocation; already admitted conversion cannot be undone. Dispatch-time admission
remains a separate future gate. PostgreSQL lock/isolation behavior informs this design:
[locking](https://www.postgresql.org/docs/current/explicit-locking.html),
[READ COMMITTED](https://www.postgresql.org/docs/current/transaction-iso.html).

## Least privilege and durability

Proposed roles: migration operator; non-login object/function owner; login runtime;
upload runtime; membership administrator; cleanup worker. No client/browser DB access.
Upload runtime receives schema USAGE and EXECUTE on insert/read/refresh/revoke only;
login runtime receives resolve/create/logout only; membership administrator receives
reviewed membership/disable functions only. Cleanup receives expiry cleanup only.
None receives direct table DML, schema CREATE, ownership, superuser or BYPASSRLS.
Functions using SECURITY DEFINER fix `search_path=pg_catalog,cad_auth,pg_temp`, qualify
objects, prohibit dynamic SQL, and revoke PUBLIC EXECUTE in the same transaction as
creation. Revoke PUBLIC schema access and future function defaults for the actual
owner. Validate both intended grants and denied direct operations using each role.
See [PostgreSQL function security](https://www.postgresql.org/docs/18/sql-createfunction.html).

Primary connection requires certificate/hostname verification. Use synchronous_commit
on; host must demonstrate acknowledged commits survive its approved failover model.
Reject read replicas and positive caches. Pool acquisition, provider validation,
queries, lock waits, cancellation and commit acknowledgement must fit one shared
operation budget below the existing 1000 ms deadline (proposed 800 ms total, including
rollback/cancellation margin). Per-query timeouts alone are insufficient. Cancel via
driver and discard uncertain connections; AbortSignal is not proof of DB rollback.
Do not retry an unknown commit automatically. A committed but undelivered credential
is inaccessible and expires. Reconcile by digest without logging raw tokens.

Retain upload tombstones until original expiry plus a proposed 24-hour retry horizon;
no retry may insert an expired record. Cleanup is bounded and uses the same lock
order, deleting expired uploads before unreferenced revoked/expired logins. Retention
and audit policy need owner approval; expiry denial never depends on cleanup.
Record only safe outcome code, opaque request ID, durations and aggregate counters.
Exclude identity claims, credential digests, raw query parameters and provider errors.

## Failure and acceptance matrix

| Scenario | Expected evidence | Current evidence |
| --- | --- | --- |
| Default/partial configuration | No issuance, no body reads, no dispatch | Existing offline route/store tests |
| Wrong user/login/shop, legacy v1, expiry | Denied or sanitized unavailable | Existing synthetic store tests |
| Permission denial then regrant | Old upload remains revoked; new issuance required | New synthetic lifecycle test |
| Revoke between read and refresh | Refresh sees revoked upload and denies | New synthetic callback-contract test |
| Commit succeeds, acknowledgement lost | No token returned, no automatic second insert | New synthetic uncertain-commit test |
| Same digest raced on two DB clients | Exactly one durable insert; no overwrite | Pending actual PostgreSQL |
| Logout races insert / regrant races revoke | Serial order, no usable old upload | Pending actual PostgreSQL locks/functions |
| Restart, failover, replica misroute | Acknowledged data retained; unsafe routing fails | Pending selected host |
| Missing role grant / malformed bigint / pool exhaustion | Sanitized unavailable, no fallback | Pending driver integration |
| Abort before/during commit; provider outage/replay/logout | Deadline bounded; no credential on uncertainty | Synthetic baseline; provider/driver proof pending |
| Direct DML, revoked-row mutation, CSRF/FK constraint violations | Permission/constraint rejection | Pending database conformance |
| Rotation rollback and tombstone cleanup | No revival or lifetime extension | Pending transaction implementation |

Synthetic doubles establish callback expectations, never SQL enforcement or durability.
No `psql` client was found and no database was connected; DDL remains unexecuted.
No UI changed; browser upload QA is unavailable and would exceed this slice.

## Setup instructions and exact future gates

All steps below are future actions. This document grants none of them.

1. **Provider decision:** return provider/tenant, DB host/version/region, owners, budget,
   membership administrator and acceptable provider-revocation semantics to captain.
   Success: a completed decision packet with no credentials pasted into chat.
2. **Synthetic resource gate:** present “Approve isolated synthetic CAD auth/store
   resources in <tenant/host/region>, owned by <owner>, with <cost cap>; no production
   configuration, deployment, CAD input or upload activation.” Only after approval,
   open chosen provider console → applications → create web client; set only the
   reviewed HTTPS callback and logout URLs. Exact console labels depend on selection.
   In DB console create isolated development backing. Record sanitized resource IDs.
3. **Adapter/migration implementation gate:** implement provider SDK validation, driver,
   restricted functions, guards and two-client harness in a dedicated reviewed PR.
   Review this schema before promoting it to a migration. Run on an explicitly named
   disposable database after its setup approval. Verify roles with allowed function
   calls and denied direct DML; restart writer and read from independent client.
4. **Development configuration gate:** put secrets directly in the approved server
   secret store. Proposed names remain documentation only: CAD_LOGIN_OIDC_ISSUER,
   CAD_LOGIN_OIDC_CLIENT_ID, CAD_LOGIN_OIDC_CLIENT_SECRET, CAD_LOGIN_OIDC_REDIRECT_URI,
   CAD_AUTH_DATABASE_URL, CAD_LOGIN_ALLOWED_ORIGINS. Never use public/Expo prefixes.
   Future configuration must validate completeness/TLS/origins and fail closed.
   Success: synthetic callback, logout and all database conformance receipts; send
   only pass/fail counts, commit, migration checksum and redacted resource identifiers.
5. **Issuer wiring gate:** separately review authenticated issuance/revocation routes,
   transport, CSRF/origin/rate limits, credential delivery and dispatch-time recheck.
   Production config requires its own exact environment/commit approval. Development
   conformance and design approval do not authorize production deployment.
6. **Activation gate:** separately approve exact commit/environment, quota/concurrency,
   enforceable budget, parser limits and Sandbox controls from the user-upload contract.
   Private CAD and conversion runs require their own bounded authority. Until then
   `POST /api/cad/user-import` remains disabled even with functional auth/store.

Validation command for this slice:

```sh
node --test scripts/cad-provider-store-contract.test.js scripts/cad-upload-session-store.test.js scripts/cad-upload-session.test.js scripts/cad-user-upload-route.test.js
```

Validation receipt (2026-09-12): installed locked dependencies with
`npm ci --ignore-scripts --no-audit --no-fund`; the command above passed **32/32**
tests, including disabled-route zero-body-read/zero-conversion assertions.
`git diff --check` passed. No runtime files or dependency manifests changed.
SQL syntax/constraint execution, provider validation, multi-client durability,
failover and production behavior remain unverified.
