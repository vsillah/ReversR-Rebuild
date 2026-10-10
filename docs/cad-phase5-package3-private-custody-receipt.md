# Phase 5 Package 3 private artifact custody receipt

Status: validated source-only; provider dispatch, download routing, body admission, conversion, and all live capability remain disabled.

Base commit: `a30c11cb56dba945b8d59d06787fa99b7ead4a03`

## Provider decision

The controlled-pilot candidate is Cloudflare R2 Standard storage in the `us` jurisdiction. This is the shortest safe source path because R2 supplies a jurisdictional storage boundary, strong read-after-write and delete consistency through its direct APIs, S3-compatible conditional object operations, single-object temporary access, lifecycle deletion, no Standard-class minimum retention, and no egress fee. The source still uses an injected provider port and adds no SDK, credential, environment variable, bucket, or network call.

Vercel private Blob was not selected for this package because it currently requires a new SDK dependency, private storage is documented as beta, and cached deletion/update propagation can take up to 60 seconds. Supabase Storage remains a viable future alternative, but it would add a second authorization surface through Storage RLS and signed URLs. AWS S3 remains viable but adds a separate SDK/provider configuration without a shorter source path than R2.

Official public sources reviewed on 2026-10-10:

- Cloudflare R2 data location and US jurisdiction: https://developers.cloudflare.com/r2/reference/data-location/
- Cloudflare R2 strong consistency and direct-delete semantics: https://developers.cloudflare.com/r2/reference/consistency/
- Cloudflare R2 lifecycle behavior: https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- Cloudflare R2 presigned URL security and expiry: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare R2 pricing and billable operation classes: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 delete operations: https://developers.cloudflare.com/r2/objects/delete-objects/
- Vercel Blob private-storage boundary: https://vercel.com/docs/vercel-blob/private-storage
- Supabase private-bucket access model: https://supabase.com/docs/guides/storage/buckets/fundamentals

## Bound policy

- Region: R2 `us` jurisdiction. Location hints are insufficient because Cloudflare documents them as best effort.
- Storage: private Standard-class bucket, no public access, custom domain, cache, versioning, provider access logging, replica, or customer-managed backup.
- Original IGS retention: 24 hours maximum from reservation. Successful conversion does not extend it.
- Derived preview and STL retention: seven days maximum.
- Unknown/temporary quarantine target: one hour before incident-owned reconciliation or deletion.
- Application-triggered deletion SLA: 15 minutes. An R2 lifecycle rule must backstop deletion within 24 hours; Cloudflare documents lifecycle removal as typically within 24 hours, so the application cannot claim a tighter provider lifecycle guarantee.
- Application security/receipt logs: metadata-only for seven days. Never log bytes, filenames, credentials, raw provider keys, raw download grants, or restricted content digests.
- Download access: an opaque application grant lasts at most 60 seconds and remains bound to the current owner, shop, upload session, artifact generation, stored state, and retention deadline. Package 3 does not expose R2 presigned URLs because Cloudflare documents them as reusable bearer tokens until expiry and their path contains the object key.
- Incident owner role: `ReversR security operator`. This role closes admission, revokes grants, quarantines unknown outcomes, runs independent R2 readback, confirms delete plus absence, preserves sanitized receipts and tombstones, and escalates any missed 15-minute deletion SLA. A named human and backup are still required before activation.

## Enforceable pilot ceiling

The source hard-stops at 12 objects, 8 MiB stored, 1,000 Class A operations, 1,000 Class B operations, and 1,000 free delete operations across one durable pilot quota ledger. The declared all-in ceiling is US$9.00, strictly below the standing US$10 limit.

At the official rates reviewed above, billable-unit rounding yields a worst current incremental R2 amount of US$4.875: one rounded GB-month of Standard storage at US$0.015, one rounded million Class A operations at US$4.50, and one rounded million Class B operations at US$0.36; deletes and egress are documented as free. The source quotas remain enforced even if a free tier is unavailable. Activation must rebind a current pricing digest and use a dedicated pilot namespace; a price change that would make the fixed quotas reach US$9 stops activation rather than weakening the quotas.

## Source result

- `server/cadR2PrivateArtifactCustody.js` defines a disabled server-only adapter. Its public state remains `configured: false`, `providerDispatchEnabled: false`, and `downloadRouteEnabled: false` even with test-only injected dependencies.
- Random 256-bit provider keys stay inside the server/store boundary. Client-visible results contain only opaque artifact identifiers and opaque 256-bit application grant tokens.
- Original, preview, and STL metadata bind owner, shop, upload session, content type, byte count, restricted digest, provider-key digest, lifecycle state, retention deadline, and generation.
- Derived preview and STL records additionally require the original source artifact identifier, restricted source digest, normalized geometry digest, literal `millimeter` units, and the fixed inspection-only/non-manufacturing warning. Original IGS records reject those derived-only fields. The Convex schema models original, preview, and STL records as exact variants so the binding cannot be omitted or attached to the wrong artifact kind.
- Exact-byte put and get checks use the restricted digest without publishing it. No automatic provider retry exists.
- Lost, partial, malformed, cancelled, timed-out, or unacknowledged writes enter quarantine. A fresh bounded cleanup signal is used after caller cancellation.
- Deletion revokes grants first, marks the row deleting, deletes the object, confirms direct provider absence, then replaces application metadata with a replay-preventing tombstone. Any ambiguous step returns `CUSTODY_UNKNOWN` and preserves quarantine.
- `convex/schema.ts` adds artifact, tombstone, download-grant, and durable quota-ledger tables with owner and lifecycle indexes. The quota ledger persists stored bytes, object count, Class A, Class B, and delete-operation counters so every declared provider-operation ceiling has a durable field. No public Convex function or route exposes them.

## Activation prerequisites still unresolved

Before any provider or deployment work, the Captain must bind the exact Cloudflare account, dedicated private bucket, US jurisdiction evidence, bucket encryption/default controls, lifecycle rule, least-privilege token owner, secret-injection path, current pricing digest, isolated quota-ledger scope, named incident owner and backup, alert destination, deletion runbook, and independent read/delete verifier. The runtime must implement the injected provider/store ports transactionally and prove that quotas cannot reset across deploys or instances.

No authenticated provider request, credential read, provider or application configuration change, installation, bucket/object write, private CAD access, deployment, payment, external message, commit, push, or pull request occurred.

Validation results:

- Package 3 custody plus current Convex schema/auth assembly: 28 passed, 0 failed.
- Combined Package 1-3 focused CAD suite: 151 passed, 0 failed.
- TypeScript: passed with no diagnostics.
- Convex contract manifest: regenerated and verified across 765 files after the Package 3/5 binding repair.
- Convex source audit: 640 files, zero leak-pattern matches; internal-only and runtime-isolation checks passed.
- Convex local SDK/codegen: five files verified with no deployment access.
- Exact-lock dependency inventory and `git diff --check`: passed.

## Rollback and next gate

Rollback is source-local because provider dispatch is absent: remove the adapter, schema additions, and tests; regenerate the offline manifest; verify body admission, conversion, downloads, and storage remain disabled. A future live rollback must close new grants first, quarantine incomplete records, delete only package-owned objects under the reviewed selector, independently confirm absence, and retain tombstones.

Package 4 may begin only as disabled source joining authentication, one-use admission, custody, quota reservation, and unknown-outcome handling. It must not read a request body or dispatch conversion without its later separate authorities.
