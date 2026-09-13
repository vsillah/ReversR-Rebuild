# CAD synthetic Auth transport and private run register

Base: `11a37f917de1121cf96672ff3163780800af1def` (PR #191).
Branch: `codex/cad-auth-transport-run-register`; worktree suffix:
`ReversR-Rebuild.worktrees/cad-auth-transport-run-register`.
Status: source-only local candidate; live provisioning remains blocked.

This continues [positive synthetic sessions](cad-positive-synthetic-auth-session.md),
[blocker resolution](cad-live-execution-blockers-resolution.md),
[execution inputs](cad-live-dev-execution-inputs.md), and
[server context assembly](cad-live-auth-source-assembly.md).
No server function, schema, generated binding, Auth provider, configuration, upload
route or UI changes. `developmentAuthReviewed=false`, empty installed cohort and
`USER_UPLOADS_DISABLED` remain enforced by existing regression tests.

## Removal decision

The installed lockfile-pinned Auth SDK is 0.0.95. Its public server export file
`node_modules/@convex-dev/auth/src/server/index.ts` exports `createAccount` and
`invalidateSessions`; it exposes no account/user removal helper. The focused test
pins that entire export file's SHA-256 and version. This is a local source finding,
not a claim about every provider API or a newly reviewed removal implementation.
No private SDK mutation or guessed delete cascade is used.

[syntheticRemovalBoundary.js](../offline/cad-convex/syntheticRemovalBoundary.js)
models these states:

| Input | State | Provisioning/removal |
| --- | --- | --- |
| Default pinned SDK 0.0.95 | `SUPPORTED_REMOVAL_MISSING` | Blocked |
| Different SDK version | `SDK_REVIEW_REQUIRED` | Blocked |
| Unknown mode or claimed retention approval | `REMOVAL_REVIEW_REQUIRED` | Blocked |
| Explicit `testOnly:true` and `offline-fixture` | `FIXTURE_REMOVAL_ONLY` | Fake-store exercise only |

The composed candidate checks this boundary before preparation/provisioning and
removal. A fixture returning `supportedRemoval:true` cannot override the pinned-SDK
state. The previous standalone PR #191 lifecycle remains a deliberately trusted
fixture model; use the new composition for the reviewed removal boundary.
There is no retention-override switch. A later retention decision requires a new
reviewed implementation and precise records, owner, deadline and cleanup policy.

## Private register contract

[syntheticRunRegister.js](../offline/cad-convex/syntheticRunRegister.js) validates a
strict in-memory record, copies its binding, and rejects unrecognized fields. It
creates no private register, credentials, encrypted store or network connection.
All committed fixtures use invented identifiers and the same two reserved cohort
addresses from PR #191, in the same slot order.

The private record binds:

- `runId`, full `sourceCommit`, immutable `projectId`/`deploymentId`, development
  `kind` and an opaque `releaseRef`.
- The exact absolute canonical `journalPath`; symlink parents and alternate paths
  deny. The existing exclusive journal tombstone prevents a second coordinator on
  that same path, even with a different source/run claim.
- Opaque `serviceSubjectRef`, `operatorRef`, `hostRef`, `custodyRef` and
  `reconciliationRef`. These are references to privately held evidence, never
  secret values, credential hashes, provider responses or appointment contents.
- Exactly two synthetic cohort slots, run start/end, observation time and approval
  expiry. Runs remain at most 15 minutes, strictly before the next UTC daily reset;
  evidence expires after 300 seconds. Clock rollback, future observations, expired
  authority and mismatched source/destination/release deny. No automatic refresh.

The independently supplied `expected` binding must match the record and each trusted
service/user-context observation. Matching fixture objects proves the contract
only: it does not establish immutable deployment identity, source attestation,
operator appointment, custody or a real approval. The record has only
`synthetic-offline` mode. Public status returns fixed flags and no identifiers,
private paths, refs, raw data or secrets. Private accessors are trusted adapter
interfaces and must never be emitted as public receipts.

The pending-operation tuple carries run/source/destination, journal path,
operator/host/custody/reconciliation refs, sequence, operation and cohort slot.
Before each lifecycle invocation the trusted `recordPending` port must durably
accept this tuple plus the current exact ownership selector, or the pre-provision
cohort slot. After provisioning/sign-in, `recordOwnership` must durably accept the
exact returned user/account/session IDs before success can reach the lifecycle.
Neither port receives passwords or token material. An unknown creation can therefore
be looked up privately by run/operation/cohort even if no result IDs arrived.
No reconciliation or replay API is implemented. A failed private receipt after a
mutation stops the shared journal with an unknown outcome. Journal entries themselves
retain fixed phases, sequence numbers and counts only.

A future private adapter must prove atomic unique-run claims across hosts, immutable
source/destination observations, exact cohort collision checks, bounded ownership
lookups and crash-safe receipt persistence. This in-memory contract and local file
cannot prevent a new register/journal path, different host, manual tombstone deletion
or forged trusted fixture ports. No distributed accounting or private storage is
claimed. Unknown outcomes need a separately approved read/cleanup appointment.

## Verified transport composition

[verifiedSyntheticTransport.js](../offline/cad-convex/verifiedSyntheticTransport.js)
constructs the existing lifecycle with wrapped trusted ports. Both fixed clients use
one existing durable local journal and one in-flight operation. The ledger now passes
a fixed operation/sequence ticket into each fixture port; it still journals the
attempt and pending phase before invoking the wrapper. All denials consume the same
logical budget, with 80 work operations and 20 reserved cleanup operations out of 100.
There is no retry, listener, client SDK, credential loader or registered endpoint.

Trusted host dependencies must be installed by a reviewed host, never supplied by an
HTTP client or inferred from decoded token claims:

| Port | Required contract |
| --- | --- |
| `verifyService` | Independently verified service identity with the exact subject reference, origin, run/source/destination/release, nonrevoked state and unexpired authority. Deploy-key identity and generic admin claims deny. |
| `serverContext` | Independently server-verified user envelope bound to the same run/source/destination and exact run-owned user/login session. Supplies the actual server context object, not a client principal. |
| `readExactSession` | Uses that same context with the committed exact-session reader and an exclusive horizon. The fixture executes the actual reader with fake SDK identity hooks and Map-backed point reads. |
| `invoke` | Calls the requested lifecycle fixture with the same context for logout. Service-authorized prepare/provision/sign-in/revoke/inventory/removal must obey the PR #191 absent-account, no-linking, isolated-history, bounded graph and exact-selector contracts. No generic internal CAD invocation is exposed. |
| `recordPending` / `recordOwnership` | Private durable ownership/reconciliation evidence as described above; exact null acknowledgment only. No raw input or secret diagnostics. |

Session verification and logout require the exact owner/session, Password method,
active state and expiry through the exclusive horizon. User context is checked even
when verifying revocation: anonymous null responses cannot establish removal proof.
The exact reader runs on the supplied server context, and logout receives that same
object. An independently verified service alone never establishes user authority.
Source, authority expiry, run clock and response freshness are rechecked after each
asynchronous stage. A timeout stops later stages when their pending promise resolves;
it cannot cancel a provider mutation that was already dispatched.

One logical operation may contain several host steps: service verification, optional
user-context acquisition and session read, pending receipt, lifecycle invocation,
and optional ownership receipt. At most five host-port calls occur per admitted
operation in this candidate. These are not provider billable-unit counts: real
verification, SDK work and private persistence fanout/cost remain unqualified.
The existing journal's 20 cleanup operations do not reserve provider capacity.

All transport exceptions are replaced with fixed errors; public lifecycle receipts
remain fixed acceptance codes and sequence/flags. The tests cover noisy errors,
extra fields, both clients, wrong bindings, revoked/expired identities, exact-session
denial, private receipt failure and late completion. Trusted host diagnostics and
actual JWT/context propagation still require a later provider-specific review.

## Validation and next gate

Run locally without live provider access:

```sh
node --test scripts/cad-convex-auth-transport-register.test.js
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-rollback-compatibility.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The manifest covers all new modules/tests/docs and the changed ticket plumbing.
The source audit checks these modules for accidental network/env/SDK/diagnostic
use and rejects their import from production paths. UI/viewport/hosted/live QA is
outside this source-only scope; upload regression uses synthetic loopback HTTP.
The dependency install uses local lockfile-pinned cache with scripts disabled.

Next: captain reviews this local candidate and decides whether to publish the source.
Then obtain a supported removal implementation or an explicit revised retention
policy, implement and review the actual verified host/private storage adapter, and
complete immutable destination evidence, appointments, diagnostics, enforced cost
and cleanup capacity, exact commands and rollback gates. Live provisioning remains
blocked. No existing gate has been waived by these tests.

Publication-only approval template; replace the placeholder with the reviewed local
commit SHA from the task handoff:

> Approve pushing only commit [full reviewed local SHA] from codex/cad-auth-transport-run-register to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only synthetic Auth removal-boundary, verified transport and private run-register candidate. No merge, deployment, live Convex/Auth tests, env changes, secret generation/storage, provider/auth/resource configuration, usage/billing changes, real-user enrollment, email/SMS, store mutation, CAD uploads, conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

No push/PR, merge, deployment, provider/store mutation, real-user enrollment, delivery,
CAD upload/conversion, private CAD, Sandbox work or branch/worktree cleanup was run.
Expense: $0.

Local validation receipt (September 13, 2026): 17 focused adapter/register tests and
161 broader regression tests passed. TypeScript passed; five local generated
bindings and 90 manifest files verified. The 76-file source audit found zero leak
patterns and passed runtime isolation. The unchanged ten-table/sixteen-index rollback
model passed with 22 forward and 22 rollback fixture rows. `git diff --check` passed.
The additional freshness regression proves a delayed private receipt cannot dispatch
logout after the operation's session-validation horizon.

Changed files: three new offline modules (`syntheticRemovalBoundary.js`,
`syntheticRunRegister.js`, `verifiedSyntheticTransport.js`), this review document,
`scripts/cad-convex-auth-transport-register.test.js`, ticket plumbing in
`positiveSyntheticLedger.js` and `positiveSyntheticSession.js`, the manifest
generator, source audit and regenerated `offline/cad-convex/manifest.json`.
