# CAD lockout and private-register fixture adapters

Base: `80474b111d358f98788f363672973207ffee854d`.
Branch: `codex/cad-lockout-private-register-adapters`.
Status: local source-only adapter readiness. Production admission remains closed.

This packet implements the offline boundaries specified by
[bounded retention](cad-bounded-retention-policy.md) and
[retained terminal state](cad-lockout-retained-terminal-state.md).
The [adapter](../offline/cad-convex/lockoutPrivateAdapters.js) has no provider,
network, persistence, credential loader, environment access or dispatch callback.
It accepts synthetic `fixture:` references only. It is isolated from runtime imports.
No Convex/schema/SDK/runtime files change. Existing Auth 0.0.95 / Convex 1.45.0
pins remain unchanged; this packet makes no new provider-support claim.

## Register and admission contracts

The constructor binds exact run, source SHA, project, immutable destination,
operator and custodian references with a first-write/review/expiry clock window.
Two slots acquire ownership only through pending-before-dispatch followed by a
matching post-write receipt. Intent records the exact Password account identifier,
operation sequence, absence and collision evidence references before returning a
fixture envelope. It performs no dispatch. A single pending operation is allowed;
unknown outcome freezes the original sequence and selectors. Read-only pending
reconciliation selects that original account on the original destination with one
cap-plus-one query. It cannot establish ownership, recover execution or replay a write.

Post-write receipt binds user ID, authAccounts row ID, Password account identifier,
provider, ownership reference, optional rate-limit row ID, verifier ID/signature
linkages and upload IDs. Cross-slot collisions and extra fields fail closed. Receipt
references assert provenance in tests; no evidence or real IDs are loaded or verified.
A production implementation would need durable pending storage before dispatch,
authenticated post-write evidence, crash recovery and a separately reviewed adapter.
In-memory state does not meet those durability requirements.

`denyAdmission` requires both owned slots, no pending operation and a next monotonic
epoch. Capture occurs after fencing, followed by an epoch-matched zero-in-flight
drain assertion. A new epoch requires capture/drain again and preserves prior
session selectors. A failed capture commits neither slot. The admission boundary
returns `AUTH_UNAVAILABLE` for every request, including correct/wrong password
scenarios, direct or unknown entry points, signup/reset/verification, extra fields,
noncohort, stale epoch, expired custody and protected readers. It never invokes
credential handling. This tests the disabled contract, not live Auth interception.

Actual fencing must serialize every admission commit against the same durable epoch,
or use a proven barrier/drain protocol. Concurrent race tests against a provider,
stale-JWT reader checks and pre-credential write prevention remain unqualified.
The fixture's drain evidence reference asserts a result; it cannot prove concurrency.

## Selector and bounded reconciliation contracts

| Table | Plan and acceptance boundary |
| --- | --- |
| users | Exact registered user ID point read. |
| authAccounts | providerAndAccountId with exact Password account identifier; userIdAndProvider with exact user/provider. Returned row must equal registered account row ID. |
| authSessions | userId inventory; every row must be in the preserved session set. |
| authRefreshTokens | sessionIdAndParentRefreshTokenId prefix per preserved session, without parent restriction, including descendants after revocation. |
| authVerificationCodes | accountId for registered account; terminal validator requires zero. |
| authVerifiers | Exact registered ID plus signature linkage; optional sessionId proves nothing. |
| authRateLimits | identifier equals exact Password account identifier; returned ID needs explicit rate-limit ownership receipt. |
| cadUserAuthority | by_userId; terminal zero. |
| cadMemberships | by_userId_and_shopId user prefix; terminal zero. |
| cadUploadSessions | Registered exact ID point reads only; terminal zero; no expiry-wide scan. |

Every plan carries `take=21`, operation count and backend-read ceiling. Responses
must match each query, assert completeness and bounded backend reads, and carry
exact ownership/relationship projections. Cap-plus-one, missing/timeout responses,
duplicate rows, unregistered sessions, wrong account IDs and selector drift stop
acceptance. Indexed inventory counts unique table/ID rows within 20 per slot (40
across both slots). Query specifications and response projections are fixture shapes,
not raw Convex rows or implemented SDK queries. A future adapter must enforce bounds
server-side; claimed backend-read counts alone are not evidence of enforcement.

Plans never search for unknown/unattached rows. Successful selected inventory reports
`FIXTURE_INDEXED_INVENTORY_ONLY`, `terminalReady=false`, and
`GLOBAL_ABSENCE_UNPROVEN`. Exact reads cannot establish absence of unregistered
verifiers/uploads. This unresolved provenance gate must be satisfied before live
retention acceptance; broad scans are not an implicit fallback.

## Retained terminal state and rollback

The retained wrapper uses the existing ordered terminal validator, then verifies
run/source/destination/custodian/window, exact slot ownership, retained user/account/
rate-limit selectors and preserved session arrays against the register. Fixtures
may yield four to six retained rows and `FIXTURE_RETAINED_PENDING_DISPOSITION`.
They always return `liveReady=false`, `retentionOverride=false`,
`cleanupVerified=false`, `deleted=false`. No remove port, cleanup action or mutation
exists. Terminal receipts remain synthetic assertions, separate from indexed
inventory; successful fixtures cannot prove provider revocation or global absence.

Review due, expiry or clock reversal stops work. Expiry never authorizes deletion.
The disabled manifest leaves actual custodian and expiry null. Logs, backups and
register copies require separate retention decisions.

Rollback inspection requires retained schema version 1, closed Password admission,
fence/epoch/custody enforcement and coverage of every declared entry point. Missing
or unsafe releases yield `UNSAFE_ROLLBACK`. These are capability assertions only;
source review and live qualification must prove the candidate actually enforces
them. The existing ten-table/sixteen-index rollback fixture still checks schema
compatibility. No fence store or additional retained rows are introduced here.

## Failure codes

Private offline diagnostics include `BINDING_REQUIRED`, `BINDING_MISMATCH`,
`CUSTODY_WINDOW_INVALID`, `PENDING_OPERATION_REQUIRED`,
`OWNERSHIP_EVIDENCE_REQUIRED`, `OWNERSHIP_MISMATCH`, `OWNERSHIP_COLLISION`,
`COHORT_OWNERSHIP_REQUIRED`, `RECONCILIATION_REQUIRED`, `FENCE_EPOCH_INVALID`,
`FENCE_SEQUENCE_INVALID`, `ADMISSION_DRAIN_REQUIRED`, `SESSION_SELECTORS_REQUIRED`,
`SELECTOR_DRIFT`, `SELECTOR_OWNERSHIP_INVALID`, `BOUNDED_READ_REQUIRED`,
`INVENTORY_OVERFLOW`, `INVENTORY_DRIFT`, `RATE_LIMIT_PROVENANCE_REQUIRED`,
`RETAINED_OWNERSHIP_UNPROVEN` and `UNSAFE_ROLLBACK`. The existing terminal validator
retains its precise envelope/receipt/count failure codes. Public admission always
returns generic `AUTH_UNAVAILABLE`; it does not echo inputs or provider exceptions.

## Future approval phrases

Fill all brackets from a reviewed manifest. Each phrase grants only its named gate.

1. Publication: “Approve pushing only commit [full SHA] from codex/cad-lockout-private-register-adapters to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only lockout/private-register adapter packet. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD uploads/conversion, private CAD, Sandbox or lane cleanup.”
2. Policy acceptance: “Approve only bounded synthetic retention policy [digest] for source [SHA], immutable destination [ref], exact cohort/caps [manifest], private custodian [ref], first-write/review/expiry UTC [manifest], lockout review [ref] and disposition plan [ref]. No live access, writes, provisioning or deployment.”
3. Implementation: “Approve local source and offline tests only for provider fence and durable private-register adapter brief [digest], source [SHA], entry-point, selector, concurrency and rollback matrix [refs]. No publication, deployment, live tests, settings, secrets, enrollment, store mutation or CAD work.”
4. Environment E: “Approve only enumerated development configuration commands [digest], immutable destination [ref], source [SHA], operator [ref], UTC window [start/end], secret-handling and rollback manifest [ref]. No deployment, enrollment, live qualification, usage/billing, CAD or production changes.”
5. Deployment D: “Approve only deployment of reviewed source [SHA] to immutable development destination [ref] under deployment and fence-preserving rollback manifest [digest], operator [ref], UTC window [start/end]. No live qualification, provisioning, CAD or production changes.”
6. Qualification T: “Approve exactly one bounded synthetic Auth/session run [manifest digest], source [SHA], immutable development release [ref], operator [ref], private two-identity cohort [ref], UTC window [start/end], enforced cost/operation/capacity bounds [refs], verified adapter review [ref] and accepted retention/lockout policy [digest]. Execute only enumerated commands. No retries, real users, email/SMS, CAD, private CAD, Sandbox or production changes.” E/D evidence and adapter qualification must precede T; 80 work/20 cleanup/100 logical attempts and a 15-minute window do not cap SDK operations or spending.
7. Reconciliation: “Approve read-only reconciliation of run [ref], original pending operation [sequence], immutable destination [ref], source/selector manifest [digest], operator [ref], UTC window [start/end] and bounded reads/cost [refs]. No replay, writes, credentials, deletion or broad scans.”
8. Cleanup/disposition: “Approve only supported operations [manifest digest] for exact run-owned records [private selector ref], immutable destination [ref], source [SHA], operator [ref], UTC window [start/end], enforceable capacity [refs], drift/ownership checks and verified postconditions [manifest]. No unrelated records, provisioning, resource retirement, CAD or production changes.” Resource retirement requires distinct destructive approval.

## Validation and next gate

Focused offline tests cover pending ordering, unknown writes, all binding dimensions,
custody boundaries, cohort collisions, generic denial, fence ordering, epoch drift,
exact ten-table selectors, query budgets, unknown rows, retained ownership and unsafe
rollback. All tests use synthetic fixture references. No UI changed; browser and
viewport QA are inapplicable. No live Convex/Auth, CAD, Sandbox, provider or environment
action is performed. Dependencies reuse an ignored symlink to local pinned modules.

```sh
node --test scripts/cad-convex-lockout-private-adapters.test.js
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-rollback-compatibility.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Validation result: 191 regression tests passed, including 14 new focused tests.
TypeScript passed; five generated bindings verified. Rollback remained compatible
with ten tables, sixteen indexes and 22 forward/22 rollback rows. Manifest version
23 covers 105 files. The 91-file source audit found zero leak-pattern matches and
passed closed-gate/runtime-isolation checks. Whitespace validation passed.

Next: captain reviews this local commit and obtains publication-only approval before
push/draft PR. Live interception, durable evidence, global absence, custody and
supported disposition remain blockers; policy, implementation and E/D/T are separate
gates. No scope expansion. Expense: $0.
