# Phase 5 Package 8 Remaining-Binding Inventory

Status: `STOPPED_LIVE_SANDBOX_BINDING_UNAVAILABLE`

Sanitized payload SHA-256:
`6810835298ce09e4b2f685f938c3bf4cfa42809a39741cbd0331ce9b2287bcdb`

## Bound source

- Merged main: `83140c02ebcf29f287c4d8c023e5dc16ce75f772`
- Source tree: `3508853a7cf470fc73e3a35a8dec7f8867c6f079`
- Production deployment: `dpl_BHGAbZQamRzSc23JPkDMiu62XKiX`
- R2 refresh packet: `2cf6942916649c9280475e55c75d86a08ccf531952ea4fd55c5df764e6588f12`
- Convex split proof: `51bd69a71349275c631c16eb4849303657fa9c5b3d1dbdd9b7161bd4cd6c77b1`

## Resolved in this inventory

1. Current R2 Standard pricing is bound to the official public pricing page:
   `$0.015/GB-month`, `$4.50/million` Class A, `$0.36/million`
   Class B, no retrieval charge, and free internet egress. The monthly Standard
   free tier is 10 GB-month, 1 million Class A operations, and 10 million Class
   B operations. Billing-unit rounding applies.
2. The Vercel team is on Pro with a `$200` Spend Management budget. Automatic
   production pausing and the spend webhook are both off. The budget is a
   notification threshold, not an effective hard cap.
3. Vercel's public Sandbox contract supports the selected `node24` runtime,
   1 vCPU with 2 GB RAM, a nonpersistent opt-out, and the documented active
   CPU, provisioned-memory, creation, transfer, and snapshot meters.
4. Vercel web notifications are enabled. No drain or custom alert rule was
   observed; the default anomaly rule exists. This does not cover the complete
   R2 and Sandbox qualification lifecycle.

## Stop condition

The authenticated Sandbox surface contained no existing Sandbox resource from
which to derive a live runtime or enforcement digest. Creating a Sandbox was
outside this read-only scope. Provider reads stopped at that boundary. No
Convex authenticated read followed it, and no internal function-spec endpoint
was used.

## Remaining eight bindings

1. Fresh supported Convex deployment-identity receipt.
2. R2 least-privilege credential custodian binding.
3. R2 durable quota-ledger namespace binding.
4. Live Sandbox runtime digest.
5. Live Sandbox runtime, resource, network, persistence, and cost-enforcement
   receipt.
6. Qualification-specific private-data processor-boundary acceptance.
7. Metadata-only destination covering the R2 and Sandbox qualification
   lifecycle.
8. Package 8-specific alert and stop-state rule.

Package 8 activation, request-body admission, storage, conversion, downloads,
deployment, payment, and external messaging remain disabled.

## Official sources

- https://developers.cloudflare.com/r2/pricing/
- https://vercel.com/docs/spend-management
- https://vercel.com/docs/sandbox
- https://vercel.com/kb/guide/vercel-sandbox-duration-and-persistence
- https://vercel.com/pricing
- https://vercel.com/docs/notifications
- https://vercel.com/docs/observability
- https://vercel.com/docs/drains
- https://vercel.com/legal/Vercel_Inc_-_Data_Processing_Addendum.pdf

## Exact next authorization

> I approve one bounded Phase 5 Package 8 development prerequisite setup in `codex/cad-phase5-package8-release-gate`, bound to remaining-binding inventory SHA-256 `6810835298ce09e4b2f685f938c3bf4cfa42809a39741cbd0331ce9b2287bcdb`, merged main `83140c02ebcf29f287c4d8c023e5dc16ce75f772`, R2 refresh packet `2cf6942916649c9280475e55c75d86a08ccf531952ea4fd55c5df764e6588f12`, and split-proof packet `51bd69a71349275c631c16eb4849303657fa9c5b3d1dbdd9b7161bd4cd6c77b1`. Permit one supported names-only Convex development deployment-identity read; create exactly one least-privilege Cloudflare R2 credential limited to bucket `reversr-cad-package8-public-fixture-us`; transmit its values once, in memory, only into the ReversR Vercel development and preview server environment; and record only credential-name and custodian metadata. Bind one durable quota-ledger namespace and run exactly one empty nonpersistent Vercel Sandbox enforcement preflight using `node24`, `iad1`, 1 vCPU, 2 GB maximum memory, 60 seconds maximum lifetime, deny-all network, no exposed ports, no snapshot, one attempt, and zero retries. Create no R2 objects and run no CAD conversion. Require sanitized receipts for target identity, policy enforcement, terminal Sandbox cleanup, and a calculated maximum pilot cost below US$9. No production environment changes or deployment, application deployment, session issuance, request-body admission, private or customer CAD, storage dispatch, conversion dispatch, downloads, payments, commits, pushes, PRs, merges, or external messages. Stop on broader credential scope, secret exposure, target mismatch, inability to enforce the cost ceiling or cleanup, unsupported monitoring coverage, provider write beyond the approved credential and environment bindings, or unknown outcome.
