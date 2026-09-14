# CAD runner and adapter command-card source packet

Base: `17ad85717833c4be674c6a2994f6d18192eab00d`.
Branch: `codex/cad-runner-adapter-command-cards`.
Worktree suffix: `ReversR-Rebuild.worktrees/cad-runner-adapter-command-cards`.
Scope: local source review; uploads and conversion disabled; live run blocked.

This implements the offline command-card generation and validation portion of the
[execution plan](cad-live-dev-run-execution-plan.md) and [Mark handoff](cad-mark-handoff.md).
A concrete durable provider adapter and live orchestration runner remain future
work. No command here connects to a provider, resolves a private reference, reads
credentials, probes a route or changes a store. No dependency installation is needed.

## Local commands and meaning

From the assigned worktree, using the installed Node runtime:

```sh
node scripts/cad-runner-command-cards.js --template
node scripts/cad-runner-command-cards.js --check < offline/cad-convex/runnerCommandCards.json
node --test scripts/cad-runner-command-cards.test.js
```

`--template` emits a fresh C0-C4 review projection. `--check` consumes at most 64 KiB
from stdin and emits only fixed codes, counts and a digest of valid packet bytes.
Exit 1 means invalid input; exit 2 means valid structure with missing bindings or
allocations; exit 0 means syntactically complete only. **Every result remains
LIVE_RUN_BLOCKED**, including exit 0. No execute mode or approval-text parser exists.
The committed template must return exit 2. The inspector is an offline preparation
tool, not the future C0 live prerequisite verifier.

## Exact public review schema

[runnerCommandCards.json](../offline/cad-convex/runnerCommandCards.json) is the
closed schema inventory and initial template. Extra/missing keys are rejected at
every inspected level. Schema version, mode, false authority/upload/conversion
gates, C0-C4 order, effects, stop policy, requirement dispositions, inherited limits
and operation matrix must match exactly. No requirement may claim live qualification.

Mutable fields are only the top-level `fields`, each card's `fields`, and C2/C3
allocation integer counts. Null means missing. Commits require 40 lowercase hex
characters; digest and SHA fields require 64. Restricted references must match
`rrb-ref:[a-z0-9-]{1,80}`. Timeouts are positive safe integers at most 1,800,000 ms.
Paths, argv, URLs, credentials, account IDs, CAD bytes, free-text evidence and
provider errors are not accepted in these fields. References and hashes are
unverified claims until independently resolved in the restricted review.

Allocations retain every matrix row in order. C2 plus C3 may never exceed each
row's logical/transaction ceilings. A complete projection allocates all 256 logical
commands and 762 attempts. Zero-attempt client restarts remain zero-attempt; other
rows allocate one to three attempts per logical command. Six global spare attempts
are unavailable for reallocation here. These are reservations, not assertions that
all operations occurred or that blocked scenarios passed. Scenario-to-card suitability,
reconciliation reserve adequacy, nested reads, faults, denials and actual shared
counters require independent review. The validator rejects C3 allocations that seed, reserve, revoke, fence,
restart or inject faults after an unknown outcome. The legacy revoke-or-delete row
permits proposed revocation only; deletion remains excluded.

The inspector hashes exact UTF-8 input bytes, not reserialized JSON. Freeze those
bytes and bind their digest separately in the future human approval alongside the
restricted command-set digest, dossier and envelope digests. Changing whitespace
requires a new digest. Avoid circular hashing: the external approval receipt binds
the frozen artifacts; no card contains its own digest or that approval receipt.
Do not treat a matching hash as source review, evidence authenticity or authority.

## Restricted command record requirements

Each `restrictedCommandRef` must privately resolve to one independently reviewed
record. This packet neither creates nor stores those records. Required record
fields are:

| Field | Exact expectation |
| --- | --- |
| executable | Absolute executable path, exact version string, SHA-256 of executable bytes; no PATH lookup or download |
| argv | Exact ordered string array; no shell, interpolation, watch mode, implicit retries or secret values |
| cwd | Absolute approved working directory |
| source | Full runner and adapter commits matching top-level bindings |
| resource | Exact existing isolated resource, engine/isolation and schema/index hashes, namespace, run, ledger/window/fence and binding digest |
| credentials | Approved reference-resolution mechanism and least-privilege receipt; no credential value in argv or review projection |
| artifacts | Named input byte hashes and output schema hashes, evidence allocation, restricted/sanitized destinations and retention receipts |
| timeout | Card deadline bounded by the single shared run window; each transaction at most 5,000 ms |
| selectors/effects | Exact server-bound selectors, scenario-to-matrix/card allocations and enumerated permitted effects |
| results | Closed sanitized result codes and independent evidence requirements; provider messages remain restricted |
| stop | Exact stop counterpart, cancellation/clock/budget checks, unknown-outcome policy and accepted custody |
| reviewer | Independent reviewer acceptance, timestamp and reviewed record hash |

Hash the exact record bytes into `restrictedCommandDigest`. Hash the exact UTF-8
version/path text, exact JSON argv bytes, artifact/result/selector/effect/stop
contracts into their corresponding digest fields; record this encoding in the
restricted review. `executableSha256` hashes binary bytes. `reviewReceiptDigest`
binds the independent record review. No private path or guessed live invocation
belongs in Git. Concrete C0-C4 argv remain unavailable until real implementations
exist and these bindings are independently reviewed.

C0 checks frozen inputs, actual independent receipts, unused run identity, trusted
clock and enforceable cost without store writes. C1 verifies disabled admission
with an approved no-body non-production request before any seeds. C2 qualifies only
allocated synthetic metadata. C3 reconciles original selectors within the original
window. C4 performs the approved no-body post-check and closeout only while still
within that window. After expiry, C4 cannot make remote requests: close locally
with pending evidence and custody. R recovery remains separately gated.

## Durable adapter interface expectations

The future adapter must expose explicit operations corresponding to the existing
[qualification requirements](../offline/cad-convex/sharedControlsAdapterQualification.json)
and shared-control command contract. An in-memory double is insufficient proof.
All operations receive a runner-owned immutable context: resource binding digest,
namespace, run ID, ledger/window identity, schema version, deadline, shared budget
reservation and exact selector. The selector includes `windowId`, all four binding
fields (`userId`, `shopId`, `sessionId`, `loginSessionId`), original attempt `key`
and `fence`. Reject client-selected partitions or binding drift server-side.

| Operation family | Input and durable return contract |
| --- | --- |
| transaction | Immutable command plus expected ledger revision and complete authority read set; return only COMMITTED with independent receipt reference, ABORTED with verified no-write receipt, CONFLICT with explicit conflict evidence, or UNKNOWN |
| original-selector lookup | Exact original selector/command digest, fresh authority and bounded read budget; return independently verified terminal receipt or unresolved disposition; never create a replacement attempt |
| claim CAS | Selector, expected generation, accepted custodian and expiry at most 60 seconds; persist generation and reject stale owners |
| bounded page | Bound namespace/window, immutable high-water mark, persisted cursor, at most 32 selectors; retain progress, at most four pages/pass and two passes |
| receipt settlement | Original selector, immutable terminal receipt digest, actual integer microdollar cost and current claim CAS; identical receipt is idempotent, conflicting receipt fails closed |

A serializable commit must atomically persist attempts, both leases, full cost hold
and the entire authority read set, including missing-row/revocation dependencies.
No external effect belongs inside a retryable transaction callback. Explicit
conflicts alone can retry, at most three attempts with 100/250 ms backoff and fresh
clock, authority and ledger reads. Both clients share all row/global budgets,
including nested operations. Price evidence and an externally enforced all-in cap
remain separate from application counters. No dispatch/outbox consumption is exposed.

`inspectOutcome` is a pure synthetic decision table: UNKNOWN stops new work and
requires review of bounded original-selector lookup; closed window, exhausted
budget, invalid observation or binding drift stops every remote operation.
COMMITTED/ABORTED reports still require independent receipts. Every outcome retains
leases/holds; only a separately verified settlement implementation may release them.
It never calls an adapter, sleeps, retries, reads a clock or resumes a stopped run.

Backup/restore, store crash/restart and rollover remain blocked, so the twelve
requirements cannot all be called live-qualified. Unresolved state preserves full
holds, both leases, cursor, acknowledged commits and accepted custody through expiry.
Recovery, retention/deletion and a second run require separate approval.

## Evidence handling and next gate

The public inspector emits no input values or raw errors; invalid packets have no
output digest. Valid projected identifiers/digests still require a privacy review
before publication. Do not feed raw provider dumps or private command records into
this public projection. The CLI does not scrub input files or authorize publication.
Live evidence sanitization and authenticity need independently reviewed capture
and redaction code in the future runner.

Publication-only phrase, with the final locally reviewed commit substituted:

> Approve pushing only commit [full reviewed SHA] from codex/cad-runner-adapter-command-cards to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD runner/adapter command-card packet. No merge, deployment, live tests, env/provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD uploads, conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

The later one-run approval must use the complete phrase in the
[execution plan](cad-live-dev-run-execution-plan.md#next-approval-wording), with the
frozen restricted command-set digest and this projection digest both named. Never
present it as actionable until every resource, runner, adapter, cost, clock, custody,
independent receipt and command binding is resolved. Publication approval supplies
no qualification authority.

## Local validation

Validation commands for this packet:

```sh
node --test scripts/cad-runner-command-cards.test.js scripts/cad-live-run-approval-packet.test.js scripts/cad-bounded-live-run-dossier.test.js scripts/cad-live-adapter-run-packet.test.js scripts/cad-shared-controls-adapter-qualification.test.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

No live HTTP/Auth/Convex tests, CAD conversion, UI checks, provider setup, dependency
installation, deployment or spending is part of this source packet. Remaining work:
Captain review/publication decision, real durable adapter and live runner source,
independent qualification prerequisites, then separately approved one-run evidence.

Validation receipt: 33/33 synthetic offline tests passed; 144 manifest files
verified; 130 source-audit files passed with zero leak-pattern matches and runtime
isolation intact. Whitespace checks passed. Expenses: USD 0. No live execution or
publication occurred.
