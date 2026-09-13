# CAD lockout and retained terminal-state implementation readiness

Base: `c411fc5be019a4f0f90ae0912392a2be1bdfee8e`.
Branch: `codex/cad-lockout-retained-terminal-state`.
Status: local source-only contract. No provider lockout implementation or live authority.
Extends [bounded retention](cad-bounded-retention-policy.md), the
[removal review](cad-removal-retention-policy.md), and the
[transport register](cad-auth-transport-run-register.md).

## Server-side implementation boundary

A future adapter must durably deny admission for the exact registered two-identity
cohort before revocation. Denial must apply to direct Auth endpoints and protected
readers, including already-issued JWTs. Client controls, password destruction,
rotation, expiry and rate limits cannot establish lockout. The current production
Password provider remains disabled; no runtime or schema file changes in this packet.
Auth 0.0.95 / Convex 1.45.0 are the pinned review targets, not a claim that they
provide a suitable interception hook. A future implementation review must prove
all entry points are interceptable before credentials or provider writes; otherwise
provisioning remains blocked. No speculative Auth-table mutations are permitted.

Use a durable admission fence bound to immutable destination, cohort ownership and
monotonic epoch. All sign-in/session/refresh paths must read the fence and commit
against the same epoch; the fence write serializes with admission writes. Any path
outside that transaction requires an independently proven barrier and drain protocol.
Missing state, read failure, source mismatch, custody deadline or unsafe rollback
denies access. Noncohort requests never inherit cohort privileges; under this
qualification contract they also remain denied by the default closed gate.

Required receipt order: denyAdmission → captureSelectors → drainAdmissions →
revokeAllSessions → reconcileDescendants → probeDenials → inventoryRetained.
Capture includes sessions committed before the fence; draining proves no pre-fence
operation can subsequently commit. A race loser must create no new rows; an uncertain
commit stops acceptance and requires bounded reconciliation under the original
operation. No retry, provisioning replay, alternate journal or destination switch.
Revocation has no exception list. Stale JWT rejection must be tested at every
protected reader, regardless of cryptographic validity or nominal token expiry.

## Exact selectors and reconciliation

Private ownership requires source SHA, immutable project/release, run, two cohort
slots, operator, custodian, pending-before-dispatch operation, post-write IDs,
pre-write absence/collision evidence and UTC window. Email similarity is not ownership.
Public packets use opaque references only. Never expose addresses, tokens or hashes.

| Table | Exact boundary |
| --- | --- |
| users | Point-read registered new user ID with absent-only creation evidence. |
| authAccounts | Registered account ID plus user/provider/account tuple; Password only; providerAndAccountId collision check and userIdAndProvider inventory. |
| authSessions | userId inventory plus preserved registered IDs before revoke; cap-plus-one detection. |
| authRefreshTokens | sessionIdAndParentRefreshTokenId prefix for every preserved session, including descendants after parents disappear. |
| authVerificationCodes | accountId for exact owned account; any row blocks retention acceptance. |
| authVerifiers | Registered exact ID/signature linkage; optional sessionId alone proves no ownership. Unattached/unknown rows block. |
| authRateLimits | identifier index, exact Password account ID only, with creation provenance; unknown identifiers block. |
| cadUserAuthority | by_userId, must be empty. |
| cadMemberships | by_userId_and_shopId user prefix, must be empty. |
| cadUploadSessions | Registered session ID/digest only, must be empty; never expiry-wide scan. |

Active inventory stays within 20 selected records per identity, 40 total. Every
selector query requires cap-plus-one detection, explicit operation/fanout/cost
bounds and exclusive ownership checks. A collect-based helper needs a reviewed
replacement or a bound proof. Overflow, ambiguity, missing count, drift or provider
timeout means unknown, not zero. Preserved session selectors remain in the private
register after zero terminal counts. Read-only reconciliation does not authorize
revocation, mutation, cleanup or reopening a stopped ledger.

## Retained terminal contract

The pure [model](../offline/cad-convex/retainedTerminalState.js) validates an ordered
synthetic receipt envelope against the merged retention validator. Receipts bind
run/source/destination, unique operation and sequence, monotonic UTC time, evidence
reference and two slot-aligned session selector arrays, preserved after capture.
Each array is bounded by the inherited active per-identity ceiling; this does not
prove backend query capacity. Fixture references and `fixture-confirmed` outcomes
are assertions only: this model does not inspect evidence or verify a real fence,
cohort relationship, concurrency, revocation or custody enforcement.

Successful fixture state is FIXTURE_RETAINED_PENDING_DISPOSITION. Any invalid or
uncertain sequence is FIXTURE_BLOCKED_RECONCILIATION_REQUIRED. Both always report
liveReady=false, retentionOverride=false, cleanupVerified=false and deleted=false.
The existing zero-inventory removal lifecycle is unchanged and still rejects
provisioning through its remove port. This model is never plugged into that port.

Terminal inventory is exactly one users and one Password authAccounts row per
identity, optionally one proven authRateLimits row per identity: four to six rows,
including credential hashes. All seven other tables must be empty. The merged
maximum 24 hours runs from first retained write, including qualification time.
Review is strictly before expiry; reaching review or expiry blocks acceptance and
requires escalation. It never grants deletion. Custodian, first-write UTC, review,
expiry, lockout evidence and eventual disposition must all be concrete before any
future provisioning. Committed custody/expiry remain null. Overdue custody remains
outstanding; a code rollback cannot erase rows. Logs, journals, registers and backups
need separately reviewed retention terms.

## Abuse, concurrency and rollback acceptance matrix

Every row below is a future implementation/live test requirement, not an observed
provider result. All denial cases require no new session, refresh, verification,
CAD or rate-limit rows; no credential processing, enumeration or unbounded denial
logs. Any unavoidable provider write requires revised policy acceptance first.
The [disabled manifest](../offline/cad-convex/lockoutReadiness.json) enumerates cases.

| Case | Required exercise and acceptance boundary |
| --- | --- |
| Correct/wrong password | Direct and app paths reject before credential handling; identical generic response. |
| Signup/reset/verification | Exercise each flow with retained and noncohort input; no account/code/email/SMS side effects. |
| Extra parameters | Unknown flow/provider/account fields cannot bypass fence or broaden selectors. |
| Noncohort | No cohort association by email; closed default gate denies without writes. |
| Direct Auth | Bypass UI and call every exposed Auth entry point; same denial and no writes. |
| Concurrent sign-in | Schedule before fence, at commit and after fence; drain pre-fence commits, reject epoch losers. |
| Concurrent refresh | Race parent and descendant refresh with revocation; preserve selectors and prove zero descendants. |
| Repeated attempts | Enforce bounded external load budget; no new rate-limit identifiers or unbounded logs. |
| Stale session | Replay previously valid JWT at each reader after fence and revocation; generic denial. |
| Missing lockout | Missing/unavailable/mismatched state denies; no fallback to enabled Password. |
| Expired custody | Test exact review and expiry instants, clock reversal and overdue escalation; never delete automatically. |
| Provider failure | Inject before dispatch, after write, lost response and inventory timeout; stop with pending original operation. |
| Rollback release | Reject deployment if old code skips fence/epoch/custody; preserve reads of retained state while admission stays denied. |

The unchanged ten-table/sixteen-index rollback fixture checks schema compatibility
only. A future fence store or epoch schema needs separate migration/rollback review.
It cannot silently expand the current selected graph or retained-row budget.

## Exact future approval templates

Fill every bracket from a concrete reviewed manifest. These templates grant nothing.

1. Publication: “Approve pushing only commit [full SHA] from codex/cad-lockout-retained-terminal-state to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only lockout and retained terminal-state packet. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD uploads/conversion, private CAD, Sandbox or lane cleanup.”
2. Policy: “Approve only bounded synthetic retention policy [digest] for source [SHA], immutable destination [ref], exact cohort/caps [manifest], private custodian [ref], first-write/review/expiry UTC [manifest], lockout review [ref] and disposition plan [ref]. Policy acceptance only; no provisioning, retained records, deployment, live access or writes.”
3. Implementation: “Approve local source and offline tests only for server-side lockout, retained terminal lifecycle and private-register adapters under brief [digest], source [SHA], selector and abuse/rollback matrix [refs]. No publication, deployment, live tests, settings, secrets, enrollment, store mutation or CAD work.”
4. Environment E: “Approve only enumerated development configuration commands [digest], immutable destination [ref], source [SHA], operator [ref], UTC window [start/end], secret-handling and rollback manifest [ref]. No deployment, enrollment, live qualification, usage/billing, CAD or production changes.”
5. Deployment D: “Approve only deployment of source [SHA] to immutable development destination [ref] under deployment and fence-preserving rollback manifest [digest], operator [ref], UTC window [start/end]. No live qualification, provisioning, CAD or production changes.”
6. Qualification T: “Approve exactly one bounded synthetic Auth/session run [manifest digest], source [SHA], immutable development release [ref], operator [ref], private two-identity cohort [ref], UTC window [start/end], enforced cost/operation/capacity bounds [refs] and accepted retention/lockout policy [digest]. Execute only enumerated commands. No retries, real users, email/SMS, CAD, private CAD, Sandbox or production changes.” E and D evidence and verified adapters must precede T; the inherited 80 work/20 cleanup/100 logical attempts and 15-minute window do not cap SDK work or spending.
7. Reconciliation: “Approve read-only reconciliation of run [ref], pending operation [sequence], immutable destination [ref], source/selector manifest [digest], operator [ref], UTC window [start/end] and bounded reads/cost [refs]. No replay, writes, credentials, deletion or broad scans.”
8. Disposition: “Approve only supported operations [manifest digest] for exact run-owned records [private selector ref], immutable destination [ref], source [SHA], operator [ref], UTC window [start/end], enforceable capacity [refs], drift/ownership checks and verified postconditions [manifest]. No unrelated records, provisioning, resource retirement, CAD or production changes.” Whole-resource retirement needs distinct destructive approval.

## Validation and roadmap

Focused tests exercise sequence failure, binding drift, preserved selectors,
review/expiry, forbidden residue, private payload rejection and removal non-bypass.
These are contract tests only; the matrix above remains unqualified against Auth.
No UI changed, so browser/viewport QA is inapplicable. No live service was contacted.

Next: Captain reviews local packet and obtains publication approval. Then separately
review policy acceptance and future server/private-register implementation, followed
by E/D/T evidence. Provider interception, atomic admission fencing, live custody
and supported disposition remain unresolved gates. Expense: $0.

Local validation completed: 177 regression tests passed (five new focused tests),
TypeScript passed, five generated bindings verified, rollback model passed with
ten tables/sixteen indexes and 22 forward/22 rollback rows. Manifest version 22
covers 101 files; the source audit covers 87 files with zero leak matches and
closed-gate/runtime-isolation checks. Existing local pinned dependencies were
reused via an ignored node_modules symlink; no install or network fetch occurred.

Exact validation commands:

```sh
node --test scripts/cad-convex-retained-terminal-state.test.js
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-rollback-compatibility.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
