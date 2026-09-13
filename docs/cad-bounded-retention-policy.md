# Bounded synthetic retention and lockout planning contract

Base: `64941be9c674d18e81291c54290a105f9d07ba1b`.
Branch: `codex/cad-bounded-retention-policy`.
Status: source-only candidate; no retention acceptance, provisioning or live authority.
Extends the [merged removal review](cad-removal-retention-policy.md) and
[positive session contract](cad-positive-synthetic-auth-session.md). Pinned Auth
0.0.95 evidence remains governed by removalRetentionReview.json; this packet
makes no new claim about the current provider API. No runtime or schema changes.

## Proposed exact bounds

These are proposed acceptance limits, not observed rows or approved retention.
Exactly two newly created synthetic identities; no reuse or additional cohort.
During qualification the existing maximum selected graph remains 20 records per
identity (40 total). That is an inventory ceiling, not permission to create every
record type. Unexpected Password verification or CAD rows stop the run.

| Table | Terminal maximum per identity | Two-identity maximum |
| --- | ---: | ---: |
| users | 1, exactly | 2 |
| authAccounts | 1, exactly, Password only | 2 |
| authRateLimits | 1, only exact account-ID identifier | 2 |
| authSessions | 0 | 0 |
| authRefreshTokens | 0 | 0 |
| authVerificationCodes | 0 | 0 |
| authVerifiers | 0 | 0 |
| cadUserAuthority | 0 | 0 |
| cadMemberships | 0 | 0 |
| cadUploadSessions | 0 | 0 |

Terminal residue is four to six rows, including credential hashes in authAccounts.
Never label it removed, erased or cleanupVerified. Optional rate-limit residue
requires exact provenance; it does not substitute for lockout. Any overflow,
unknown table, missing count, ambiguous ownership or unexpected row stops acceptance.
There is no automatic truncation, deletion, retry or wider scan.

Propose an absolute retention ceiling of 24 hours from first retained write,
including time spent running qualification; this is a decision for later approval.
A named private custodian, review appointment strictly before expiry, eventual
supported disposition plan, and enforcement evidence must precede provisioning.
The committed policy leaves custodian/expiry null and every gate false. No real
appointment or custodian is invented. Review due or expiry reached blocks further
work and requires escalation; expiry never authorizes deletion. Overdue residue
remains explicitly outstanding until separately approved disposition is verified.
Logs, backups, register and journal copies need separate retention terms; these
row limits cannot establish their erasure or vendor retention guarantees.

## Lockout implementation acceptance criteria

No lockout is implemented by this packet. Before permitting retained identities,
a separately reviewed server-side control must deny new sign-in and session
creation, refresh and stale-session acceptance for the exact retained cohort on
every entry point, including direct Auth calls bypassing the app. Fail closed on
missing/unavailable lockout state, source mismatch, expired custody and rollback.
Password rotation, destruction of a local password, session expiry, built-in
rate limits or a client/UI block do not establish these properties.

Required sequence: durably deny admission before revocation; serialize against
in-flight sign-in and refresh; revoke every owned session with no except list;
preserve session selectors; reconcile refresh descendants and prove zero live
session/refresh rows; test stale JWT rejection at protected readers and direct
credential/refresh denial; then inventory terminal residue. Concurrent admission
must either lose atomically or be caught and revoked before terminal acceptance.
A timeout at any step is unknown, never a successful lockout receipt.

Future offline and approved live abuse matrix must cover correct and wrong
passwords, signup/reset/verification attempts, extra parameters, noncohort input,
direct endpoints, concurrent refresh/sign-in at revocation, repeated attempts,
expired/absent lockout state, stale tokens, provider failure and rollback releases.
Blocked requests must create no sessions, refresh, verification, CAD or additional
rate-limit rows. Denial must precede credential processing where possible so an
attacker cannot grow retained data or reset a rate-limit entry. Reject generic
responses without user enumeration or secrets. Any unavoidable provider write
requires a revised reviewed budget/policy, never an assumed exception. Abuse load
itself must be bounded outside Auth and cannot create unbounded denial logs.
These are implementation requirements, not SDK-supported claims or test results.

## Reconciliation and run-owned cleanup selectors

Private register binding: source SHA, immutable project/deployment, run ID,
cohort slot, operator/custodian, operation sequence, pending-before-dispatch receipt,
post-write ownership receipt, exact IDs, pre-write zero/collision evidence and UTC
window. A public artifact holds opaque references and digests, never IDs, addresses,
credential hashes, tokens, passwords or raw exceptions. Matching email is not ownership.

| Table | Reviewed selector strategy for a future adapter |
| --- | --- |
| users | Point-read exact new ID from durable ownership receipt and absent-only evidence. |
| authAccounts | Exact account ID plus user/provider/account tuple; collision check providerAndAccountId; inventory userIdAndProvider. |
| authSessions | userId index plus preserved exact session IDs; bounded inventory before revoke. |
| authRefreshTokens | sessionIdAndParentRefreshTokenId prefix for every preserved session, including descendants. |
| authVerificationCodes | accountId index and exact owned account; any result stops normal retention. |
| authVerifiers | Exact registered IDs/signature linkage only; optional sessionId is not an ownership proof or indexed user selector. Unattached rows block. |
| authRateLimits | identifier index with exact Password account ID; unknown identifiers block. |
| cadUserAuthority | by_userId; expected empty. |
| cadMemberships | by_userId_and_shopId user prefix; expected empty. |
| cadUploadSessions | Exact run-registered session ID or digest, never expiry-wide cleanup; no user index. Expected empty. |

All future reads must use cap-plus-one bounded detection with explicit operation
and backend fanout limits; current SDK collect-based helpers need their own proof
or reviewed replacement before claiming a hard capacity bound. Preserve selectors
before parent revocation. Unknown outcomes use the original run/destination and
pending operation; do not replay provisioning or switch journal paths. A lack of
returned IDs is not proof of no write. No broad scan or guessed Auth-table delete.

A future cleanup manifest must name exact run-owned rows, expected counts,
relationship evidence, inventory digest, supported operation, source/destination,
operator, UTC window, enforceable capacity and postcondition. Recheck drift and
exclusive ownership immediately before mutation. Linked, preexisting, unknown or
concurrently modified rows stop cleanup. Read-only reconciliation and mutation
approval remain separate; a stopped ledger is never reopened for cleanup.

## Machine-readable planning shape and rollback

[boundedRetentionPolicy.json](../offline/cad-convex/boundedRetentionPolicy.json)
holds the disabled proposal. The pure companion validator accepts synthetic fixture
references only. The [tests](../scripts/cad-convex-bounded-retention.test.js) provide
a complete manifest example with run/source/destination, custodian/review/disposition,
lockout evidence reference, absolute UTC creation/review/expiry, two ownership
receipts, ten-table counts and exact selector-reference arrays. It validates shape
and caps only; a string reference does not verify evidence or authorize anything.
Actual private register/adapters remain unimplemented. Result is always
liveReady=false, retentionOverride=false and cleanupVerified=false.

The existing zero-final-inventory lifecycle and removal gate are unchanged.
Future retained terminal state must be separately integrated and tested, never
passed through the remove port. Before activation, source rollback must preserve
lockout and custody enforcement while reading existing rows; reverting to a release
that can re-enable Password admission is unsafe and must block deployment. A code
rollback cannot remove retained rows or reverse deletion. No schema migration is
introduced; the unchanged ten-table/sixteen-index rollback fixture remains the
compatibility check. It does not prove future lockout rollback behavior.

## Future approval phrases

Each template requires a concrete reviewed manifest with every bracket filled.
No template is authorization, and policy acceptance cannot substitute for E/D/T.

1. Publication: “Approve pushing only commit [full local SHA] from
   codex/cad-bounded-retention-policy to public repository vsillah/ReversR-Rebuild
   and opening a draft PR against main for the source-only bounded retention and
   lockout planning packet. No merge, deployment, live tests, env changes, secrets,
   provider/auth/resource or usage/billing changes, enrollment, email/SMS, store
   mutation, CAD uploads/conversion, private CAD, Sandbox or lane cleanup.”
2. Policy acceptance: “Approve only bounded synthetic retention policy [digest]
   for source [SHA], destination [immutable ref], exact caps [manifest], private
   custodian [ref], first-write/expiry/review UTC [manifest], lockout [review] and
   eventual disposition [plan]. This accepts policy only; no live access, writes,
   provisioning, deployment or retained records are authorized.”
3. Implementation: “Approve local source and offline tests only for lockout,
   retained terminal state and private-register adapter brief [digest] based on
   [SHA], including abuse and rollback matrix [ref]. No push, deploy, live tests,
   provider/env/resource settings, enrollment, stores or CAD work.”
4. Environment E: “Approve only development configuration commands [manifest
   digest] for immutable destination [ref], source [SHA], operator [ref], UTC window
   [start/end] and rollback [manifest]. No deployment, enrollment, live Auth run,
   usage/billing changes, CAD or production action.” Secret handling must be
   separately described in that reviewed manifest, never inferred here.
5. Deployment D: “Approve only deployment of reviewed source [SHA] to immutable
   development destination [ref] under deployment/rollback manifest [digest] and
   UTC window [start/end]. No live qualification, provisioning, CAD or production.”
6. Qualification T: “Approve exactly one bounded synthetic Auth/session run under
   manifest [digest], source [SHA], immutable development release [ref], operator
   [ref], private two-identity cohort [ref], UTC window [start/end], enforced cost
   and cleanup capacity [refs], and accepted retention/lockout policy [digest].
   Execute only enumerated commands. No retries, real users, email/SMS, CAD uploads,
   conversion, private CAD, Sandbox or production changes.” Missing E/D or any
   remaining evidence blocks T. The inherited 80 work / 20 cleanup / 100 logical
   attempts and 15-minute window do not themselves cap SDK operations or spending.
7. Reconciliation: “Approve read-only reconciliation of run [ref], operation
   [sequence] on [immutable destination] using source/selector manifest [digest],
   operator [ref], UTC window [start/end] and bounded reads/cost [refs]. No replay,
   writes, credentials, deletion or broader scans.”
8. Cleanup/disposition: “Approve only supported operations [manifest digest] for
   exact run-owned records [private selector ref] on [immutable destination], source
   [SHA], operator [ref], UTC window [start/end], capacity [refs] and verified
   postconditions [manifest]. No unrelated records, new provisioning, resource
   retirement, CAD or production changes.” Whole-resource retirement requires
   distinct destructive approval and support/backup-retention evidence.

## Validation and roadmap

Local validation: 172 regression tests passed, including six new focused tests.
TypeScript passed; five generated bindings verified. The unchanged ten-table,
sixteen-index rollback model passed with 22 forward and 22 rollback fixture rows.
Manifest version 21 covers 97 files; the 83-file source audit found zero leak
patterns and passed disabled-gate/runtime-isolation checks. Whitespace passed.
Dependencies reuse the existing local pinned node_modules through an ignored
symlink; no install or network dependency fetch occurred.

```sh
node --test scripts/cad-convex-bounded-retention.test.js
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-rollback-compatibility.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
UI/viewport/hosted QA is not applicable: no visible or deployed surface changes.
Offline tests validate policy shape/caps/custody/ownership rejection and removal
non-bypass. They do not prove actual provider lockout, cryptography, concurrency,
retention enforcement or live cleanup. All runtime admission gates remain closed.

Next: captain reviews this local commit, then obtains publication-only approval.
Policy acceptance, implementation, verified adapters and E/D/T remain later gates.
Expense incurred: $0.
