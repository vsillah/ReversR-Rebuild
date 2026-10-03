# Phase 7: isolated Google custody source checkpoint

This addition is an offline proposal and deterministic journal planner. It performs no IO and installs no host. `modeledAccepted` means supplied synthetic metadata passes structural checks. `hostQualified`, `bodyAdmissionAuthorized`, `liveReady`, and authenticated provenance remain false. No production continuity proof is constructed.

The proposed manifest selects `us-east1`, project candidate `reversr-cad-custody`, separate evidence/anchor buckets, journal/reader services, and six least-privilege role candidates. Names have not been checked for availability. The supplied Vercel constraints are proposal inputs, not verified trust. Actual project number, service URLs, audience, identity mappings, immutable workflow refs, deployment bindings, authenticated subjects, independent administration, billing and retention approvals remain unbound. The shared AmaduTown project/bucket are excluded. No executable provisioning or IAM commands are included.

## Journal behavior

Each sequence has an immutable payload containing the complete grant binding, stable scope/run/session keys, epoch, previous payload digest, policy, command nonce, modeled time and cumulative counters. The append plan uses `ifGenerationMatch=0` and exact serialized bytes. Every required origin/history read is generation-pinned. A mutable head is never authority. Plans and nested results are frozen; caller input is captured before the first await.

Precondition zero is only a proposed conditional write. It cannot prove that noncurrent, deleted, recreated or historical objects never existed. Missing, noncurrent, truncated or conflicting supplied history denies. A permanently retired namespace denies. Lower counters than recorded history deny. Repeated reservations and forward work after consumption, close, revoke or unknown deny. Recovery never releases reservations. The model deliberately supports one complete immutable binding per resource journal; it supplies no rotation, namespace reset, epoch advancement or retirement implementation.

Origin/checkpoint/readback inputs remain unauthenticated. A mutually consistent forged or restored set cannot be distinguished by this model. Even structurally accepted empty history requires a supplied origin generation and remains unqualified. Reader/writer identity inequality is only a structural check. It proves neither independent custody nor independent administration. There is no durable budget transaction, multi-object atomicity, permanent reservation enforcement, trusted clock or revocation-to-stream handoff.

## Accounting and write outcomes

The modeled envelope is 60 minutes, two callers, 1,000 service requests, 1,000 storage operations and 10 MiB. Forward plans leave 200 requests, 200 storage operations and 49,152 payload bytes (48 KiB) for recovery. The payload reserve covers three known 16 KiB restrictive appends: unknown, close and revoke. Each plan charges two modeled service requests and `history.length + 3` known storage operations: origin read, every historical generation read, append and fresh appended-generation readback. Each payload reserves 16 KiB; at most 64 records are accepted by this source model. Historical counter increments must include the history size applicable at that sequence. Unknown reconciliation payload costs remain unqualified; this reserve is not a real provider cost cap.

Version-history reconciliation, pagination, retries and provider-specific overhead have no qualified bound here. The plan explicitly returns `versionReconciliationOperations: null` and `providerCostBoundQualified: false`; known-operation accounting is not a worst-case provider cost. A future executor must durably reserve every actual attempt, retry, reconciliation page and readback before dispatch, reconcile independently, and stop before the reserve is exhausted. No budget reset or successful persistence is inferred from a supplied checkpoint. This source cannot enforce a monetary cap and authorizes no spending.

Every write outcome remains denied pending authenticated independent reconciliation. Lost responses, failed preconditions and conflicting/missing evidence require quarantine, prohibit forward retry and never claim quarantine was persisted. Even a response-received result does not prove a durable commit. Production authorization ignores callbacks, booleans and self-hashed receipts and always denies.

## Validation and remaining gate

Run `node node_modules/typescript/bin/tsc -p scripts/tsconfig.cad-gcp-custody.json`, `node --test scripts/cad-gcp-custody-source.test.js scripts/cad-gcp-custody-source-checker.test.js`, and `node scripts/cad-gcp-custody-source-checker.js`. The checker reads bounded, fixed-path files without executing local modules and rejects symlinks, substituted packets, malformed CLI input and source drift. These are local source checks, not cloud tests.

All predecessor tracked files remain byte-identical to `7ee755031f68bde147c50e1455b86419b76a627a`. Historical rollback remains the unchanged negative `SCHEMA_FORMAT_UNSUPPORTED` baseline, with `fixtureCompatible: false`. A selected new custody implementation needs independently verified restrictive rollback and post-rollback smoke; no compatibility success is claimed for the old adapter.

Phase 7 remains active. Next is independent source review before any requested commit. Provider implementation, provisioning, IAM, credentials, deployment, live smoke, upload sessions, body admission, conversion and Phase 8 remain outside this checkpoint. Costs incurred: zero.
