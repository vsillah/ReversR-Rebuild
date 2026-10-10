# Phase 5 Package 8 R2 binding refresh

Status: the bounded R2 provisioning step is verified. Package 8 remains closed
by eleven independent operational bindings.

## Evidence chain

- Merged main: `83140c02ebcf29f287c4d8c023e5dc16ce75f772`
- Source tree: `3508853a7cf470fc73e3a35a8dec7f8867c6f079`
- Clean execution head: `ae17c76ab47105632cbb7ec4fa6be9925f23fba3`
- Production deployment: `dpl_BHGAbZQamRzSc23JPkDMiu62XKiX`
- Split-proof packet SHA-256:
  `51bd69a71349275c631c16eb4849303657fa9c5b3d1dbdd9b7161bd4cd6c77b1`
- Parent proposal SHA-256:
  `554fb996ba48f06109eef17026471aab9c44919926c4b203cb3355e210c39cda`

The clean execution head and merged main share the approved tree. The merge
object was not fetched during this offline refresh; the merged identity is the
explicit approved binding. Historical proposal and split-proof files remain
unchanged.

## Verified R2 state

The official Cloudflare dashboard verified one private bucket named
`reversr-cad-package8-public-fixture-us`. The public-safe packet retains only an
opaque account commitment.

- United States jurisdiction and Standard storage class.
- Public Development URL disabled and zero custom domains.
- Enabled all-object deletion after one day, with no prefix.
- Provider-default seven-day multipart-abort rule unchanged.
- Zero objects, zero bytes, zero Class A operations, and zero Class B
  operations.
- No credential, application binding, object, or runtime activation.
- Data Access Logs unavailable for jurisdictional buckets. No equivalent
  monitoring claim is made.

The source policy remains bound to SHA-256
`106920b5c72e51d5132edd56d913246489a8aa0e0f1c5cf5978b356dee56ee5d`.
It still limits the pilot to 8 MiB, 12 objects, 1,000 Class A operations, 1,000
Class B operations, 1,000 deletes, and US$9. These are source-enforced limits;
they are not provider quotas and cannot be exercised while dispatch is off.

## Eleven remaining bindings

1. Fresh authoritative Convex target metadata and function-name inventory.
2. R2 least-privilege credential custodian binding.
3. R2 durable quota-ledger namespace binding.
4. Current R2 pricing digest.
5. Live Sandbox runtime digest.
6. Live Sandbox resource, network, persistence, and cost-control metadata.
7. Private-data processor boundary attestation.
8. Vercel Spend Management hard limit.
9. Vercel automatic-pausing setting.
10. Metadata-only monitoring destinations compatible with jurisdictional R2.
11. Monitoring alert rules.

Source/codegen function names and supported deployment identity remain separate
proofs. This packet does not claim source-to-deployment function-schema
equivalence. Every Package 8 runtime authority and candidate window remains
inactive.
