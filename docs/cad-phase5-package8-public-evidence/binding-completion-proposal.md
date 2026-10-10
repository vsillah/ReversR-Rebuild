# Phase 5 Package 8 binding-completion proposal

Status: blocked by an unknown provider-metadata outcome. This is a completed
source-only proposal, not an activation packet.

## Bound source

- Main: `6c822b215bc74fc1203442bfef903855a9cbe5df`
- Tree: `0063973062495d3f06e93644f041c57d76989f42`
- Vercel production deployment: `dpl_9LJyxxsuq8pqEXBTGidGvagLxfgb`
- Readiness packet SHA-256: `b0d1c3b8c3c6fe85990cf0664c54935adca145bd19ae57b0ea5410c213b83cf0`

Vambah Sillah is the release, rollback, incident, and monitoring owner for this
internal public-fixture qualification. No backup operator is required. The
restricted evidence directory is mode `0700`; its files are mode `0600`. The
public-safe destination contains no credentials, environment values, rows,
logs, request bodies, CAD, object contents, signed URLs, or customer data.

## Verified bindings

- The production deployment remains bound to the reviewed merge commit and is
  recorded as `READY` in the immutable readiness packet.
- One Vercel team metadata read matched `vsillahs-projects` and reported the
  `pro` plan. Its sanitized metadata digest is
  `b7c2491c87c7af5240533ef01d7a0ba928f7bacf767828b2cf4853cdeddf6a2f`.
- The disabled R2 custody source policy is bound to SHA-256
  `106920b5c72e51d5132edd56d913246489a8aa0e0f1c5cf5978b356dee56ee5d`.
  Its candidate limits remain 8 MiB, 12 objects, 1,000 Class A operations,
  1,000 Class B operations, 1,000 delete operations, and a US$9 source cap.
- The disabled Sandbox source policy aggregate is bound to SHA-256
  `cb9f77377fb09baf05ae415c8ff27651399c1a071950b809d974cd2e43f1b478`.
  It specifies one vCPU, at most 2,048 MB, 60 seconds, deny-all networking,
  no persistence, no ports, and fixed request, command, and cleanup deadlines.
- The public-fixture qualification runner is bound to SHA-256
  `8e71575cdfec8c3b761049af71b3fbad2f847f0a68467004ed716842c4697bf3`.

These are source and metadata bindings only. They do not prove a live R2
bucket, a deployed Sandbox runtime, monitoring delivery, upload admission,
storage, conversion, downloads, private CAD handling, or production readiness.

## Stop disposition

The single authorized Convex command produced no parsable sanitized result.
Its outcome is therefore unknown. No retry was made. The stop gate prevented
Cloudflare, Sandbox, and monitoring metadata calls. The Vercel response did not
include Spend Management or automatic-pausing controls.

The consolidated unavailable list is:

1. Fresh authoritative Convex target metadata and function names.
2. R2 account reference, bucket, US-jurisdiction evidence, public-access and
   custom-domain states, lifecycle rules, credential custodian, quota-ledger
   namespace, and current pricing digest.
3. Live Sandbox runtime digest, provider resource controls, network and
   persistence enforcement, cost meter, and processor-boundary attestation.
4. Vercel Spend Management hard limit and automatic-pausing state.
5. Metadata-only monitoring destinations and alert rules.

## Candidate window

The shortest operationally useful proposal is ten minutes:
`2026-10-11T16:00:00Z` through `2026-10-11T16:10:00Z`. It is not active. It
expires without effect and cannot be reused without a fresh exact binding
review.

All Package 8 authority remains false. No configuration, resource, deployment,
function, storage, conversion, download, payment, message, commit, push, PR,
merge, or activation occurred.
