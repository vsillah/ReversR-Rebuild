# CAD upload shared controls: source-only prerequisite model

Base: `3c8d852cc416fb9e8f3eaae252518c1232dbe8df`.
Branch: `codex/cad-upload-shared-controls`.

The pure model in `offline/cad-convex/sharedUploadControls.js` implements bounded
admission state transitions. It is not imported by any runtime. The mounted
`POST /api/cad/user-import` and its literal false body gate are unchanged. No
request body reader, executor, provider, transport, persistent store or environment
switch is introduced. The review manifest keeps every live prerequisite false.

## State and controls

A single shared budget-window ledger holds at most 256 metadata-only records.
Policy caps per-user concurrency across shops and per-shop concurrency across users,
plus per-user and per-shop accepted attempts within a fixed window of at most one day.
An accepted reservation consumes an attempt permanently within that window, even
if cancelled, malformed during future body parsing, expired, or reconciled.
Rejected reservations and idempotent retries do not consume attempts. This is not
an unauthenticated request-rate limiter; ingress abuse protection remains separate.

The budget uses integer USD microdollars. Every accepted attempt reserves a bounded
all-in maximum against the same ledger. Settlement retains actual cost and refunds
only the unused hold. A valid price calculation and an enforceable external spending
cap remain required: this model alone cannot bound a provider's bill. No actual
budget, pricing evidence, provider account or spending authority is configured.
Never partition the ledger by instance, user or shop: doing so would bypass the
shared limits. A future adapter must not allow callers to reset policy or the ledger.

Idempotency is scoped to user, shop and an opaque attempt key, then bound to the
exact upload session and login. A changed binding or reservation amount conflicts.
Lost reservation acknowledgements retry the original key. Settled and uncertain
attempts cannot become new reservations through replay. Keys and binding references
must be server-validated internal metadata; no filenames, body content, credentials
or diagnostic strings belong in these records. Returned state is internal only and
must never be serialized into an HTTP response.

## Transaction contract and authority fence

`transition(snapshot, command, authority, now)` returns an immutable-input proposal;
it performs no persistence. The adapter must atomically read current exact login,
upload-session binding, membership, permission and authority revision together with
ledger state. It must commit using serializable transactions and revision compare
and swap, retrying conflicts with fresh authority. Initial reservation must complete
before any future body subscription. Caller-provided or earlier HTTP verification
results are not transaction authority. Time must come from a trusted transaction
clock and cannot move backward.

The `fence` command rechecks exact authority, expiry and unchanged authority revision
and marks the handoff once. The reservation fence is a unique monotonic value within
the ledger; future consumers must also bind the window identity to avoid cross-window
reuse. Repeating a handoff fails closed. Revocation must serialize with this write.
Any future outbox write must share that transaction, and its consumer must deduplicate
the fence and recheck authority before work. The model creates no outbox and cannot
close a distributed revocation-versus-execution race by itself.

## Cancellation, reconciliation and rollback

Cancellation before the fence settles as `not-started` at zero cost. After the fence,
cancellation or unknown acknowledgement retains both leases and the full reservation.
Expiry never releases money or concurrency automatically. A bounded selector returns
up to 32 unknown or expired unresolved references for a privileged reconciler. A
custodian must retain and revisit unresolved references; pagination/fairness and live
reconciliation are not qualified here.

Only independent, authoritative terminal evidence may drive `reconcile`. It accepts
`not-started` with zero cost or confirmed `completed`/`failed` cost within the hold.
Identical reconciliation replays are harmless; conflicting evidence fails closed.
These are internal commands: exposing reconciliation to a user would permit budget
bypass. No reconciler or evidence provider is mounted in this change.

Schema v1 snapshots validate strict fields, unique attempt keys/fences, aggregate
limits, numeric bounds and state shape. Unsupported/corrupt snapshots fail closed.
Rollback keeps the route closed and retains all unresolved records, holds and
idempotency history. There is no schema migration or automatic deletion. Window
rollover, carry-forward of unresolved holds, retention and durable rollback evidence
require separate implementation and qualification; never start an empty window
while prior holds remain unresolved.

## Validation and handoff

Use the explicit local test list below; do not run conversion or worker suites.
Tests use synthetic metadata and in-memory proposals only. The race test demonstrates
a CAS contract with competing snapshots, not real cross-instance store isolation.
Existing HTTP regressions use loopback and assert mounted no-body behavior.
No UI changed; browser or viewport QA does not apply.

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
node --test scripts/cad-upload-shared-controls.test.js scripts/cad-user-upload-admission.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-upload-activation-readiness.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Next: captain reviews the local commit. Publication, durable adapter qualification,
all live Auth/Convex/provider/resource work, store mutation, uploads, conversion,
Sandbox dispatch, merge, deployment and lane cleanup remain closed. No expenses.

Exact future publication approval phrase (substitute the immutable reported SHA):

> Approve pushing only commit [full SHA] from codex/cad-upload-shared-controls to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only disabled CAD upload shared controls and transactional admission prerequisites. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or lane cleanup.

Validation result: 28 focused tests passed, TypeScript passed, five generated
bindings verified, and the source audit passed for 105 files with zero leak-pattern
matches. Initial route tests could not load Express; the locked offline dependency
install resolved this and the explicit test list passed on rerun. No conversion
suites, live services or private CAD were exercised. No scope deviations occurred.
