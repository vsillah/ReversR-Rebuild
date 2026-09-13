# CAD positive synthetic Auth/session source candidate

Base: `a901879a070a161882572b237b4a133e3e7e4c22`.
Branch: `codex/cad-positive-synthetic-auth-session`; assigned worktree suffix:
`ReversR-Rebuild.worktrees/cad-positive-synthetic-auth-session`.
Scope: local source and synthetic tests only. No live approval is consumed here.

This implements the offline lifecycle and accounting slice from
[execution inputs](cad-live-dev-execution-inputs.md) and
[blocker resolution](cad-live-execution-blockers-resolution.md). The prior
[rollback model](cad-live-dev-auth-execution-readiness.md) still applies: this
candidate changes no schema, generated bindings, Auth configuration, runtime or UI.
The captain's reported dev deployment/env/usage-limit state is inherited context;
this lane has not contacted the deployment or refreshed that evidence.

## Implemented behavior

[positiveSyntheticSession.js](../offline/cad-convex/positiveSyntheticSession.js)
requires explicit `testOnly: true`, exactly two unique reserved synthetic addresses,
the reviewed Password policy and trusted fixture ports. The constructor copies the
cohort; clients bind permanently to slots 0 and 1. No token, email, provider ID or
raw exception is returned in receipts. Actual secrets are neither generated nor
stored. Password input exists only during the local provisioning/sign-in call.

Preparation requires a complete zero-count inventory of all ten Auth/CAD tables,
Password-only isolation, reviewed diagnostics and supported removal. These are
trusted **fixture assertions**, not live evidence validators. Missing removal
support blocks provisioning before any account write. Each slot provisions once,
requires an absent account, disables email/phone linking, and checks distinct
newly-created user/account bindings. Both accounts must exist before either login.
The `requireAbsent` and `created` port contract is additional adapter responsibility;
these are not invented arguments or return fields of the Auth SDK's createAccount.

Only the existing Password policy's signIn flow is admitted. Signup, reset,
verification, extra parameters, wrong slot/cohort and invalid password shape deny.
One originating session per identity bounds this model's session fanout. Positive
verification checks the exact user/session, Password method, active state, expiry
within run end and an exclusive horizon at most 800 ms ahead. Response arrival at
that horizon denies. Tests execute the actual committed developmentAuth policy and
librarySession reader in a VM with fake SDK identity hooks and a local Map. They
prove neither JWT verification nor real SDK sign-in behavior.

Logout and user-wide revocation use exact run-owned selectors; revocation supplies
no except list. Acknowledgment alone is insufficient: the originating session must
subsequently read as absent. Removal needs that proof plus all ten bounded counts,
zero sessions/refresh tokens/CAD rows and the exact user/account pair. The complete
selected relationship graph is limited to 20 retained records per identity. Removal
receives expected counts and exact IDs; it must reject drift. A separate post-removal
zero inventory establishes fixture cleanup. SDK tables remain library-owned; this
source implements no direct Auth table writes, deletes or guessed cascade.

[positiveSyntheticLedger.js](../offline/cad-convex/positiveSyntheticLedger.js)
provides one local coordinator for both clients. It exclusively creates a mode-0600
journal, fsyncs the file and parent directory before dispatch, persists each attempt
and pending record before a fixture operation, then records a fixed terminal phase.
Existing journals refuse reopening, including in another process. There is no
resume, reconciliation, automatic retry or tombstone deletion API. Journal creation,
append and receipt failures are sanitized; failure before dispatch prevents the
call, and failure after a mutation is an unknown outcome.

The run allows at most 100 admitted logical attempts, at most 80 non-cleanup dispatches,
and one in-flight call. Concurrent and invalid attempts consume the same budget.
Twenty operations are reserved by stopping planned test work at 80; an over-budget
attempt or any other failure stops the run, including cleanup, and needs separate
reconciliation/cleanup review. Repeated calls after stop are rejected locally without
journal growth. Runs last at most 15 minutes, end strictly before the next UTC daily
reset, reject clock rollback and use at most 800 ms per fixture operation. Timeout
cannot cancel a provider mutation; its late result is ignored and the run stays
unknown. Logical operation counts do not establish backend fanout or a spending cap.

The journal contains fixed phase codes, sequence numbers, counts/flags and numeric
time metadata only. Provider results never become journal rows. Tests inject noisy
responses and exception sentinels across preparation, provisioning, sign-in,
verification, logout, revocation, inventory, removal, timeouts and journal failure;
child-process capture also checks stdout/stderr. The coordinator emits no telemetry.
This does not establish redaction inside a future provider adapter or provider logs.

## Boundaries before a live candidate

Both new modules are isolated under offline/cad-convex; the source audit forbids
runtime imports. `developmentAuthReviewed=false`, `developmentPassword([])` and
empty issuer/provider gates remain installed. Tests toggle only VM exports.
A qualified synthetic session still receives USER_UPLOADS_DISABLED from the actual
upload router, even under an intentionally permissive upload-permission fixture,
with zero body reads and no fallthrough to conversion. No app-visible controls change.

This is an offline implementation candidate, **not a deployable positive run**.
Before a later source activation and live gate, the captain must resolve:

- A supported removal adapter or an explicitly revised retention decision; pinned
  Auth 0.0.95 exports createAccount and invalidateSessions but supplies no reviewed
  account-removal helper here. The offline remove port is not provider support.
- A real action/transport adapter preserving server-verified user context, collision
  checks, source-bound two-person cohort, run ownership and bounded SDK fanout.
- A reviewed run/source/destination register binding one journal path, operator,
  host and custody. This local tombstone cannot prevent an operator choosing another
  path, another host or deleting it. It is not a distributed Convex ledger. Journal
  rows intentionally contain no provider IDs, so unknown-write reconciliation also
  needs a separate approved private ownership register; never replay from this file.
- Provider diagnostic evidence, immutable destination/release evidence, enforceable
  cost and cleanup capacity, appointments, and exact commands/rollback manifests.
  Fixture flags cannot fill these evidence or authority fields.

Unsupported removal remains a concrete blocker to provisioning. No live executable,
registered Convex endpoint, source-gate activation, private register or account has
been created. No push, PR, merge, deployment, env/provider/resource/billing mutation,
real-user enrollment, delivery, CAD bytes, private CAD, Sandbox or lane cleanup ran.
Expense: $0.

## Validation and next gate

```sh
node --test scripts/cad-convex-positive-synthetic-session.test.js
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-rollback-compatibility.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Next: captain reviews this local candidate and residual adapter boundaries. UI,
viewport, hosted and live Convex QA do not apply to this source-only phase; the
upload test uses a synthetic loopback HTTP server. After source review, substitute
the final local SHA in this publication-only approval phrase:

> Approve pushing only commit [full reviewed local SHA] from codex/cad-positive-synthetic-auth-session to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only positive synthetic Convex/Auth session qualification candidate. No merge, deployment, live Convex/Auth tests, env changes, secret generation/storage, provider/auth/resource configuration, usage/billing changes, real-user enrollment, email/SMS, store mutation, CAD uploads, conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

Local validation receipt (September 13, 2026): 144 regression tests passed, including
18 focused qualification tests; TypeScript passed; five pinned bindings and 85
integrity files verified. The 71-file source audit reported zero leak-pattern
matches. The unchanged ten-table, sixteen-index rollback model passed with 22
forward and 22 rollback fixture rows. Whitespace passed. Dependencies came from
lockfile-pinned local cache with install scripts disabled and no network install.

Changed files:

- `offline/cad-convex/positiveSyntheticSession.js`: lifecycle and ownership controls.
- `offline/cad-convex/positiveSyntheticLedger.js`: bounded shared local journal.
- `scripts/helpers/cad-positive-synthetic-fixture.js`: fake SDK/store source harness.
- `scripts/cad-convex-positive-synthetic-session.test.js`: 18 focused tests.
- `scripts/cad-convex-contract-manifest.js`: source integrity inventory.
- `scripts/cad-convex-source-audit.js`: leak and runtime-isolation coverage.
- `offline/cad-convex/manifest.json`: regenerated 85-file checksums.
- `docs/cad-positive-synthetic-auth-session.md`: scope, evidence and handoff.
