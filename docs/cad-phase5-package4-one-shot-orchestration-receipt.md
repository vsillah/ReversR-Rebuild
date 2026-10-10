# Phase 5 Package 4 disabled one-shot orchestration receipt

Status: validated source-only; the route, body admission, session issuance, custody/provider dispatch, downloads, conversion, and all live capability remain disabled.

Base commit: `a30c11cb56dba945b8d59d06787fa99b7ead4a03`

Parent bindings:

- Package 3 receipt SHA-256: `c97ee229e2d67448a0ad8544d3bcf1c8daa409dda0cfcff7095aaa1a43b2b9a0`
- Entry Phase 5 plan SHA-256: `efa364da815e30088647b74a0ef383663b1ee6115f215e24d3cf8cf4af652cad`

## Source result

`server/cadPhase5OneShotOrchestrator.js` defines an unmounted, closed-by-default successor contract. It accepts only a frozen four-header snapshot and never receives the request or body stream. The fixed ordering is:

1. Exact Package 2 session and entitlement verification.
2. Current cohort, deployment, evidence, retention, expiry, and explicit source-candidate admission evidence.
3. One durable idempotency claim with concurrency, attempt, quota, and US$0.50 reservation inside the existing US$9 ceiling.
4. Exactly one bounded body read and shared IGES validation.
5. Package 3 original-artifact reservation and exact-byte custody commit.
6. One atomic artifact/job binding with the original restricted digest, conversion generation and claim count zero, conversion authority false, and dispatch count zero.

Any missing or expired precondition denies before body access. The adapter exposes `configured: false`, `routeMounted: false`, `bodyAdmissionAuthorized: false`, `providerDispatchEnabled: false`, `conversionDispatchEnabled: false`, and `maxRetries: 0` even when a test-only assembly injects every dependency.

## Durable state and idempotency

`convex/schema.ts` adds internal application tables for orchestration attempts and jobs. The attempt binds the digest-only idempotency key, exact owner/shop/upload session, authority generation, deployment, cohort, evidence, retention policy, reservation, zero-retry policy, fence, expiry, lifecycle state, optional artifact/job identities, and quarantine reason digest. The job binds exactly one attempt and original artifact and fixes conversion authority false with dispatch count zero.

Unique indexed lookups by idempotency digest, attempt, job, and artifact define the required transaction boundaries for a future Convex adapter. The injected control port must implement these lookups and state transitions in durable serializable transactions; the current server bootstrap supplies no implementation. Synthetic tests use one shared serialized store across independent orchestrator instances to exercise the intended cross-instance contract without claiming a live Convex deployment.

Duplicate or concurrent idempotency keys return a replay denial before body access. A restarted instance sees the same terminal or quarantined record and cannot create another artifact or job. Quota, budget, and concurrency rejection also occur before the body reader.

## Unknown outcomes and cancellation

No automatic retry or cap transfer exists. Invalid bodies, custody reservation failure, custody commit ambiguity, job commit ambiguity, and cancellation after a claim become durable quarantine with no success response. A claim whose acknowledgement is lost is quarantined by idempotency digest using a fresh bounded cleanup signal. Cancellation is tested at authentication, evidence, claim, body, custody reservation, custody commit, and job commit boundaries.

An acknowledged job whose response is lost is moved to quarantined along with its attempt. Independent reconciliation owns every quarantined record; expiry alone never releases the idempotency fence or budget reservation.

## Privacy and rollback

Sanitized results include only opaque attempt, artifact, and job identifiers plus fixed public status fields. They exclude headers, credentials, idempotency values, filenames, bytes, content, restricted digests, provider keys, provider errors, and adapter diagnostics. The implementation logs nothing.

The rollback contract closes admission first, then revokes grants, then quarantines unknown work. Source rollback remains file-local because no route or runtime adapter imports this module. The existing operator `/api/cad/import` path remains independent and unchanged.

No network or browser request, credential read, provider or application configuration change, request-body read outside synthetic offline tests, storage write, private CAD access, conversion, deployment, payment, external message, commit, push, or pull request occurred.

Validation results:

- Package 4 orchestration plus current custody/schema/auth assembly: 39 passed, 0 failed.
- Combined Package 1-4 focused CAD suite: 162 passed, 0 failed.
- TypeScript: passed with no diagnostics.
- Convex contract manifest: regenerated and verified across 765 files after the Package 3/5 binding repair.
- Convex source audit: 640 files, zero leak-pattern matches; internal-only and runtime-isolation checks passed.
- Convex local SDK/codegen: five files verified with no deployment access.
- Exact-lock dependency inventory and `git diff --check`: passed.

## Remaining activation prerequisites

Before this source can be mounted, the Captain must approve and bind a durable Convex transaction adapter that re-verifies exact current authority during claim, enforces unique idempotency and artifact/job indexes, performs atomic quota/budget reservation, preserves quarantines and holds across deployment/restart/backup restore, owns independent reconciliation, and proves rollback-first behavior. Exact deployment/cohort evidence, a named Package 3 incident owner and backup, private R2 resources, and all Package 3 activation prerequisites remain unresolved.

Package 5 may use this source model only to add separately reviewed, still-disabled conversion orchestration. Package 4 grants no Sandbox or conversion authority.
