# CAD Import provider and database decision packet

Status: proposed, awaiting human selection. Reviewed 2026-09-12 against base
`ad3b8b9` (PR #171), branch `codex/cad-provider-decision-packet`.
This is a documentation-only packet. No account, tenant, database, credential,
environment, route, migration, deployment, upload or conversion was configured.
Production was not accessed. User uploads must remain fail-closed.

## Recommended decision

Qualify **Supabase managed Postgres** as the durable authority store, using a
server-only `cad_auth` schema and restricted PostgreSQL roles. Select login
independently: prefer an existing organization OIDC tenant **only if it passes the
exact-session revocation contract**. If none qualifies, evaluate Supabase Auth's
OIDC server in an isolated synthetic project, with explicit beta acceptance.
Auth0 is a comparison candidate, not a selected fallback.

This recommendation is engineering judgment, conditional on evidence below.
A managed database feature, backup, or successful login does not establish the
required failover or revocation guarantee. If no candidate passes, retain disabled
uploads and bring a separate design decision to the captain; do not silently relax
immediate revocation or accept a JWT-expiry window.

The [existing design](cad-provider-store-design.md) and
[review-only SQL](cad-provider-store-schema.sql) remain authoritative for schema v2,
required `loginSessionId`, immutable binding and irreversible revocation. This
packet resolves the questions to ask, not their human answers. The SQL ends in
ROLLBACK and must not be pasted into a console as an installation procedure.

## Durable-store fit and open qualification

| Concern | Proposed Supabase approach | Evidence required before acceptance |
| --- | --- | --- |
| Transactional authority | Keep users, memberships, application logins and upload digests in the PostgreSQL primary; preserve lock order and v2 mapping | Two-client issue/logout/regrant races; denied stale login and revoked uploads; no JSON/in-memory fallback |
| Access | Private application schema, no browser database access; explicit function grants to separate login/upload/admin/cleanup roles | Denied direct DML and PUBLIC/anon/authenticated access, fixed function search paths, immutable-row guards, role ownership review |
| Network privacy | Verified TLS plus approved network restrictions | Primary endpoint, hostname/CA verification, server egress feasibility and denied unapproved networks; a private schema is not a private network |
| Serverless pooling | Evaluate transaction pooler for runtime; direct connection for migration/restore when reachable | Driver cancellation, no session-state dependence, parameterized queries with incompatible prepared-statement mode disabled, custom role support |
| Acknowledged-write safety | `synchronous_commit=on`, primary-only reads, no positive authority cache | Vendor evidence for the selected failure model plus restart/failover test; RPO for acknowledged revocations must meet the design, otherwise reject |
| Operation budget | Existing 1000 ms deadline; proposed shared 800 ms work budget | Provider check + pool wait + locks + commit + cancellation margin under load; uncertain commit emits no credential and no blind retry |
| Recovery | Approved backup/restore plan; restore with issuer disabled | Restore drill must never revive old login/upload authority; reconcile or invalidate restored sessions before reopening |

Supabase documents direct and pooled PostgreSQL connections; transaction pooling
requires disabling prepared statements in the client. Direct connections normally
use IPv6; session pooling provides an IPv4 alternative. Copy endpoints from the
project's Connect dialog rather than constructing them. These are connection
capabilities, not proof of this adapter's semantics.
[Connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).
Network restrictions cover database and pooler IP ranges; choose approved egress
CIDRs after reviewing the server host.
[Network restrictions](https://supabase.com/docs/guides/platform/network-restrictions).

Keep `cad_auth` outside Data API exposed schemas; disable that API in the isolated
project if unnecessary. RLS is defense in depth and must accompany any exposed
schema. The proposed privileged functions need an explicit security review:
non-login owner, qualified names, restricted EXECUTE and complete authority checks.
Never resolve a denial by granting clients broad access or using a service-role key
as the application database identity.
[API security](https://supabase.com/docs/guides/api/securing-your-api).

## Login/OIDC comparison

| Candidate | Fit and operational tradeoff | Selection blocker / required proof |
| --- | --- | --- |
| Existing organization managed OIDC tenant | First evaluation choice under the existing design; potential reuse of accountable ownership | Existence and entitlement unverified. Name vendor/tenant/owner, exact issuer/client, maintained SDK, exact session reference and authoritative liveness method; inspect its current docs before selection |
| Supabase Auth as OIDC issuer | Same vendor as Postgres; documented code flow with PKCE, discovery and ID tokens | OAuth server is documented beta. Requires explicit beta acceptance, authorization UI and asymmetric signing for ID tokens. Prove OIDC-session binding, expiry and revocation; ordinary social sign-in through Supabase is a separate upstream trust boundary |
| Auth0 managed OIDC | Documented session-by-ID API and `sid` binding offer a concrete evaluation path | Session Management API is Enterprise-only. Deletion is asynchronous/eventually consistent; published behavior does not satisfy immediate provider-revocation proof. Require approved equivalent with stated bound or reject; commercial quote required |
| Self-hosted OIDC | Control over operations, but adds patching, incident response and availability responsibility | Deferred unless an owner explicitly accepts that work and supplies the same conformance evidence; no self-hosted product or cost evaluated here |

Sources: [Supabase OIDC overview](https://supabase.com/docs/guides/auth/oauth-server),
[Supabase OAuth setup and beta status](https://supabase.com/docs/guides/auth/oauth-server/getting-started),
[Auth0 session management](https://auth0.com/docs/manage-users/sessions/manage-user-sessions-with-auth0-management-api).

Supabase access tokens carry `session_id`, which can be checked against
`auth.sessions` to detect sign-out. Row presence alone does not enforce maximum
lifetime or inactivity expiry: cleanup is delayed and those settings are checked
at refresh. Qualification must establish the exact live session and authoritative
expiry through supported, narrowly privileged server access; no blanket grants on
`auth`, provider-table mutation or raw tokens in `cad_auth`. This is a proposed
integration path, not completed proof.
[Supabase session semantics](https://supabase.com/docs/guides/auth/sessions).

For every candidate, use exact `(issuer, subject)` identity, a separate opaque
application login ID and secret digest, and application-managed shop membership.
Email, user-editable metadata and provider profile claims grant no CAD authority.
Test callback replay, issuer/audience/nonce/state/PKCE, key rotation, exact-session
logout, disable/regrant, outages and timeouts. If federation is selected, explicitly
name which issuer session is authoritative; an upstream logout is not presumed to
terminate a broker session. Keep browser application cookies distinct from provider
tokens and review any encrypted provider-token storage separately.

## Cost and risk register

Public pages retrieved 2026-09-12; amounts are USD list prices, not quotes or an
approved total. Recheck at the future resource gate, including tax, project count,
compute, identity usage and optional services.

| Item | Sourced observation | Decision implication |
| --- | --- | --- |
| Supabase Free | $0; 500 MB database; no automatic backups; pauses after one week inactive | Candidate for disposable synthetic evaluation only; unsuitable as evidence of production recovery/availability |
| Supabase Pro | Starts at $25/month; $10/month compute credit; Micro listed at $10/month; 7-day daily backups | One Micro may fit the listed base before extras; this is not a total cap. Additional projects consume additional compute |
| Recovery/network extras | PITR starts at $100/month; optional infrastructure can add charges | Choose recovery targets before plan; backup retention does not prove zero acknowledged-write loss |
| Supabase OIDC server | Free during beta according to setup docs | Post-beta price/terms unresolved; beta acceptance and later re-review required |
| Auth0 | Required session API is Enterprise-only | Obtain entitlement/quote before selection; no numeric Enterprise estimate asserted |

Pricing evidence: [Supabase pricing](https://supabase.com/pricing),
[Auth0 pricing](https://auth0.com/pricing). Backup procedures and scope:
[Supabase backups](https://supabase.com/docs/guides/platform/backups).

Supabase's Pro Spend Cap covers only certain usage categories; compute, branching,
IPv4 and PITR are among exclusions. It is not an arbitrary dollar ceiling.
[Cost controls](https://supabase.com/docs/guides/platform/cost-control).
The standing under-$10 permission does not approve recurring subscriptions or
uncapped metering. This lane incurred no provider charges. No paid tier is selected.

Operational risks to resolve: region/residency and identity retention; coupled
Auth/database outages if co-located; additional management API latency and quotas
if split; restore-time revival of old authority; beta/API evolution; secret rotation;
no documented selected-host failover guarantee yet. These are application risk
assessments, not claims of observed vendor incidents or tested production behavior.

## Current changelog review

Fetched and scanned the [markdown changelog](https://supabase.com/changelog.md)
on 2026-09-12, then read the relevant detailed entries:

- [2026-04-28 Data API default-grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): rollout to new projects began May 30; existing-project rollout is scheduled October 30. Direct PostgreSQL is unaffected. Inspect actual grants and exposure rather than relying on defaults.
- [2026-08-12 backup scheduling fix](https://supabase.com/changelog/bulk-prepare-retry-on-transient-failure): scheduling now retries missed work. Still require observed backup freshness and a restore drill for the chosen project.
- [2026-07-30 restore credential fix](https://supabase.com/changelog/restore-credential-resync): physical restores reapply current credentials. Still verify restricted roles and session invalidation after restore.

Other scanned changes concerning self-hosted gateways, Realtime schema mutation,
extension version clauses and Management API logs have no implementation dependency
in this documentation slice. Re-scan before choosing SDKs or migration tooling.

## Decision record Vambah must complete

All entries remain **UNDECIDED**. Recommendations above are not selections.
Return this record to the captain with non-secret values only.

| Field | Required answer |
| --- | --- |
| Database | Accept/reject Supabase; organization/account owner; isolated dev project name; exact region; observed PostgreSQL version once created |
| Plan and money | Free synthetic evaluation or approved paid plan; project count; recurring ceiling including tax/extras; billing owner; approved cost enforcement and stop procedure |
| Login | Existing named tenant / Supabase OIDC beta / Auth0 / defer; issuer authority; tenant owner; login methods and audience; explicit beta acceptance if relevant |
| Client registration | Exact dev callback/logout/origin URLs; web-client type; registration owner; no wildcard or production callback |
| Revocation | Retain immediate exact-session check; name supported method and expiry rule; separately review any proposed bounded alternative |
| Application policy | Membership administrator; login lifetime; MFA requirement; approval of proposed upload-tombstone expiry + 24-hour horizon; other identity/audit retention and deletion policy |
| Availability | Server region/egress; required RTO and failure model; evidence owner for acknowledged-write RPO, failover and restore tests |
| Secrets and operations | Approved server secret store, access/rotation owner, incident owner, cleanup owner; no secret values in the record |

Next: complete the record and review the
[future setup checklist and approval gates](cad-provider-setup-checklist.md).
Completing this record authorizes no resources or configuration.
