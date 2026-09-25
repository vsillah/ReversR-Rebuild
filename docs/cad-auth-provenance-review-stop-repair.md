# CAD Auth provenance review stop-disposition repair

Status: source-only repair contract. It binds the stopped private provenance
review by opaque reference and SHA-256 digests only. It does not read private
review bytes, repair a private schedule, accept evidence, issue receipts, create
a source set, or authorize a second private review.

## Bound stopped review

| Item | Exact value |
| --- | --- |
| Main commit | `9fbb305deaf662da006fad8940403845c6c9d993` |
| Private review ref | `rrb-ref:cad-auth-private-evidence-provenance-review-20260925T170602Z` |
| Review SHA-256 | `b580a7ee7368f98dedeea2f5251752bbae7751bea544a0f94d7ef7305dff2747` |
| Review receipt SHA-256 | `f9398433f67e097c6de36453db3b6d348cf616056e7844a4bc6c7d83de81606b` |
| Stopped status | `STOPPED_SOURCE_ARTIFACT_MISMATCH` |
| Original schedule ref | `rrb-ref:cad-auth-private-evidence-provenance-schedule-20260925T170602Z` |
| Original schedule SHA-256 | `421394b9d45264001041f22d7af674cec171e94c7c96a212588ad7afa73c0b31` |

The prior review remains stopped. No field, category, source artifact, receipt
or private value is accepted by this packet.

## Repairs required before any future private review

The stopped review identified two incomplete field-to-artifact mappings in the
private schedule. The next private schedule repair must update only these two
fields:

| Field | Required repaired artifact contract |
| --- | --- |
| `durableConsumedRunLedger.atomicConsumeReceiptRef` | Approved atomic-consumption qualification receipt for the durable consumed-run ledger, binding ledger identity, immutable target, reviewed ledger implementation, single-consumption behavior, reviewer receipt and approval receipt. |
| `installedRouteBodyObserver.platformBufferingReceiptRef` | Approved platform-buffering review receipt for the installed route-body observer, binding exact route, immutable deployment, pre-handler buffering coverage, reviewer receipt and approval receipt. |

The private schedule repair must also bind prior-evidence approval receipts and
independent-review receipts for all 22 unsupported fields. A source artifact
digest alone is insufficient. Each field must appear exactly once in the repaired
private schedule with an opaque source artifact reference, source artifact SHA-256,
source artifact byte count, prior-evidence approval receipt, independent-review
receipt, reviewer independence receipt, target/source/time coherence receipt and
retention/deletion disposition.

## What this packet does not do

This packet does not:

- read private receipts, private schedules, secrets, private paths or private
  values;
- create or supply receipts;
- generate a restricted source set or public projection;
- issue upload sessions, activate upload, or admit/read request bodies;
- run conversion, Sandbox dispatch, live evidence collection, runtime activation
  or executable command-card issuance;
- retry or conduct a second private review;
- send external messages, enroll real users, or claim commercial readiness.

## Next gate

The next gate is a bounded private schedule repair, not a private evidence review.
It may read only the named original private schedule and previously approved
secret-free source artifacts named by that schedule. It must stop if either
mapping remains unresolved, if any prior-evidence approval or independent-review
receipt is missing, or if runtime credentials/provider configuration are needed.
The repaired private schedule and its digest become the inputs for a later,
separately approved private evidence-provenance review.

## Validation

```sh
node scripts/cad-auth-provenance-review-stop-repair-checker.js
node --test scripts/cad-auth-provenance-review-stop-repair.test.js scripts/cad-auth-receipt-provenance-gap-recovery.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

Optional `--write` regenerates only the public source-bound packet from fixed
public sources. Tests cover the stopped-review binding, the two repaired mapping
contracts, all 22 prior-evidence approval and independent-review requirements,
source drift, hostile inputs, sanitized failure output and runtime isolation.
