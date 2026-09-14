# CAD bounded development run execution plan

Source base: `b96cec86eab387d7ca18fd04c04519fae09267ad` (PR #203).
Branch: `codex/cad-live-dev-run-execution-plan`; assigned worktree suffix:
`ReversR-Rebuild.worktrees/cad-live-dev-run-execution-plan`.
Status: planning complete; live execution BLOCKED. Expenses: USD 0.

## Scope and source reconciliation

This continues the [approval packet](cad-live-run-approval-packet.md) and
[bounded dossier](cad-bounded-live-run-dossier.md). The next proposed run qualifies
synthetic durable metadata controls on an isolated development store. It is not
the earlier [live Auth E/D/T sequence](cad-live-dev-edt-approval-packet.md).
No Auth test, credential generation, provisioning, provider setup, deployment,
CAD body admission or conversion is included. The earlier named Convex destination
is not an approved destination for this run. A private resource binding is missing.

Current source evidence:

| Source | What it establishes | What remains unproved |
| --- | --- | --- |
| `liveRunApprovalPacket.json` and `liveRunApprovalEnvelope.json` | Closed review templates with null fields and false gates | Every actual run binding, receipt and independent acceptance |
| `liveRunApprovalPacket.js` | Offline syntax/digest inspection; always returns `LIVE_RUN_BLOCKED` | Executable preflight, evidence authenticity and run authority |
| `sharedControlsAdapterQualification.json` and adapter-double tests | Synthetic transaction contract and twelve proof requirements | A real durable adapter/engine and independently verified transaction receipts |
| `server/cadUserUploadRouter.js` and route tests | Disabled admission source baseline | Reviewed non-production target and before/after route evidence |

The current approval packet limits govern this proposal: at most 1,800 seconds,
two clients, one ledger/window, 64 metadata records including 40 pagination fixtures,
4 KiB per record, 1 MiB storage, and 1 MiB combined restricted/sanitized evidence.
The matrix totals 256 logical commands and 762 transaction attempts; six of the
768 global attempts remain unallocated. Row limits stop first, including faults,
denials, seeds, nested reads and reconciliation. Each transaction allows at most
three attempts within 5,000 ms, with conflict backoffs of 100/250 ms; claims last
at most 60 seconds. Two client restarts, zero store restarts. Reconciliation is
at most two passes, four pages/pass, 32 selectors/page. No limit is raised here.
The earlier adapter packet's store-restart proposal does not override this zero.
The proposed USD 9 all-in cap is unverified; the earlier Auth USD 5/900-second
proposal does not supply cost or execution evidence for this separate scope.

## Final pre-run checklist (all live entries remain open)

1. Captain verifies clean source/worktree binding, adapter and runner full SHAs,
   independently reviewed source, executable/version/hash and exact command cards.
   No reviewed live runner or concrete command currently exists in this packet.
2. Resolve all approval-template fields and receipts privately. Verify exact
   existing isolated resource, engine/isolation, schema/index digests, least
   privilege and absence of real data. Pin namespace, run ID, ledger/window/fence
   server-side for every selector, range, cursor and claim. No resource creation.
3. Accept primary, distinct backup, escalation owner, recovery operator and
   independent reviewer with dated responsibility and retention receipts. An
   account role or syntactically valid opaque reference is insufficient.
4. Allocate every scenario and remote dependency to matrix rows. Resolve the
   authority row's revoke-or-delete ambiguity: prefer revocation; deletion remains
   excluded unless a later operation-specific approval explicitly covers it.
   Mark backup/restore, actual store crash and rollover scenarios blocked. They
   cannot be replaced with a synthetic passing result or silently skipped in a
   claim that all twelve live requirements passed.
5. Bind exact UTC start/expiry, trusted clock, cancellation and stop owner. Reject
   clock rollback, expired/reused run ID, binding drift or exhausted budgets before
   every attempt. No automatic resume, second run or new ledger after a stop.
6. Accept dated prices and enforceable all-in bound of at most USD 9, including
   compute, storage, operations, backups, egress, tax/fees/FX, contingency and
   retained obligations. Explain every zero. Unknown cost blocks execution;
   alerts, estimates and an application counter are insufficient enforcement.
7. Accept restricted and sanitized evidence destinations, access owners, byte
   allocation and retention responsibility. Resolve evidence references privately;
   never place secrets, account IDs, private paths, raw headers or CAD in Git.
8. Freeze exact dossier bytes and external envelope; independently verify dossier,
   operation/counter and envelope digests. Human approval is a separate record
   binding the envelope digest and command-card digest; avoid circular hashing.
   A structurally complete offline result still confers no authority.
9. Accept exact disabled-route requests, source and non-production destination,
   expected denial before body/admission, counters and zero downstream effects.
   No upload body. Pre-check failure prevents seeding or any qualification writes.
10. Accept reconciliation and compatible rollback plans, unresolved-state custody
    and stop procedure. Obtain the complete one-run phrase below only after all
    applicable receipts and the live runner have been independently reviewed.

## Exact command plan and current hard blocker

There is deliberately no shell-shaped live placeholder to copy and execute.
`node --test` is local evidence only. Neither an inspector invocation nor a guessed
Convex CLI command is a live run. No dependency download, default destination,
watch mode, credential-bearing argv or implicit retry belongs in the future plan.

For EACH command card, the reviewer must record: absolute executable path, version
and SHA-256; exact argv array and working directory; runner/adapter commits;
explicit private resource selector and binding digest; approved credential-reference
mechanism without secret values; input/output artifact digests; timeout; allowed
selectors and side effects; matrix rows and logical/remote-attempt allocation;
expected sanitized result codes; unknown-outcome handling and stop counterpart.
An absent value blocks the card. The reviewed card bytes receive a SHA-256 digest
bound by the approval. Private executable paths remain in the restricted packet.

| Card, ordered | Required effect and stop behavior | Exact argv today |
| --- | --- | --- |
| C0 offline preflight | Verify frozen bytes, independent receipts, clock/window, cap, identities and unused run ID without store writes; deny incomplete inputs | Unresolved: no reviewed runner/preflight |
| C1 disabled-route pre-check | Approved non-production request without body; refusal before admission and zero dispatch; failure stops before seeds | Unresolved: target/request/capture absent |
| C2 seed and qualify | Only allocated synthetic metadata; two clients share all budgets; revocation only until deletion ambiguity resolved; stop on unknown commit | Unresolved: adapter/runner/resource absent |
| C3 bounded reconciliation | Original selectors, independent terminal receipts and current CAS claim; retain leases/holds on uncertainty; no blind retry | Unresolved: verifier/runner/custody absent |
| C4 disabled-route post-check and evidence closeout | Approved no-body request; actual shared counters/cost and evidence hashes; preserve unresolved inventory and accepted custody | Unresolved: exact target/capture/destinations absent |
| R recovery after stop/expiry | No further remote operation under expired run; separately reviewed recovery-only packet and approval required | Excluded from this one-run plan |

The command-plan deliverable is therefore a review specification with an explicit
blocker, not an executable runbook. Next source work must implement/review a real
adapter and runner/preflight before exact argv can be supplied. Filling templates
or accepting planning defaults cannot resolve that implementation gap.

## Evidence and rollback packet

Keep one receipt per requirement ID from the approval template: serializable-commit,
revision-cas, conflict-retry, durable-selector, authority-read, cost-durability,
acknowledgement-loss, reconciliation-custody, pagination-fairness, rollback,
window-rollover and disabled-route. Each needs scenario/command digest, run/source/
resource/namespace binding, UTC interval, independent engine receipt and reviewer
status. Pending and blocked scenarios stay visible. Never reuse offline fixture
receipts as live evidence. All existing post-run slots remain null/pending.

On known abort, prove all-or-none accounting. On unknown acknowledgement, stop new
qualification work and use only approved bounded lookups of the original selector.
Retain both leases and full holds until independent terminal evidence permits
identical-receipt idempotent settlement. A backup needs a fresh CAS claim generation;
stale owners cannot settle. Preserve cursor/high-water progress and acknowledged
commits. Do not restore an older ledger over newer acknowledged state.

At expiry stop remote operations; hand unresolved selectors, receipts, claims,
cursors, remaining obligations and cost exposure to accepted custody. Rollback in
this run means safe stop and preservation; no deployment rollback, backup/restore,
store restart, resource deletion, retention/deletion or rollover is authorized.
A compatible recovery source/schema/fence and baseline digest must be reviewed;
actual recovery stays separately gated. Post-check failure requires escalation,
not environment repair or upload activation.

Closeout must include actual per-row/global counters, measured costs and receipts,
pre/post disabled-route evidence, all requirement dispositions, reconciled selectors
or unresolved custody acceptance, retained-state obligations and sanitization review.
Publishing even sanitized live evidence is a separate gate. No MP4 or UI acceptance
is claimed for this source-only planning change.

## Next approval wording

Publication only (captain substitutes the final reviewed local commit):

> Approve pushing only commit [full reviewed SHA] from codex/cad-live-dev-run-execution-plan to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD bounded development run execution plan. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS, store mutation, CAD uploads, conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

One-run template, NOT presentable for execution until every bracket is resolved:

> Approve one synthetic durable-adapter development qualification run [run ID] at adapter commit [full SHA] and runner commit [full SHA], exact command cards C0-C4 [SHA-256], final dossier [SHA-256], final envelope [SHA-256], private existing resource [exact identity and binding digest], alias [alias], namespace [namespace], ledger/window/fence [values], operation/counter matrix [digest and accepted per-row allocations], primary and backup custodians [accepted references and digests], independent reviewer [acceptance digest], UTC interval [start to expiry, at most 1800 seconds], enforceable all-in cap [at most USD 9 and evidence digest], restricted/sanitized evidence destinations [accepted references and digests], disabled-route pre/post plan [digest], reconciliation/rollback acceptance [digests] and retained-state custody [digest]. Permit only enumerated synthetic metadata reads/writes and non-production no-body verification within the reviewed shared counters, including revocation but no deletion. Keep uploads disabled and stop on unknown outcomes under the bounded reconciliation plan. No production access/smokes, live Auth tests, private CAD, conversion, Sandbox, enrollment, email/SMS, env/provider/auth/resource or usage/billing changes, secrets, backup/restore, store restart, rollover, retention/deletion, merge, deployment or lane cleanup. No automatic retry after expiry, resume or second run.

This wording is a future request, never an approval parser or grant. The current
lane performs no store mutation. Recovery after expiry requires a separate packet
and the recovery-only gate in the predecessor approval document.

## Local validation receipt

Validated locally on September 13, 2026:

```sh
node --test scripts/cad-live-run-approval-packet.test.js scripts/cad-bounded-live-run-dossier.test.js scripts/cad-live-adapter-run-packet.test.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Results: 15/15 offline regression tests passed; 137 integrity files verified;
123 source-audit files passed with zero leak-pattern matches and runtime isolation
intact. Three relative Markdown links resolve; whitespace verification passed.
No new runtime code, dependencies, UI, schema or tests were needed. Typecheck,
provider/route probes, conversion suites, live Auth and viewport QA were not run
for this documentation/audit-list change. The configured symlinked writable root
prevented sandbox startup; reviewed direct worktree access completed local work.

Files changed: this document, `scripts/cad-convex-contract-manifest.js`,
`scripts/cad-convex-source-audit.js`, and `offline/cad-convex/manifest.json`.
The predecessor approval templates, gates and pending receipts remain unchanged.
No push, PR, deployment, live operation or expense occurred.

Completed: source reconciliation, ordered checklist/command-card specification,
evidence/stop/rollback packet and future approval wording. Next: captain reviews
the exact local commit and publication phrase. The overall plan now makes the
runner/adapter and private evidence gaps explicit; execution stays blocked until
those are resolved in separately authorized work. No executable command or live
readiness claim can be supplied from the current source-only evidence.

## Source follow-on: offline command-card contract

The [runner/adapter command-card packet](cad-runner-adapter-command-cards.md) adds
a runnable offline generator and strict inspector for C0-C4 review projections.
It checks shape, fixed gates, digests and shared matrix allocations. Exact private
command bytes, a live runner, durable adapter and independent receipts remain
unresolved; this follow-on supplies no live preflight or execution authority.

## Source follow-on: blocked runner and adapter boundary

The [source boundary](cad-live-runner-adapter-source.md) supplies a typed adapter
interface, blocked C1-C4 entry points and offline source-digest preflight. A durable
engine and live prerequisite verification remain unimplemented and unqualified.
