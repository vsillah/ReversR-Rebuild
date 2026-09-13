# CAD shared controls adapter qualification review

Base: `5ac57ce5a49e9329d118dad5c88776d158222e81`.
Branch: `codex/cad-shared-controls-adapter-qualification`.

This packet specifies acceptance requirements for a future durable adapter. It
adds no adapter to runtime and qualifies no live store. The prior pure model in
`offline/cad-convex/sharedUploadControls.js` remains unchanged. All live evidence
references in `offline/cad-convex/sharedControlsAdapterQualification.json` are null;
all qualification flags remain false. Synthetic memory-only tests are illustrative
contract checks, not proof of crash durability or database serializability.

## Transaction protocol

A future internal adapter accepts an immutable command and a server-selected ledger
identity. It must never accept authority, clock, budget policy or partition choices
from the request. Begin a serializable transaction; read the canonical ledger,
window, exact login, session binding, membership, permissions and revocation
revision in that transaction. Protect missing/deleted authority rows and range
reads against phantoms. Invoke the pure transition using trusted transaction time.
Commit with CAS over identity, window, schema, ledger revision and the authority
read set. Validate no-change and denied results against the same read set before
returning. A ledger-only CAS cannot serialize a revocation that changes no ledger.

Reservation, accepted-attempt accounting, both concurrency leases, cost hold and
any future handoff/outbox record must commit atomically. Body subscription requires
an acknowledged reservation. A handoff requires a new transaction checking exact
authority and the original authority revision; one window/fence may authorize only
one handoff. Transaction callbacks cannot perform external effects. The future
consumer must deduplicate and recheck authority; this packet does not solve the
distributed revocation-versus-execution race or authorize an outbox.

Explicit conflicts may retry up to a reviewed finite attempt/deadline bound using
backoff, rereading every dependency and current trusted time each time. Denials,
schema errors and binding conflicts are terminal. Retry exhaustion fails closed.
Unknown commit outcomes use the original immutable command and selector to discover
whether the write committed; they cannot switch keys or assume an abort. Unknown
handoff outcomes enter reconciliation and cannot dispatch again. Returned internal
state, bindings and store diagnostics must never become HTTP response fields.

## Durable selectors, holds and custody

A selector consists of ledger identity, window identity, user, shop, upload session,
login session, attempt key and fence. Persist its immutable binding and enforce
uniqueness across restart and rollback. Fences alone collide across windows. The
single global budget ledger cannot be partitioned by user, shop or process. Accepted
attempts remain counted after cancellation and terminal reconciliation. Unresolved
records retain both leases and the complete all-in hold even after expiry.

Future reconciliation needs an explicitly accepted custodian and durable due queue,
claim generation, claim deadline, evidence reference and escalation owner. Claim
acquisition and terminal settlement require CAS; an expired claim can be reassigned
but cannot release budget. Stale claim generations cannot settle. An independent
trusted evidence source must bind outcome and actual cost to the complete selector.
Unknown evidence or missing receipts keep the hold. Identical terminal replay is
idempotent; conflicting evidence requires investigation, never a second refund.

Scan bounded indexed pages (maximum 32), using a captured high-water fence per
window and immutable ordering. Persist cursor progress with custody; acknowledge
queue work only after its state transition commits. Restart full sweeps to revisit
earlier unresolved entries and newly expired rows. Poison entries need bounded
backoff and escalation without preventing later pages from being considered.
The existing model's first-page selector alone is insufficient for durable custody.

## Rollback and window handling

Keep uploads disabled before rollback. Retain ledger rows, cost holds, actual costs,
idempotency history, selectors and custody. Unsupported schema means reject and
retain, not migration, deletion or empty initialization. Recovery must retain every
acknowledged commit; demonstrate a compatible reconciliation path while admission
stays closed. Clock rollback and revision exhaustion fail closed.

Window rollover remains blocked. A future reviewed design must serialize window
advancement with outstanding reservations and settlement, retain old selector lookup
and count unresolved holds against global cost and concurrency. It must specify
whether old terminal costs belong to the old budget or a separately approved new
budget, preserve attempt history, and prevent duplicate active windows. No fresh
empty ledger may bypass old holds. No carry-forward implementation is included.

## Evidence required before a future live adapter

Each manifest requirement needs a sanitized evidence reference, exact adapter
commit, engine/isolation configuration, approved synthetic resource, run identifier,
reviewer and disposition. Require these independently of offline test results:

| Area | Required live acceptance evidence |
| --- | --- |
| Transactions/CAS | Two independent clients race the final user/shop/cost slot; authority-only revocation and deletion race reserve/fence; only serializable outcomes commit. |
| Atomicity/durability | Inject aborts before commit and connection loss after commit; restart clients/store; no partial attempt, lease, hold or outbox and no lost acknowledged reservation. |
| Retry/unknown outcome | Exhaust conflicts under a finite deadline; lose reservation and handoff acknowledgements; original selector resolves once with no external effect replay. |
| Custody/selectors | More than 32 unresolved records, poison entries, cursor restart, custodian death and stale claims; every eligible selector is revisited and no stale claim refunds money. |
| Cost/evidence | Unknown and expired records retain capacity; duplicate/conflicting terminal evidence cannot release twice; independent enforceable all-in spending cap is verified. |
| Rollback/window | Unsupported schema recovery, old/new window fence collision, unresolved old hold and concurrent rollover/settlement retain global accounting and history. |
| Disabled compatibility | Mounted no-body HTTP regressions and source isolation pass with the adapter unmounted and all activation gates false. |

The synthetic helper covers CAS, authority conflict, bounded retry, serialization
round-trip, idempotency, cost retention, pagination, clock and schema rejection.
It has no real transaction clock, database persistence, claim system, outbox,
rollover implementation, credentials or external effects. Its restart method is a
JSON round-trip, not a database restart. Its prepared objects are trusted test
inputs, not a secure public adapter interface. Live tests above remain pending.

## Local validation

Run only this explicit offline list; no conversion suites:

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
node --test scripts/cad-shared-controls-adapter-qualification.test.js scripts/cad-upload-shared-controls.test.js scripts/cad-user-upload-admission.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-upload-activation-readiness.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

No UI changed; viewport QA does not apply. HTTP regressions use synthetic loopback
requests to the disabled route. No live Auth/Convex or CAD data is used.

## Approval boundaries and next step

Next is captain review of the local source commit. Publication requires this exact
phrase with the reported immutable SHA substituted:

> Approve pushing only commit [full SHA] from codex/cad-shared-controls-adapter-qualification to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD shared controls adapter qualification packet. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or lane cleanup.

Future live qualification needs a separately prepared, complete run packet before
requesting this phrase; placeholders are not approval and no live run is ready now:

> Approve one synthetic durable-adapter qualification run at commit [full SHA] using only resource [exact resource] and packet [immutable packet digest], with custodian [accepted custodian], expiry [UTC timestamp], permitted store operations [explicit operations], synthetic namespace [exact namespace], enforceable all-in maximum [USD amount], and reconciliation/rollback procedure [reviewed reference]. Keep CAD uploads disabled. No production access, private CAD, conversion, Sandbox dispatch, enrollment, email/SMS, env/provider/auth/resource or usage/billing changes, secrets generation, merge, deploy or lane cleanup.

No publication, live qualification, provisioning, upload activation or cleanup is
authorized by this source work. No expenses are incurred.

Validation result: all 36 focused tests passed, TypeScript passed, five local
SDK bindings verified, and the source audit passed for 109 files with zero leak
pattern matches. Locked dependencies installed offline with scripts disabled;
npm reported existing dependency deprecations and the route suite reported an
existing Promise-like handler deprecation, without failures. No conversion suite,
live service, private CAD, UI, or provider was exercised. Scope deviations: none.
The configured sandbox root was a symlink and could not launch processes; approved
escalated commands operated exclusively in the assigned worktree for this change.
