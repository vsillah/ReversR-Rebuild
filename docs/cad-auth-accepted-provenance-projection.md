# CAD Auth accepted provenance projection

Status: source-only projection. This packet records that the private provenance
review was accepted without reading or republishing the private review, receipt,
schedule, field evidence, local paths, or key listings.

## Bound private review

| Field | Value |
| --- | --- |
| Source merge commit | `5690e016163d916096a40a9a09204c57c5a541c5` |
| Private review ref | `rrb-ref:cad-auth-private-evidence-provenance-review-20260925T175957Z` |
| Private review SHA-256 | `b82710710dad2560c098e9e207af3b5beff5c9bb0223020ebf371b169abe2088` |
| Review receipt SHA-256 | `e3687b11ea4d55f64d21b183c3abf46f88d8c56291b5ce93e4905ffec6d29fbd` |
| Repaired schedule ref | `rrb-ref:cad-auth-provenance-repaired-schedule-20260925T175957Z` |
| Repaired schedule SHA-256 | `fc8611568aaf7eaf48a132b274d748d931ebba81acf05ee2b7088376701f7bcb` |

## Projected disposition

The accepted review is projected as opaque references, SHA-256 digests, counts
and closed-control statuses only:

- private provenance review disposition: `ACCEPTED_PRIVATE_PROVENANCE_REVIEW`
- accepted unsupported receipt fields: `22/22`
- repaired source-artifact mappings verified: `2/2`
- runtime/upload/request-body/conversion/Sandbox controls: closed
- receipt supply and source-set generation: not authorized by this packet

## Retention

The restricted review store is projected as
`rrb-ref:cad-auth-provenance-review-store-20260925T170602Z`. Working copies and
private derivatives remain governed by `P7D` retention through
`2026-10-02T17:06:02Z` under
`rrb-ref:cad-auth-evidence-custodian-captain-20260925T170602Z`. The independent
reviewer reference remains
`rrb-ref:cad-auth-evidence-independent-reviewer-20260925T170602Z`.

## Next gate

The next gate is private eight-artifact receipt supply from the accepted
provenance review. It must separately approve reading only the named accepted
private review, review receipt and repaired schedule, writing dedicated receipt
artifacts into an ignored private receipt source folder, and stopping without
substitution if any category or required field lacks accepted provenance.

## Validation

```sh
node scripts/cad-auth-accepted-provenance-projection-checker.js
node --test scripts/cad-auth-accepted-provenance-projection.test.js scripts/cad-auth-provenance-review-stop-repair.test.js
```
