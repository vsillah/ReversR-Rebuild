# First synthetic durable-adapter pre-run approval packet

Base: `fcc353979ad7c731500a902eb9b2101233352c98`, after PR #202.
Branch: `codex/cad-live-run-approval-packet`.
Status: source-only preparation; executable, live-qualified and all authority flags
remain false. No live runner is supplied or invoked. Expenses: USD 0.

## Packet structure and assembly

The prior [bounded dossier](cad-bounded-live-run-dossier.md) remains immutable.
Its acceptance criteria, operation allocation, resource ceilings and unresolved
qualification requirements still apply. This packet adds fillable, typed review
slots; it does not fill or validate that predecessor's closed inventory.

| Artifact | Exact role |
| --- | --- |
| `offline/cad-convex/liveRunApprovalPacket.json` | Public-safe template. `fields` contains every predecessor prerequisite except the external envelope reference, plus explicit ledger ID, window ID and fence. `evidence` contains a receipt for each field. All values are null. |
| `offline/cad-convex/liveRunApprovalEnvelope.json` | Separate digest envelope template. Copies every field into `bindings`, binds final dossier bytes and operation/counter bytes, and holds restricted identity and independent review receipts. Authority flags remain false. |
| `offline/cad-convex/liveRunApprovalPacket.js` | Offline data checker. Accepts a UTF-8 dossier string and parsed envelope. Returns only structural results, missing field IDs, generic errors and permanent blocked authority. No file loading from caller paths, network, runner, dispatch callback, approval parser or clock reads. |
| `scripts/cad-live-run-approval-packet.test.js` | Synthetic in-memory population, mutation, byte-drift and capability-isolation checks. Synthetic receipts prove syntax only. |

A receipt is exactly `{ref, sha256, reviewerRef, reviewedUtc}`. Values begin null.
References use `rrb-ref:<1–80 lowercase letters, digits or hyphens>`; the restricted
register resolves them to immutable artifacts and accepted people. Every digest is
64 lowercase hexadecimal characters. Source commits require all 40 lowercase hex
characters. Exact provider identity, account IDs, endpoints, credentials, contacts
and private paths stay outside Git. Even a correctly shaped reference must be
independently resolved and reviewed before any future execution request.

Preparation sequence, performed only within a separately authorized evidence scope:

1. Copy the templates into an approved restricted preparation destination. Fill
   fields from reviewed evidence, never from guesses or prior test passes. Keep all
   gates false and all post-run slots pending. No live evidence is collected here.
2. Pin adapter and future runner commits, their independent source reviews, fixture
   bytes, schema/index versions, engine/isolation and least-privilege evidence.
   Accept the predecessor's scenario-to-operation allocation for all twelve proof
   slots; label unsupported recovery/rollover scenarios blocked. Verify all rows,
   seeds, nested reads, denials, retries and reconciliation fit the shared budgets.
3. Resolve the alias privately to the exact isolated non-production resource.
   Bind run ID, namespace, one ledger, one window and fence on every selector,
   dependency, index, cursor and claim. Accept server-side namespace rejection
   evidence. `identity.ledgerAndWindowRef` must agree with the three explicit IDs.
4. Obtain primary, distinct backup and independent evidence-reviewer acceptance.
   Each acceptance artifact binds run, namespace, sources, expiry, stop ownership,
   outstanding holds, retention liability and its owner's responsibilities. Record
   escalation and compatible recovery operator acceptance. The checker tests only
   reference distinctness; the reviewer must verify these are different people.
5. Fix the UTC interval, cost cap, destination, reconciliation and rollback plans
   below. Date every receipt at or before run start. A field's receipt must actually
   support its value; matching syntax cannot prove that relationship.
6. Freeze the final UTF-8 dossier bytes. Compute SHA-256 over those exact bytes,
   including whitespace/newlines, and place it in the external envelope. Compute
   `operationCounterSha256` over UTF-8 `JSON.stringify({limits: packet.limits,
   operationMatrix: packet.operationMatrix})` in that key order. Preserve the
   template's nested key/row order. Copy every field exactly into `bindings`.
7. `privateIdentityEvidence` references and hashes the restricted mapping artifact.
   `independentEnvelopeReview` references a review artifact covering dossier hash,
   matrix hash, every binding and private identity receipt. That artifact excludes
   its own receipt, avoiding a circular digest. A later human approval record binds
   the SHA-256 of the final envelope bytes; it is stored separately from both files.
8. Run the offline checker and source checks. `fieldsComplete: true` means syntax
   and digest bindings are complete only. A reviewer must inspect actual receipts,
   signatures, identities, resource isolation and enforcement. Prepare the exact
   future approval text only after that review and a separately reviewed runner.

The checker checks exact inventory and immutable controls, field/receipt types,
namespace-to-run binding, window duration, all-in sum, distinct custody references,
review timestamps, envelope bindings and both computed digests. Missing values
remain missing. It never prints supplied values. It never interprets approval text.
Its answer is always `LIVE_RUN_BLOCKED`, including fully populated inputs.
Malformed inputs or injected gates/approval fields fail structural inspection.
This is not an executable preflight or proof of resource readiness.

## Window, counters and cost policy

Start and expiry use `YYYY-MM-DDTHH:mm:ssZ`, with a positive duration at most 1,800
seconds. The explicit `fields` timestamps are the proposed run interval;
`limits.startUtc` and `limits.expiresUtc` remain null inherited ceiling placeholders.
There is no current-time readiness result. The future reviewed runner must use a
trusted clock, reject before-start/expired/cancelled or reused run IDs, recheck each
attempt and finish before expiry and the 5,000 ms transaction deadline. Clock
rollback, unknown acknowledgement, changed binding or first exhausted cap stops new
work. No extension, replacement ledger or second run follows from this packet.

The unchanged proposal permits at most 256 logical commands and 762 allocated
transaction attempts across two clients. Six of the inherited 768 attempts remain
unallocated. Per-row budgets stop first. Limits also include 64 total metadata
records (40 unresolved pagination fixtures), 4 KiB per record, 1 MiB stored metadata,
1 MiB combined restricted/sanitized evidence, two client restarts and zero store
restarts. Reconciliation stays within two passes, four pages/pass and 32 selectors
per page. All allocation rows remain unauthorized.

The all-in cap is at most USD 9.00 (9,000,000 integer microdollars), strictly below
USD 10. Compute, storage, operations, backup, egress, taxes/fees/FX and contingency
must be nonnegative safe integers whose sum fits the independently enforced cap.
Every zero needs a documented justification. Evidence must bind dated prices,
quantities/meters, all resources and an enforceable maximum including retained state
and unresolved obligations after expiry. Alerts, estimates, balances and application
ledgers are insufficient. Unknown retention cost or unenforceable total cost blocks
the request. No billing/configuration changes, recurring commitments or purchase
are performed or authorized by preparation.

## Evidence, disabled routes and recovery

Accept both restricted and sanitized destinations with access owner, retention,
size allocation and review policy. Raw receipts and private binding artifacts stay
restricted. Separately hash sanitized summaries after review; exclude secrets,
headers, account IDs, private paths, private CAD and real-user records. A destination
reference does not itself authorize publication. Post-run receipts cannot be
substituted with offline tests, and every post-run field remains null/pending here.

The disabled-route plan must pin source and target identity for both before and
after checks, exact requests and expected refusal-before-body/admission behavior,
zero store/conversion effects, capture method, owner and stop/escalation procedure.
Use offline mounted-route tests and static `BODY_ADMISSION_AUTHORIZED = false`
evidence as the source baseline. Future checks must target only an explicitly
approved non-production surface, use no uploaded body or private material, fit the
approved counters/cost, and record exact source/target bindings. Production smokes
remain excluded. Pre-check failure blocks the run; post-check failure stops work,
retains evidence and escalates. Preparation executes neither hosted check.

Reconciliation acceptance requires original selectors, independently verified
terminal receipts, current CAS claim generation, bounded durable cursors/high-water
state and identical-receipt idempotent settlement. Unknown/missing/conflicting
outcomes retain both leases and the full all-in hold. Backup takeover needs a fresh
claim generation; stale owners cannot settle. On expiry, hand off unresolved
selectors, receipts, cursors, due work and costs to accepted custody without further
store operations. Obtain separate recovery-only approval for subsequent operations.

Rollback acceptance pins compatible source/schema/fence behavior and an existing
backup baseline digest or explicitly blocked recovery scenario. Preserve acknowledged
commits, holds and selector history. Never replace a newer ledger with an older
backup. Backup/restore, restart, retention/deletion and rollover stay separately
gated; this packet creates no backup and proves no crash/restore. Actual counters,
cost receipts, disabled-route post evidence, reconciled state or unresolved custody,
and sanitized-publication review are required closeout inputs, never pre-run claims.

## Exact future approval phrases

These are review templates, not current authority. Replace every bracketed value
from accepted artifacts. Keep exact private identity in the restricted approval
record. Any byte, commit, binding, owner, window, counter, cost or destination drift
invalidates approval and requires a new review and explicit approval.

Source publication:
> Approve pushing only commit [full SHA] from codex/cad-live-run-approval-packet to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD live-run approval packet. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or lane cleanup.

One bounded live run, after independent evidence and runner review:
> Approve one synthetic durable-adapter qualification run [run ID] at adapter commit [full SHA] and runner commit [full SHA], final dossier [SHA-256], final envelope [SHA-256], private resource [exact identity and binding evidence digest], alias [alias], namespace [namespace], ledger [ID], window [ID], fence [value], operation/counter digest [SHA-256], custodians [accepted primary and backup references and acceptance digests], evidence reviewer [reference and acceptance digest], UTC interval [start to expiry], enforceable all-in cap [USD amount and evidence digest], restricted and sanitized destinations [accepted references and digests], disabled-route pre/post plan [digest], and reconciliation/rollback acceptance [digests]. Execute only the reviewed synthetic metadata operations and non-production verification plan within shared counters. Keep CAD uploads disabled. No production access or smokes, live Auth tests, private CAD, conversion, Sandbox, enrollment, email/SMS, env/provider/auth/resource or usage/billing changes, secrets generation, backup/restore, store restart, rollover, retention/deletion, merge, deployment or lane cleanup.

Recovery-only follow-up, with its own reviewed packet and new expiry:
> Approve only reconciliation of existing unresolved selectors [immutable inventory digest] from synthetic run [ID], at recovery source and runner commits [full SHAs], recovery dossier and envelope [SHA-256 digests], exact private resource [identity and binding digest], namespace [namespace], existing ledger/window/fence [values], operations/counters [digest], custodian and backup [acceptance digests], UTC interval [start to expiry], enforceable all-in cap [USD amount and evidence digest], evidence destinations [accepted references] and compatible rollback acceptance [digest]. Preserve acknowledged commits, both leases, full holds and selector history until independent terminal receipts permit identical settlement. Keep admission disabled. No new qualification run, new seeds, replacement ledger, rollover, backup/restore, restart, deletion, production access, live Auth, uploads, conversion, private CAD, Sandbox, enrollment, messages, provisioning/configuration, secrets, usage/billing changes, merge, deployment or cleanup.

Backup/restore or isolated-store restart needs a distinct operation-specific recovery
packet and explicit approval; the reconciliation-only phrase above excludes both.
Source publication approval never grants live-run or recovery authority.

## Local validation and handoff

Approved local checks (no conversion suite or hosted probe):

```sh
node --test scripts/cad-live-run-approval-packet.test.js scripts/cad-bounded-live-run-dossier.test.js scripts/cad-live-adapter-run-packet.test.js scripts/cad-shared-controls-adapter-qualification.test.js scripts/cad-upload-shared-controls.test.js scripts/cad-user-upload-admission.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-upload-activation-readiness.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Next: captain reviews the local source commit and requests source publication using
the exact SHA. The broader plan advances from missing-prerequisite inventory to a
fillable review contract. Concrete resource/runner/custody/cost evidence and separate
live approval remain required. No UI changed; visual viewport QA is inapplicable.

Validation result: all 51 focused tests passed, including six new packet tests and
mounted loopback refusal-before-admission checks. TypeScript and five generated SDK
binding checks passed. Source audit covered 122 files with zero leak-pattern matches
and runtime isolation intact. Manifest and whitespace verification passed.

The first full test attempt found Express absent in the fresh worktree. Installed
locked dependencies using `npm ci --offline --ignore-scripts --no-audit --no-fund`,
then reran successfully. Existing dependency-deprecation and Promise-like router
handler warnings remain. The configured default writable root is symlinked, so
sandbox process creation failed before execution; reviewed direct access was used
only for this assigned worktree and local dependency cache. No runtime/source
configuration changed, no live/provider calls or conversion suites ran, and no
expenses or scope deviations occurred. No branches/worktrees were cleaned up.
