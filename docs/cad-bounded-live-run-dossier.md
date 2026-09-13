# Bounded synthetic durable-adapter live-run dossier

Source base: `d09a9823c6ceb9ae6c427281169703aa28f6f1cc` (after PR #201).
Branch: `codex/cad-bounded-live-run-dossier`.

This source-only packet records a concrete review contract for a future run. It
contains no runner, provider connection, approval parser or executable preflight.
All gates are false. Publication never grants live-run authority. No live evidence,
resource isolation, custody acceptance or enforceable spending cap has been verified.
Expenses incurred in this phase: USD 0.

## Review artifacts and missing values

`offline/cad-convex/boundedLiveRunDossier.json` is the authoritative inventory of
missing prerequisites. Each entry has a stable ID, null value, missing status and
an explicit acceptance criterion. The matching pure checker accepts only this
closed inventory; it reports the missing IDs without printing supplied values.
Changing, deleting or filling a field invalidates the closed contract. Even a
fully populated dossier, claimed approval or true gate always returns
`LIVE_RUN_BLOCKED`, with execution and publication authority false. This is an
integrity check, not semantic validation of a future filled dossier. A subsequent
source-reviewed dossier and separately reviewed runner/preflight are necessary.

The inventory requires:

| Group | Required immutable values and evidence |
| --- | --- |
| Identity | Full adapter and runner SHAs, independent review receipt, unique run ID, synthetic resource alias, restricted exact-resource mapping, namespace, ledger/window/fence, engine/isolation proof, schema/index digests, synthetic record inventory, privilege proof, fixture hash, scenario/counter allocation and independent receipt verifier |
| Custody | Named primary and distinct backup, dated acceptance bound to run and expiry, escalation owner, compatible recovery operator, independent evidence reviewer, retained-state destination/cost acceptance |
| Window | Exact UTC start/expiry, trusted clock and rollback evidence, stop procedure |
| Cost | Enforced cap, enforcement/pricing evidence, seven integer microdollar line items, retained-state coverage |
| Evidence and recovery | Restricted and sanitized destinations, sanitization review, disabled-route baseline and future pre/post plan, reconciliation and rollback acceptance, recovery baseline or explicitly blocked recovery scenario, separate external approval envelope |

Alias shape is `rrb-synthetic-<lowercase-letters-digits-hyphens>` with suffix length
1–40. Namespace shape is `rrb/qualification/<run-id>/<32-lowercase-hex-nonce>`.
These are shapes, not allocated resources. Bind every selector, authority dependency,
index, claim and cursor server-side to the exact reviewed namespace. Reject absent
or foreign namespaces and attempts to choose a new ledger. Keep exact resource
identities and contacts in restricted evidence; public files use opaque references.

The external envelope contains the SHA-256 of final UTF-8 dossier bytes, both full
source SHAs, exact private resource identity, namespace, counters, accepted owners,
UTC interval and cost evidence. Keep the digest outside the hashed dossier to avoid
self-reference. Every referenced evidence artifact needs its own immutable digest,
reviewer and timestamp. Any byte, binding or resource drift invalidates approval.

## Proposed operation and counter matrix

Every row is currently unauthorized. Counts are shared across both clients and
include seeding, faults, denials, lookup, retries and reconciliation. A logical
command consumes exactly one applicable row; its retries consume that row's attempt
budget. Nested reads must be charged in the reviewed allocation, never unmetered.
Client restart consumes a command and its restart counter, but no transaction.
Fault injection consumes its own row as well as any affected transaction's budget.

| Operation | Commands | Maximum transaction attempts |
| --- | ---: | ---: |
| read-exact-selector | 32 | 96 |
| read-authority-dependencies | 24 | 72 |
| seed-synthetic-metadata | 40 | 120 |
| reserve-transaction | 48 | 144 |
| authority-revoke-or-delete-synthetic | 16 | 48 |
| fence-without-dispatch | 24 | 72 |
| mark-unknown | 16 | 48 |
| claim-cas | 20 | 60 |
| settle-from-independent-synthetic-receipt | 24 | 72 |
| scan-bounded-page | 8 | 24 |
| inject-abort-or-ack-loss | 2 | 6 |
| restart-isolated-client | 2 | 0 |
| Total | 256 | 762 |

The inherited global attempt ceiling is 768; the six unallocated attempts are not
spare authority. Per-row limits stop first. These allocations are review proposals,
not proof every scenario fits. Fixture operations may involve several metadata
rows; the reviewed plan must show how all record types fit the 64-record total,
including 40 unresolved pagination fixtures. Narrow scenarios if they cannot fit;
never silently raise limits or claim all twelve requirements qualified.

Other ceilings: two independent clients, one ledger/window, 4 KiB per record,
1 MiB stored metadata and 1 MiB evidence. Maximum three attempts per transaction
within 5,000 ms, conflict backoffs 100/250 ms, fresh authority/ledger/clock on each
attempt, terminal denial for schema or binding failures. Lost acknowledgement uses
the original selector within these same counters; no blind retry or replacement key.
Claims last at most 60 seconds; reconciliation uses two passes of four pages maximum,
32 selectors per page, durable cursor/high-water state and revisits unresolved pages.

UTC format is `YYYY-MM-DDTHH:mm:ssZ`; duration must be positive and at most 1,800
seconds. Each operation must finish before expiry and its transaction deadline.
Clock rollback, exhausted limits, changed binding or unknown outcome stops new work.
There is no extension or second run. Store restarts are zero in this dossier,
tightening the predecessor's separately gated proposal. Provisioning, configuration,
backup/restore, retention/deletion and rollover remain separately blocked.

## Cost acceptance

The proposed all-in ceiling is USD 9.00 (9,000,000 microdollars), with no current
spend authority from this dossier. Compute, storage, operations, backup, egress,
taxes/fees/FX and contingency must be nonnegative integer microdollars. Their sum
must fit both the proposed ceiling and a verified independently enforced cap.
Attach dated meter/quantity/pricing evidence and explicit zero-cost justifications.
An alert, estimate, credit balance or application ledger is insufficient. Unknown
retained-state costs or unenforceable total cost block the run. No recurring
commitment, billing-setting change or evidence deletion is implied.

## Evidence, reconciliation and rollback acceptance

Twelve pending post-run slots map one-to-one to the predecessor requirements:
serializable-commit, revision-cas, conflict-retry, durable-selector, authority-read,
cost-durability, acknowledgement-loss, reconciliation-custody, pagination-fairness,
rollback, window-rollover and disabled-route. These are future outcomes, not
prerequisites that can be populated with offline test passes. The pre-run requirement
is a reviewed scenario/evidence plan for each; unsupported scenarios stay blocked.
Actual crash/restore and rollover proof remain blocked without separate authority.

Each live slot must bind scenario, both source SHAs, run ID, alias, namespace, UTC
interval, engine receipt, artifact SHA-256, independent reviewer and disposition.
Preserve synthetic selectors, command digest, transaction/claim revisions, trusted
timestamps, read dependencies, commit/abort result and before/after accounting.
Independent serialization evidence must prove authority-row and missing-row races;
JSON round trips and ledger-only CAS do not qualify. Raw traces remain restricted;
review and hash sanitized summaries separately. No credentials, raw account IDs,
private paths, private CAD or auth headers belong in public evidence.

Before approval, primary and backup accept that unknown outcomes retain both leases
and the full all-in hold. Reconciliation uses the original selector and independent
terminal receipt, current CAS claim generation and idempotent identical settlement.
Conflicting/missing receipts retain holds and escalate. Backup takeover uses a new
claim generation; stale custodians cannot settle. Expiry ends store authority:
unresolved selectors, due work, cursors, costs and receipts pass to accepted custody,
with fresh reconciliation-only approval needed for further operations.

Rollback acceptance distinguishes source compatibility from restoring data. Preserve
acknowledged commits/history; reject unsupported schemas and old/new fences. Never
replace a newer ledger with an older backup. Existing backup evidence is a review
input; this phase creates no backup and proves no restore. Closeout needs actual
counter/cost receipts, post-run disabled-route evidence, reconciled selectors or
explicit unresolved-custody acceptance, and sanitized-publication review. Cleanup
and retention decisions remain separate.

## Offline validation and disabled-route boundary

Run only the following local checks. Mounted route tests use loopback synthetic
requests, proving rejection before body subscription or admission, with no store or
conversion effects. The static audit rejects runtime references to the dossier and
checks existing auth boundaries. No UI changed; viewport QA is inapplicable. Hosted
probes, live Auth/Convex, conversion suites and provider operations are excluded.

```sh
node --test scripts/cad-bounded-live-run-dossier.test.js scripts/cad-live-adapter-run-packet.test.js scripts/cad-shared-controls-adapter-qualification.test.js scripts/cad-upload-shared-controls.test.js scripts/cad-user-upload-admission.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-upload-activation-readiness.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Exact future approvals

These phrases are templates for a future review, not current authorization. Replace
every bracketed value only after its supporting evidence is accepted. Source
publication can proceed independently of missing live prerequisites.

Publication:
> Approve pushing only commit [full SHA] from codex/cad-bounded-live-run-dossier to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD bounded live-run dossier. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or lane cleanup.

Live run, only after separate runner and completed dossier review:
> Approve one synthetic durable-adapter qualification run at adapter commit [full SHA] and runner commit [full SHA], final dossier [SHA-256], private resource binding [exact identity and immutable reference], alias [synthetic alias], namespace [exact namespace], ledger/window [exact IDs and fence], custodians [accepted primary and backup references], UTC window [start to expiry], operations/counters [exact reviewed matrix digest], enforceable all-in cap [USD amount and evidence digest], evidence destinations [accepted restricted and sanitized references], and reconciliation/rollback acceptance [reviewed digest]. Keep CAD uploads disabled. No production access, private CAD, conversion, Sandbox, enrollment, email/SMS, env/provider/auth/resource or usage/billing changes, secrets generation, backup/restore, store restart, rollover, deletion, merge, deployment or lane cleanup.

Recovery, only under its own reviewed dossier:
> Approve only [exact reconciliation or backup/restore or isolated-store-restart operations and counters] for synthetic run [ID], resource [exact identity], namespace [exact namespace], source [full SHA], recovery dossier [SHA-256], custodian [accepted owner], UTC window [start to expiry] and enforceable all-in cap [USD amount and evidence]. Preserve acknowledged commits, holds and selector history. Keep admission disabled. No new qualification run, production access, uploads, conversion, private CAD, Sandbox, enrollment, messages, provisioning, secrets, merge, deployment or deletion.

If resource setup is necessary, prepare a separate provisioning dossier using the
predecessor packet's exact provisioning approval phrase. This packet authorizes no
setup. Next action: captain reviews the local commit, then requests publication
approval. Live resource, runner, custody, cost and evidence prerequisites remain open.

## Local validation result

All 45 focused tests passed, including five dossier tests and mounted loopback
refusal-before-admission checks. TypeScript and five local SDK binding checks
passed. The 117-file source audit found zero leak-pattern matches and passed runtime
isolation checks. Manifest regeneration/check and whitespace checks passed.

The initial test attempt found Express missing. Locked dependencies were installed
from the offline cache with `npm ci --offline --ignore-scripts --no-audit --no-fund`,
then the full focused set passed. Existing dependency deprecations and a router
Promise-like-handler warning remain. The desktop sandbox could not start because
its configured writable root is a symlink; reviewed direct access was used only for
the assigned worktree and temporary build script. No scope deviations, live calls,
provider operations, conversion runs, runtime edits or expenses occurred.
