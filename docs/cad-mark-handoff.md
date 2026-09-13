# ReversR CAD Import: Mark handoff

September 13, 2026. Source baseline: PR #204, commit
`ce8265f60f3ee7350c0515d49fa9b8d60dfc9cad`.

ReversR is deployed, and its protected CAD routes reject unauthorized requests.
The import interface and backend groundwork are merged. **User CAD uploads remain
disabled.** The remaining work includes implementing and reviewing the live
qualification runner and durable adapter, proving the development controls, and
separately approving production activation. We cannot promise a production upload
launch tonight from the evidence available.

Production: [ReversR](https://reversr.vercel.app).
The Integration Captain recorded a successful deployment for #204 and a passing
production denial smoke at 23:42 UTC on September 13. This handoff uses that
existing record; this documentation task made no live requests. The
[evidence appendix](cad-mark-handoff-evidence.md) separates production observations,
source checks, historical conversion evidence and remaining unknowns.

## What is ready

- The merged import experience explains the CAD path and its restrictions.
- The user-upload route verifies sessions and rejects requests before reading CAD
  bodies. Even a verified session reaches a source gate that keeps uploads disabled.
- Offline contracts cover session authority, bounded admission, shared quota and
  cost accounting, lockout, retention and reconciliation. They support review and
  further implementation; their tests use synthetic data.
- PRs #201–#204 define the evidence and approvals needed for a bounded development
  qualification. #204 explicitly identifies the missing runner and adapter.

## What is not ready

The user-upload pipeline has no approved production activation. Live exact-session
Auth qualification and real durable-adapter qualification remain unproved by this
packet. Offline passing tests cannot establish multi-client transaction behavior,
current revocation, enforced provider costs or recovery on a real store.

Earlier operator-only conversion and narrowly bounded pilot evidence do not qualify
arbitrary customer files. Render fidelity, dimensional accuracy, assembly coverage,
export quality and manufacturing suitability require their own acceptance evidence.
Mark should treat this as a status and engineering handoff, not an invitation to
submit customer CAD.

## Next actions and decision gates

| Owner | Next action | Evidence needed to advance |
| --- | --- | --- |
| Integration Captain | Review this local packet and its immutable commit; request publication-only approval | Sanitized diff and offline validation receipt |
| Dedicated development lane | Implement and independently review the durable adapter and runner/preflight command path described in #204 | Exact source commits, executable/version hashes and reviewed command cards; production uploads stay disabled |
| Captain and accepted resource/custody owners | Resolve the existing isolated development resource, namespace, independent reviewers, custody and enforceable total cost | Private bindings and dated acceptance receipts; no secrets or private identifiers in Git |
| Vambah | Consider one bounded synthetic development qualification only after prerequisites resolve | Completed dossier/envelope, exact run window and commands, accepted stop/reconciliation plan and enforceable cap |
| Captain | Review actual qualification outcomes and resolve remaining Auth, recovery, retention and upload gates | Independent live receipts; blocked scenarios remain visible |
| Vambah and Captain | Separately approve any upload/conversion activation, then review implementation, deployment and real-route human QA | Explicit scope, exact commit, rollback, operational evidence and applicable visual/geometry acceptance |

The proposed adapter run has a 30-minute ceiling and an unverified all-in ceiling
of USD 9. Neither is execution authority. Missing or unenforceable cost evidence
blocks the run. The earlier Auth proposal is a separate scope and supplies no
qualification for this run.

The largest risks are confusing merged planning work with readiness, accepting
synthetic receipts as live proof, and enabling uploads before authority, accounting,
cleanup and rollback work together. Unknown transaction outcomes must retain their
holds and accepted custody until independently reconciled. Recovery after expiry
needs separate approval; a stopped run cannot silently resume.

Completed tonight: a reviewable status handoff with the remaining gates explicit.
The plan now starts with the concrete runner/adapter gap. Next is Captain review
and publication approval; production upload activation remains blocked.
