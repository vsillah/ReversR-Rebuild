# CAD private evidence and command-card fill planning

Base: `c785c79e7ed3b1b5eea1868a82a41740fa2451ed` after PR #210.
Branch: `codex/cad-private-evidence-command-card-fill`.
Status: source-only private evidence and command-card fill planning complete;
live execution remains blocked. Expenses: USD 0.

## What this resolves

PR #210 assembled the durable run source packet and identified the remaining
private evidence gates. This packet turns those blockers into a reviewable fill
plan. It covers every field in `liveRunApprovalPacket.json`, the C0-C4 command-card
field inventory, a proposed C2/C3 operation allocation, resource-binding evidence,
run identity, custody, time, cost, evidence destinations, disabled-route pre/post
checks, reconciliation/rollback acceptance and retained-state custody.

Only four values are source-resolved in public source: adapter commit, runner
commit, schema/index reference and disabled-route baseline reference. Every private
resource, command byte, command digest, run identity, custodian, evidence destination,
clock and cost value still needs a restricted record and independent review before
one bounded live development run can be approved.

## Filled source-safe values

The fill plan binds to the source identities already accepted by the PR #210 packet:

| Field | Public value |
| --- | --- |
| `identity.adapterCommit` | `a07f97aaa34913ba5e622d05e92cd22722fe6d55` |
| `identity.runnerCommit` | `a07f97aaa34913ba5e622d05e92cd22722fe6d55` |
| `identity.schemaAndIndexRef` | `rrb-ref:source-schema-index-a07f97a` |
| `evidence.disabledRouteBaselineRef` | `rrb-ref:disabled-upload-baseline-a07f97a` |

These are not live evidence. They are source-backed public identifiers only.

## Restricted fill requirements

The remaining fields stay private or run-bound:

| Group | Required fields |
| --- | --- |
| Source review | Independent source review reference |
| Run identity | Run ID, namespace, ledger/window reference, ledger ID, window ID and fence |
| Resource evidence | Alias, private resource binding, engine/isolation, synthetic inventory, least privilege, fixture digest, scenario allocation and independent verifier |
| Custody | Primary, backup, escalation owner, recovery operator, evidence reviewer and retention acceptances |
| Timebox | Exact UTC start/expiry, trusted clock evidence and stop procedure |
| Cost | Enforced cap at most USD 9, dated pricing, line items and retained-state coverage |
| Evidence | Restricted and sanitized destinations, sanitization review, disabled-route live plan, reconciliation, rollback and recovery baseline |

No exact resource identity, account ID, endpoint, credential, command path, private
filename, private source path, raw provider output, CAD byte or secret belongs in
Git. Public source receives only opaque `rrb-ref` values and SHA-256 digests.

## Command-card fill plan

C0-C4 remain non-executable. Each card must later be represented by independently
reviewed restricted bytes with these public digest fields: command reference,
command digest, executable version digest, executable SHA-256, argv digest, cwd
digest, input and output artifact digests, review receipt digest, timeout, selector
digest, side-effect digest, expected result-code digest and stop-plan digest.

The proposed allocation keeps all 256 logical commands and 762 transaction attempts
inside the existing operation matrix, leaving the six global spare attempts unused.
C2 receives seed, reserve, revocation, fence, fault-injection and client-restart
work. C3 receives only allowed reconciliation work: exact-selector reads,
authority-dependency reads, unknown marking, CAS claims, terminal-receipt settlement
and bounded page scans. Deletion remains excluded; revocation is the only accepted
synthetic authority-removal behavior in this run class.

The proposed allocation digest in
`offline/cad-convex/privateEvidenceCommandCardFillPlan.json` binds the exact JSON
projection. It is not a command-card bytes digest. The future command-card bytes
must still be generated privately, reviewed independently and hashed separately.

## Remaining blocker

This packet resolves planning coverage, not evidence authenticity. A live run is
still blocked until:

- the exact existing non-production resource is privately bound and reviewed;
- C0-C4 restricted command bytes and digests are frozen;
- the final run ID, namespace, ledger, window and fence are allocated;
- primary, backup, evidence reviewer and retention custody are accepted;
- exact UTC start/expiry and stop procedure are recorded;
- a hard external all-in cost cap below USD 10 is proven;
- restricted and sanitized evidence destinations are accepted;
- disabled-route pre/post plan, reconciliation, rollback and retained-state custody
  are reviewed.

Backup/restore, store restart, window rollover, retention/deletion, production
access, upload activation, CAD conversion and Sandbox dispatch remain outside this
run class unless separately approved.

## Local validation

Use only local source checks:

```sh
node --test scripts/cad-private-evidence-command-card-fill.test.js scripts/cad-live-durable-run-packet-assembly.test.js scripts/cad-runner-command-cards.test.js scripts/cad-live-run-approval-packet.test.js scripts/cad-bounded-live-run-dossier.test.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run typecheck
git diff --check
```

No provider call, live Convex/Auth test, environment change, upload body, CAD bytes,
conversion, Sandbox dispatch, UI exposure, deployment or expense belongs to this
validation.

## Future approval phrases

Publication only:

> Approve pushing only commit [full reviewed SHA] from codex/cad-private-evidence-command-card-fill to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD private evidence and command-card fill planning packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

One bounded live development qualification run, after all private evidence is filled
and independently reviewed:

> Approve one synthetic durable-adapter development qualification run [run ID] at adapter commit a07f97aaa34913ba5e622d05e92cd22722fe6d55 and runner commit a07f97aaa34913ba5e622d05e92cd22722fe6d55, command-card fill plan [SHA-256], exact command cards C0-C4 [SHA-256], final dossier [SHA-256], final envelope [SHA-256], private existing resource [exact identity and binding digest], alias [alias], namespace [namespace], ledger/window/fence [values], operation/counter matrix b71156a06e5716fd32094cbe7dcba1bc615b7d1f689f9341765c89e026356e98 and accepted per-row allocations [SHA-256], primary and backup custodians [accepted references and digests], independent reviewer [acceptance digest], UTC interval [start to expiry, at most 1800 seconds], enforceable all-in cap [at most USD 9 and evidence digest], restricted/sanitized evidence destinations [accepted references and digests], disabled-route pre/post plan [digest], reconciliation/rollback acceptance [digests] and retained-state custody [digest]. Permit only enumerated synthetic metadata reads/writes and non-production no-body verification within the reviewed shared counters, including revocation but no deletion. Keep uploads disabled and stop on unknown outcomes under the bounded reconciliation plan. No production access/smokes, live Auth tests, private CAD, conversion, Sandbox, enrollment, email/SMS/Slack, env/provider/auth/resource or usage/billing changes, secrets, backup/restore, store restart, rollover, retention/deletion, merge, deployment or lane cleanup. No automatic retry after expiry, resume or second run.

This live-run phrase remains a template. The next practical phase is to assemble
the restricted evidence and command-card byte packet outside public source review,
then bring back only safe aliases, references and digests.
