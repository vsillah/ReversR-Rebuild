# CAD durable engine and evidence binding: offline source slice

Base: `fa1ec0c30ad110ed6ab32cb9d7d04aded2a78cff` (PR #207).
Branch: `codex/cad-durable-engine-evidence-binding`.
Status: synthetic source checks only; live execution and uploads remain blocked.

## What this adds

The [previous source boundary](cad-live-runner-adapter-source.md) remains unchanged.
`durableEvidenceBinding.js` checks a closed synthetic receipt projection against
separately supplied expected context and exact UTF-8 witness bytes. It binds resource,
namespace, run, ledger, window, fence and selector digests; engine, schema, index,
adapter/runner source, adapter/output contract and operation-matrix digests; and
command, authority-read-set, before-state and after-state witness hashes.
The caller supplies an expected SHA-256 of the exact receipt bytes independently
of the candidate. Even whitespace drift fails that receipt binding.

Committed projections require a one-step safe-integer revision advance. Aborted
projections require unchanged revision and byte-identical before/after state.
Unknown outcomes cannot be treated as terminal evidence. Inputs are bounded to
64 KiB each, have closed JSON shapes, and yield fixed diagnostic codes without
input values, raw exceptions or receipt hashes. This is an internal pure library,
with no CLI, credential reference resolver, approval parser or live runner import.

`cad-durable-evidence-fixture.js` supplies one fixed deterministic in-memory
reservation scenario using the existing adapter double. Two prepared clients
compete on a single budget: the first commits a full synthetic hold, the stale
second conflicts, and its fresh attempt sees the exhausted budget. Snapshots prove
no partial state change on conflict or denial. Synthetic witnesses bind the command,
authority description and before/after snapshots to a synthetic receipt. All context
hashes in this fixture are deliberately fabricated from fixed synthetic labels;
they do not identify an engine, source checkout, resource or actual receipt.

The fixture accepts no driver or input and performs no I/O. The inspector can only
compare caller-supplied claims: matching hashes do not establish authentic evidence,
trusted source provenance, transaction semantics or authority. A caller that
fabricates both inputs can produce a synthetic match. This is intentional and never
changes `independentEvidenceVerified`, `liveQualified`, `liveRunAuthorized`,
`publicationAuthorized`, `executable`, uploads or conversion from false. The blocked
adapter and C1-C4 runner remain the public boundary; every result retains holds and
leases, forbids redispatch and reports zero remote attempts.

## Remaining qualification prerequisites

`durableEvidencePrerequisites.json` maps all twelve existing requirement IDs to
pending evidence and keeps every live reference null. Rollback proof involving
backup/restore or a store restart and window rollover remain separately blocked.
Safe-stop/custody planning can proceed without approving those operations.

The next engine implementation must enforce context and authority dependencies
inside actual serializable transactions, including absent rows; persist counters,
receipts, claims and cursor progress; and authenticate independent evidence before
settlement. The in-memory authority description is not a real missing-row read
tracker. This slice does not implement a durable store, claim CAS, receipt settlement,
trusted clock, cost enforcement, retry orchestration, restart recovery or pagination.
The existing memory double is reused only as synthetic reservation evidence.

Before live qualification, reviewers must independently bind full adapter/runner
commits and exact private command bytes, verify an existing isolated resource and
unused run identity, resolve clock/cancellation and shared counters, accept the
external all-in cost cap and evidence custody, and obtain the complete one-run
approval from the [execution plan](cad-live-dev-run-execution-plan.md). Exact private
resource identities, argv, paths, secrets, accounts, raw receipts and live evidence
remain outside Git. No synthetic projection fills a live approval-packet slot.

## Validation and publication

```sh
node --test scripts/cad-durable-evidence-binding.test.js scripts/cad-live-runner.test.js scripts/cad-runner-command-cards.test.js scripts/cad-live-run-approval-packet.test.js scripts/cad-shared-controls-adapter-qualification.test.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Tests exercise every binding substitution, exact receipt/witness drift, atomic
synthetic conflict/denial behavior, revision/outcome constraints, abort preservation,
malformed/oversized input, sanitized diagnostics and unchanged blocked authority.
The manifest and source audit include all new files and reject runtime references
to the inspector, prerequisite packet and fixture. No UI changed. No live provider,
Auth, route, CAD or viewport test is claimed. Expenses: USD 0.

Publication-only template, with the final local SHA substituted after commit:

> Approve pushing only commit [full reviewed SHA] from codex/cad-durable-engine-evidence-binding to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD durable engine/evidence-binding prerequisites. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD uploads, conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

Completed: a bounded synthetic binding inspector, deterministic reservation fixture,
and explicit pending evidence inventory. Next: captain source review and a separate
publication decision. Real durable engine implementation and independent live
qualification remain open; the execution plan and its gates are unchanged.

Local validation receipt: 36/36 focused offline tests passed; 156 manifest files
verified; 142 source-audit files passed with zero leak-pattern matches and runtime
isolation intact; whitespace check passed. The configured symlinked sandbox root
required reviewed direct access to the assigned worktree. No push, live operation,
provider/store mutation, environment change or expense occurred.
