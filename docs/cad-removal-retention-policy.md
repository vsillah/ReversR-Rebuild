# CAD removal and retention decision packet

Prepared September 13, 2026, from `fe2aee7463e813378168ba2aaaba8717e87e1400` on
`codex/cad-removal-retention-policy`. Status: source review complete; all live gates
remain closed. This extends the [transport/register packet](cad-auth-transport-run-register.md)
and [positive-session contract](cad-positive-synthetic-auth-session.md).

Decision: keep provisioning blocked. Auth 0.0.95 provides session invalidation;
this review found no exported account/user removal helper. No complete removal
adapter is supported by the evidence collected here. Bounded retention is a
reviewed alternative for a future decision, with no approval or implementation.
Neither source publication nor an approval-shaped fixture makes it executable.

## Evidence and supported operations

The repository and lockfile both pin `@convex-dev/auth` to `0.0.95`. The local
[review record](../offline/cad-convex/removalRetentionReview.json) binds SHA-256
hashes for eleven installed package files. The new test refuses drift. Dependencies
are reused through an ignored local node_modules symlink; no install was needed.
Paths below are relative to `node_modules/@convex-dev/auth/`.

| Pinned source / symbol | Observed scope and implication |
| --- | --- |
| `src/server/index.ts`, `dist/server/index.js`, package exports | Public server helpers include createAccount, retrieveAccount, modifyAccountCredentials and invalidateSessions. Neither source nor built export includes deleteUser/removeUser/deleteAccount/removeAccount. This is bounded export evidence, not proof that removal is impossible everywhere. |
| `src/server/implementation/mutations/signOut.ts`, signOutImpl | Finds the originating session from authenticated context, point-reads it and calls deleteSession. Missing session returns null. A no-op acknowledgment cannot prove complete cleanup. |
| `src/server/implementation/mutations/invalidateSessions.ts`, invalidateSessionsImpl | Collects authSessions through the userId index; deletes each unless present in except. Future full revocation must omit except and prove exclusive ownership and bounded fanout. |
| `src/server/implementation/sessions.ts`, deleteSession | Deletes the selected session then calls deleteAllRefreshTokens. It does not delete the user/account or the rest of the graph. |
| `src/server/implementation/refreshTokens.ts`, deleteAllRefreshTokens | Collects refresh records by sessionId prefix of sessionIdAndParentRefreshTokenId, then deletes them. One logical call can have many database operations. |
| `src/server/implementation/mutations/createAccountFromCredentials.ts` | Existing matching credentials can return an existing account/user. createAccount is not an absent-only creation guarantee. It hashes new credentials and receives existing session context; future provisioning must prove no collision, no linking and no ambient user context. |
| `src/server/implementation/mutations/retrieveAccountWithCredentials.ts`, `rateLimit.ts` | Password failure accounting uses the account ID as identifier; successful credential verification resets that entry. General rate-limit rows have no typed user foreign key. |
| `src/server/implementation/types.ts`, authTables | Defines seven Auth tables and indexes. See graph inventory below; schema references do not establish a deletion cascade. |

Current public [server API documentation](https://labs.convex.dev/auth/api_reference/server)
corroborates createAccount, credential modification and session invalidation. It
lists no account/user removal helper. These moving docs are corroboration only;
the hashed installed files govern this version-specific finding. The
[session-validity documentation](https://labs.convex.dev/auth/advanced#session-validity)
explains that a JWT may remain accepted after session deletion, so critical checks
must read session validity. Both pages were read September 13, 2026. No provider
support ticket was sent and no private provider endpoint was inspected.

## Unsupported substitutes

- Session invalidation or expiration does not delete accounts, credential hashes,
  users, or every auxiliary record, and does not prevent another Password sign-in.
- Password rotation changes a credential; it is neither account deletion nor a
  supported disabled-account state. Destroying a locally held password does not
  remove its stored hash or establish permanent lockout.
- Direct table deletes, copied private SDK internals, bulk dashboard deletion or a
  guessed cascade are not a reviewed removal adapter. The tests execute SDK source
  only inside a VM with fake data; they introduce no registered delete function.
- A third-party provider's deletion API, Better Auth examples, or deletion of the
  developer's Convex dashboard account does not establish support for this pinned
  Password-backed application-user graph. No provider migration is proposed here.
- A whole development resource retirement is broader than per-user removal and
  has no reviewed command, platform retention guarantee or approval in this packet.

## Reviewed alternatives, all disabled

| Alternative | Potential outcome | Requirements before selection can become implementation |
| --- | --- | --- |
| Supported removal adapter | Preserve the existing zero-residue acceptance criterion. Preferred if support can be established. | Version-specific public/provider evidence for the complete graph; exact ownership/index strategy; atomicity or bounded staged protocol; dry-run preview; collision and unknown-write handling; rollback limits and deletion receipt. A future SDK upgrade needs a separate dependency review. |
| Bounded quarantine | Retain explicitly enumerated synthetic records after verified revocation and lockout, reporting retained residue rather than cleanup success. | Explicit user decision; source-reviewed lockout preventing new sign-in/session/refresh; exact allowed rows and maximum counts; named private custodian; absolute UTC expiry, review appointment, enforcement and overdue escalation; separately approved eventual disposition. Missing or expired fields deny new provisioning. No indefinite default. |
| Disposable resource retirement | Retire a separately approved exclusively synthetic resource as a whole. | Verified exclusive resource inventory, immutable target, resource-deletion support evidence, log/backup retention terms, cost and receipt checks, and explicit destructive-resource approval. This is not a shortcut for the currently configured development destination. |

The machine-readable alternatives have enabled=false and approved=false.
The current lifecycle still requires a zero baseline and zero final inventory;
retention cannot be plugged into its remove port or counted as cleanupVerified.
A later retained terminal state needs distinct tests, receipts and acceptance
criteria. Reusing a retained cohort would violate the current absent-only contract;
repeated runs must remain blocked until a separately reviewed reuse or disposition
policy exists. No retention duration, custodian or appointment is invented here.

## Cleanup graph and reconciliation risk

These are future inventory requirements, not an executable deletion order. The
current ten-table model bounds the complete selected graph at 20 records per
identity. Live indexed access and accounting are still unqualified.

| Records | Ownership and reconciliation requirement |
| --- | --- |
| users | Exact newly created ID and pre-write collision evidence, independently bound to run and cohort slot. Never infer ownership from a matching email alone. |
| authAccounts | Exact user/provider/account pair; providerAndAccountId collision checks and userIdAndProvider inventory. Linked/preexisting accounts stop cleanup. Credential hashes stay private. |
| authSessions | userId index plus exact originating session IDs; prevent concurrent sign-in before inventory/revocation. Check all owned sessions, not only the two originating IDs. |
| authRefreshTokens | Preserve session selectors before session deletion; include descendants through the session index. Refresh concurrency and unbounded collect can invalidate the operation/cost model. |
| authVerificationCodes | accountId index. Unexpected verification records violate the Password-only no-delivery model and require review. |
| authVerifiers | Optional sessionId; only signature is indexed. Unattached rows or missing private linkage are ownership gaps, never permission to scan/delete unrelated data. Isolated zero baseline needs actual bounded live evidence. |
| authRateLimits | identifier index; Password path uses account ID, but do not extrapolate to all providers. Unexpected identifiers require reconciliation, not broad deletion. |
| cadUserAuthority / cadMemberships | User indexes exist. Current synthetic run expects zero CAD authority/membership records; any residue stops the planned path. |
| cadUploadSessions | Indexes are credential digest, session ID and expiry, not user ID. An unexpected row needs an exact private selector and review; uploads remain disabled. |

Before any future live attempt, the private pending record must precede dispatch,
and ownership receipt must follow it durably. A timeout or failed receipt is an
unknown outcome even if no ID reached the caller. Stop, preserve the local journal
and private register, and obtain a separate read-only reconciliation appointment.
Use the original source/run/destination/cohort/operation binding; never replay the
create call, choose another journal path or treat an empty public receipt as absence.
A discovered preexisting or ambiguous row is not run-owned cleanup material.

Following reconciliation, mutations require their own exact cleanup manifest and
approval. Recheck ownership and counts against drift, deny concurrent activity,
reserve enforceable provider capacity, and collect post-operation inventory plus
stale-session/refresh/new-sign-in denial evidence. Account deletion is not
reversible by redeploying source. A disabled rollback release restores admission
posture only; it cannot restore a removed identity. Logs, backups and private run
records need their own reviewed custody/disposition terms; zero live table counts
do not establish erasure of those copies.

The existing 80 work / 20 cleanup / 100 total logical-attempt budget and 15-minute
window are fixture limits. They neither cap SDK database fanout nor guarantee live
cleanup capacity. A stopped/expired ledger cannot be reopened for cleanup. Any
outstanding work goes through a fresh, separately approved reconciliation manifest;
there is no automatic retry or automatic deadline extension.

## Remaining live blockers and exact future gates

No Convex runtime source, schema, provider list, issuer gate or upload route changes.
Source audit continues to require developmentAuthReviewed=false, the empty cohort,
internal CAD functions and offline isolation. UI/viewport and hosted QA are N/A;
local upload regression covers USER_UPLOADS_DISABLED before body access.

The remaining work is a supported removal path or explicit retention decision,
actual verified host transport and private durable register adapters, collision and
concurrency proof, immutable destination/release evidence, diagnostics redaction,
enforceable cost/cleanup capacity, exact commands, appointments and rollback packet.
These were not satisfied by SDK source tests.

Each phrase below is a future template, not approval. Captain must fill every
bracket with reviewed evidence and present the resulting concrete manifest first.

1. Publication only: “Approve pushing only commit [full reviewed local SHA] from
   codex/cad-removal-retention-policy to public repository vsillah/ReversR-Rebuild
   and opening a draft PR against main for the source-only CAD removal/retention
   decision and offline regression packet. No merge, deployment, live Convex/Auth
   tests, env changes, secrets, provider/auth/resource configuration, usage/billing
   changes, enrollment, email/SMS, store mutation, CAD uploads, conversion, private
   CAD, Sandbox dispatch or branch/worktree cleanup.”
2. Retention decision only, if selected: “Approve policy-only review of bounded
   synthetic retention manifest [digest] for source [SHA], destination [immutable
   project/deployment], records/count caps [manifest], custodian [private ref],
   expiry [UTC], lockout and eventual disposition [review refs]. Authorize local
   source/test implementation only; no provisioning, live access, retained records,
   deployment or external mutations.” Selecting removal instead requires the same
   source-only scope with the reviewed removal support evidence and adapter brief.
3. E/D/live T remain distinct gates in the [execution inputs](cad-live-dev-execution-inputs.md).
   Future T phrase: “Approve exactly one bounded synthetic Auth run under manifest
   [digest], commit [SHA], immutable development release [ref], appointed operator
   [ref], two-person synthetic cohort [private ref], window [UTC start/end], enforced
   cost and cleanup capacity [refs], and approved removal or retention policy [digest].
   Execute only enumerated commands; no retries, real users, delivery, CAD uploads,
   conversion, Sandbox, private CAD or production changes.” Missing E/D or any
   manifest field blocks T; this text grants neither.
4. Unknown outcome: “Approve read-only reconciliation of run [private ref] and
   operation [sequence] on [immutable destination], using [source/selector manifest
   digest], operator [ref], window [UTC], and bounded read/cost limits [refs]. No
   retries, writes, removal, credential changes or broader scans.”
5. After a reviewed inventory: “Approve only the cleanup operations in manifest
   [digest] for exact run-owned records [private selector ref] on [immutable
   destination], under source [SHA], operator [ref], window [UTC], cost/capacity
   [refs] and post-cleanup verification [manifest]. No other records, resource
   retirement, production changes, provisioning or CAD work.” Resource retirement
   requires a different explicit destructive approval naming the whole resource.

## Validation and roadmap

Commands for this packet:

```sh
node --test scripts/cad-convex-removal-retention.test.js scripts/cad-convex-auth-transport-register.test.js
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-rollback-compatibility.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Tests execute pinned invalidation/signOut/session/refresh source with strict fake
imports and in-memory rows. They verify the limited deletion scope, unrelated
session survival and retained account graph. They do not mint tokens, access a
provider, or prove transaction rollback, JWT crypto, lockout or live deletion.
The composed transport test injects claimed approvals for every alternative and
requires zero host calls and zero writes. SDK source hashes and runtime isolation
are regression tripwires, not authorization or provider attestations.

Completed: version-bound removal evidence, disabled retention alternatives and
cleanup/reconciliation policy. Plan impact: no immediate live provisioning path;
resolve the disposition decision before implementing a live adapter. Next action:
captain source review and exact publication-only approval. All live and cleanup
gates stay closed. Expense incurred: $0.

Local validation receipt: 22 focused tests and 166 broader regression tests passed;
TypeScript passed; five generated bindings verified; unchanged ten-table/sixteen-index
rollback model passed with 22 forward and 22 rollback fixture rows. Manifest version
20 covers 93 files; source audit covers 79 files with zero leak-pattern matches and
passes disabled-policy/runtime-isolation checks. Whitespace check passed. No live
Convex/Auth tests, account enrollment, env/provider/resource/usage/billing/store
changes, secrets, email/SMS, CAD uploads/conversion, private CAD, Sandbox dispatch,
deployment, push, merge or existing branch/worktree cleanup occurred.
