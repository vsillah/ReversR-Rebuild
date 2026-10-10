# Phase 5 private IGS activation plan

Status: Packages 1-7 are complete within their source-only scopes, including Package 6 Human QA approval on 2026-10-10 and Package 7's deterministic synthetic private-path control qualification. Package 8 source-only release-readiness preparation has started, but all live capability and Package 8 activation remain disabled.

Original plan prepared from: `a30c11cb56dba945b8d59d06787fa99b7ead4a03`.

Package 7 revision base: `066ea62d8cbc32cf7358497c0b9cf128ab38a59a`.

Supplied Phase 4 closeout manifest SHA-256: `255e8320b9cf840ee151418a90c15e63873272aa2cc6f726586d5a503f21c8aa`

## Decision

ReversR has useful pieces of the journey, but it does not yet have one qualified private-file path. The repository can authenticate a synthetic session, reject unauthenticated production requests, validate bounded IGES input, run a public fixture through a sandboxed converter, render qualified fixture geometry, and offer fixture downloads. Those proofs were completed in separate lanes with different trust boundaries.

Phase 5 joins those pieces through eight finite work packages. Package 1 repaired and froze the evidence baseline. Package 2 added an unrouted, closed-by-default web session binding for exact Convex Auth login plus fresh user/shop CAD authority. Package 3 added a disabled Cloudflare R2 custody contract, metadata/tombstone model, bounded quota policy, and owner-checked download-grant contract. Package 4 added an unmounted one-shot orchestration contract and durable attempt/job schema that preserve authority-before-body ordering, idempotency, quota holds, quarantine, and zero conversion dispatch. Package 5 added an unmounted bounded-conversion successor contract, monotonic conversion job model, deterministic source-bound preview/STL generation, cleanup-before-ready rule, and terminal quarantine matrix while keeping runtime dispatch at zero. Package 6 supplies a localhost-only browser qualification mode for the still-disabled authenticated Import-to-Design journey, including exclusive generated sources, automatic progress, reload continuity, failure/unknown recovery, interactive Design review, exact local artifact downloads, and deletion/revocation. Vambah's `proceed`, interpreted by the Captain in this thread on 2026-10-10, approved Human QA of the final privacy-safe MP4. Package 7 now qualifies only the source-level private-path controls with one deterministic project-owned, nonproprietary synthetic IGES fixture. Package 8 remains a separate exact-deployment and rollback gate; its source-only readiness packet binds the current merge, production deployment and fail-closed smoke while leaving every operational and runtime authority false.

Nothing in this plan authorizes credentials, provider or environment changes, storage writes, request-body admission, conversion, deployment, private CAD, a live test, or production activation.

## Entry gate and provenance

The repository was inspected at a clean detached HEAD. `HEAD`, `main`, `origin/main`, and `origin/HEAD` all resolved to the required commit when this plan was prepared. No `AGENTS.md` exists inside the checkout; the task-supplied project instructions govern this lane.

The intentionally untracked Phase 4 closeout manifest was read from the restricted local evidence location at `.local/cad-convex/controlled-upload-development-qualification-closeout/phase4-20261010/closeout-manifest.json`. A fresh local SHA-256 calculation matched the supplied digest exactly. The file is mode `0600`, uses schema version 1, has classification `PHASE4_DEVELOPMENT_QUALIFICATION_CLOSED`, and binds its restored source to `a30c11cb56dba945b8d59d06787fa99b7ead4a03`.

Its public-safe closure fields record zero request-body reads, zero CAD storage writes, no upload admission, no conversion, no Sandbox authority, and no production changes. The terminal readback is closed, revoked, permanently stopped, spent, rollback-armed, and not unknown. This satisfies the Phase 4 provenance gate while preserving the restricted manifest outside Git. Each future implementation lane must recheck the same digest before relying on it; a mismatch or missing restricted artifact stops that lane.

Package 1 repaired two checked-in evidence surfaces:

- The integrated-readiness inspector and JSON now bind the current `server/cadUserUploadRouter.js` digest `505edcad...` instead of `70c1c838...`.
- The checked-in generator refreshed `offline/cad-convex/manifest.json`; the manifest now verifies 750 source files.

The repair changed evidence hashes only. It did not change the route, its closed body-admission literal, or any runtime authority. The public-safe Package 1 receipt is `docs/cad-phase5-package1-source-inventory-threat-model-receipt.md`, SHA-256 `db4e619e78d4768c6de3bfbe3d6e7c90d33121b139b75ff8ddf7ed54aa9241a4`.

## Current evidence boundary

| Capability | Current evidence | Classification |
| --- | --- | --- |
| Production route rejects missing sessions before body access | `server/cadUserUploadRouter.js`; focused route tests; prior 401 receipts | Qualified fail-closed behavior |
| Opaque cookie verification, expiry, revocation, permission, Origin and CSRF rules | `server/uploadSession.js`, `server/cadConvexAuthWebSessionBinding.js`; focused tests | Qualified source-only web contract; issuance remains unrouted |
| Durable session-service interfaces | `server/uploadSessionStore.js`, `server/convexUploadSessionStore.js`, `convex/cad.ts` | Exact authority model and caller cancellation bound; production issuer/store assembly remains unproven and disabled |
| Exact bounded IGES body validation | `server/cadUserUploadAdmission.js`, `utils/igesAdmission.js`, `server/cadWorkerContract.js` | Qualified offline and in isolated development evidence; production body gate remains closed |
| Production body admission | `BODY_ADMISSION_AUTHORIZED = false` in `server/cadUserUploadRouter.js` | Disabled by source |
| Controlled execution binding | `server/cadProductionExecutionBinding*.js` and live-opening modules | Reviewed scaffolding; installable live binding and durable host remain unproven |
| Development one-use control transaction | `convex/cadControlledUploadDevQualification.ts` and the controlled-upload runner | Qualified with synthetic metadata; no upload or conversion authority |
| Hosted IGES conversion isolation | `server/cadSandboxExecutor.js`, `server/cadSandboxRunner.js`, `server/cadWorkerImport.js`, `server/cadMeshWorker.js` | Public-fixture and historical bounded-pilot evidence; not an authenticated user pipeline |
| Private IGES conversion | Historical sanitized single-file pilot report | One bounded operator result only; not current user-path, storage, download, or production readiness |
| Browser synthetic IGS journey | `utils/igsPrivatePipelineQualification.js`, `components/SyntheticIgsQualificationPanel.tsx` | Synthetic fixed-cube inspection only |
| Public/local IGS import and viewer | `utils/igsImportJourney.js`, `components/PublicIgsImportPanel.tsx`, `components/CadDesignReview.tsx`, `components/CadFixtureViewer.tsx` | Qualified for public/local fixtures and responsive review |
| Authenticated client upload | `utils/cadAuthenticatedImportQualification.js`, `components/AuthenticatedIgsQualificationPanel.tsx`, `components/CadWorkflow.tsx` | Localhost-only synthetic browser qualification; no upload, route, account, provider, or private-file authority |
| Original IGS and derived STL downloads | Synthetic byte-bound Blob controls in the Design review plus Package 3 parser/IDOR fixtures | Exact public/synthetic bytes qualified; fresh owner-authorized durable grants remain unrouted |
| Durable private object custody, deletion and backup disposition | `server/cadR2PrivateArtifactCustody.js`, Convex artifact/tombstone/grant/quota schema, focused offline tests | Qualified source-only R2 contract; provider/store runtime and resources remain absent |
| Synthetic private-path rollback/revocation/deletion controls | `server/cadPhase5SyntheticPrivatePathQualification.js`; exact project-owned fixture; existing internal durable adapters; focused offline tests | Source-only qualification; unmounted and zero dispatch |
| End-to-end authenticated proprietary or customer IGS to viewable model | No authorized input or mounted receipt exists | Unproven and disabled; outside Package 7 |

## Reusable source inventory

### Trust, session, and admission

- `server/uploadSession.js`: reusable verifier rules and safe failure projection.
- `server/uploadSessionStore.js`: issuer/store service shape and closed default.
- `server/convexUploadSessionStore.js`, `convex/cad.ts`, `convex/schema.ts`: candidate durable session and authority foundation.
- `server/cadUserUploadRouter.js`: correct pre-parser route location, CORS/no-store behavior, session-first ordering, and closed body gate.
- `server/cadUserUploadAdmission.js`, `utils/igesAdmission.js`: strict three-field JSON and shared IGES validation.
- `server/cadInternalProductionAdmissionSwitch.js`, `server/cadUploadAdmissionRuntimeBridge.js`, `server/cadLiveOpeningRuntimeMount.js`: reusable closed-by-default control surfaces.
- `server/cadProductionExecutionBinding.js` and related `cadProduction*`/`cadLiveOpening*` modules: exact-window, one-attempt, stop-on-unknown patterns. They need consolidation before runtime use.

### Conversion and geometry

- `server/cadWorkerContract.js`: current source, request, output, geometry, timeout, and concurrency limits.
- `server/cadSandboxExecutor.js`, `server/cadSandboxRunner.js`: bounded provider execution and cleanup circuit breaker.
- `server/cadWorkerImport.js`, `server/cadMeshWorker.js`: fixed guest conversion path and geometry validation.
- `utils/igesSourcePipeline.js`, `utils/igesRenderQuality.js`, `utils/igesGeneralizationGate.js`: reusable inspection and quality gates.

### Product surface

- `components/CadImportPanel.tsx`: existing Import journey and local selection/recovery UI.
- `utils/cadUserImportBridge.js`: file-format metadata and conservative client error mapping.
- `components/CadWorkflow.tsx`: Input, Inventory, Design, and locked Build progression.
- `components/CadDesignReview.tsx`, `components/CadFixtureViewer.tsx`, `components/CadReviewUI.tsx`: viewer, provenance, warnings, and download presentation.
- `components/PublicIgsImportPanel.tsx`, `utils/igsImportJourney.js`: qualified public-fixture flow that can supply UX patterns, not private-data transport.

### Evidence and QA

- `scripts/cad-user-upload-*.test.js`, `scripts/cad-upload-session.test.js`, `scripts/cad-sandbox.test.js`: reusable security and failure matrices.
- `scripts/igs-private-pipeline-qualification.test.js`, `scripts/iges-admission-parity.test.js`, `scripts/igs-import-journey.test.js`: shared admission, cleanup, and UX-state coverage.
- `scripts/cad-phase-progression-smoke.js`, `scripts/cad-review-polish-smoke.js`, `scripts/cad-phase-walkthrough.js`: responsive browser evidence and MP4 packaging patterns.
- `docs/qa/cad-phase-progression/` and `docs/qa/cad-user-import-bridge/`: prior privacy-safe visual baselines.

## Finite implementation sequence

### Work package 1 of 8: repair and freeze the evidence baseline

Result: complete. All five acceptance criteria passed. No Human QA applies.

Scope: carry forward the verified Phase 4 restricted-manifest receipt; repair stale source digests and regenerate the Convex contract manifest through the repository's checked-in generator; produce one source inventory and threat-model receipt bound to the implementation base commit.

Dependencies: a clean dependency installation for this exact checkout.

Acceptance criteria:

- The implementation lane rechecks the verified Phase 4 digest before edits and records only a public-safe receipt.
- The Phase 4 source binding remains the required base commit and its closed authority fields are not widened by inference.
- The integrated-readiness test and Convex manifest check pass with reviewed, current hashes.
- A leak scan finds no credentials, CAD bytes, private names, paths, or linkable private-file digests in tracked output.
- The Captain records the exact base commit and confirms all live switches remain closed.

Rollback: revert only the evidence-repair commit. No runtime behavior changes in this package.

Automated validation: stale-hash tests, contract-manifest generation/check, Convex source audit, codegen check, typecheck, focused CAD tests, `git diff --check`, and a changed-file secret/private-pattern scan.

Human QA: no. This package changes evidence and tests only.

### Work package 2 of 8: bind real authentication to CAD entitlement

Result: complete as a source-only, unrouted binding. All five acceptance criteria passed. No Human QA applies.

Scope: connect the existing verified login to server-issued upload sessions. Bind user, shop, current membership, CAD permission, transport, expiry, revocation, and session generation. Keep credential material server-side and store only digests. Define web cookie plus CSRF behavior; treat native bearer support as a separate reviewed transport if it is needed for Phase 5.

Likely files: `server/uploadSession.js`, `server/uploadSessionStore.js`, `server/convexUploadSessionStore.js`, `convex/auth.ts`, `convex/cad.ts`, `convex/schema.ts`, a narrowly scoped issuer route/module, and the current server bootstrap.

Resolved decisions: web-only transport; Convex Auth `authSessions` is the authoritative login; fresh user authority plus exact shop membership/CAD entitlement is authoritative for access; maximum lifetime is 15 minutes; every use re-reads authority and denies logout/deletion, expiry, disablement, mismatch, removal, generation change, or explicit revocation. The route, provider client, environment selector, default instance, and production issuer remain absent.

Acceptance criteria:

- Login issuance requires a currently authenticated principal; profile headers, account IDs, access passwords, operator tokens, and request bodies cannot establish identity.
- Revocation, expiry, membership removal, shop mismatch, permission removal, duplicate credentials, Origin failure, and CSRF failure deny access before body subscription.
- Every app instance reads current authoritative state; no stale positive authorization cache can admit a request.
- The raw upload credential appears only in the required secure `Set-Cookie` header. It does not appear in application payloads, logs, analytics, screenshots, or evidence; persistence receives only its digest.
- The default service and any missing configuration remain `AUTH_UNAVAILABLE`.

Rollback: revoke Phase 5 sessions, remove issuer routing from the deployment, restore the closed default service, and verify unauthenticated plus formerly valid sessions fail before body read.

Automated validation: extend session, issuer, route-ordering, cross-instance revocation, auth-bypass, timeout, cancellation, duplicate-header/cookie, and log-sentinel tests.

Human QA: no. Authentication plumbing is backend-only. A later client-visible sign-in or session-recovery change belongs in package 6.

### Work package 3 of 8: establish private artifact custody and deletion

Result: complete as a source-only, provider-disabled contract. All six acceptance criteria passed. No Human QA applies.

Scope: choose and implement private object custody for the original IGS, derived preview geometry, and derived STL. Store application metadata separately from bytes. Enforce per-owner access, encryption, region, content type, immutable object identity, retention, deletion, backup/log disposition, and restricted evidence handling.

Likely files: new server-only custody adapter and tests; `convex/schema.ts` and internal CAD functions for opaque artifact records, ownership, state, and tombstones; deployment configuration templates; no client SDK credentials.

Resolved decisions: Cloudflare R2 Standard in the `us` jurisdiction; originals retained for at most 24 hours; derived preview/STL retained for at most seven days; 15-minute application deletion SLA with a 24-hour lifecycle backstop; no versioning, provider access logging, custom-domain cache, replica, or customer-managed backup; metadata-only application logs for seven days; US$9 ceiling enforced through durable fixed resource quotas. The incident-owner role is defined, but the named human and backup remain activation prerequisites.

Acceptance criteria:

- Clients never receive provider credentials or raw object keys.
- Object keys are random and non-enumerable; metadata binds owner, shop, upload session, format, byte count, restricted digest, lifecycle state, and retention deadline.
- The original object is byte-for-byte retrievable by its owner while retained. Its digest stays in restricted evidence and is not copied into public artifacts.
- Short-lived download grants are issued only after server-side owner and state checks. Cross-user, cross-shop, expired, revoked, deleted, and guessed identifiers fail.
- Deletion covers original and derived objects, application rows, caches, temporary files, evidence copies, and the documented limits of provider backups/logs.
- Interrupted writes cannot leave an addressable partial object. Unknown outcomes quarantine the record and block conversion.

Rollback: stop new grants, revoke active download grants, quarantine incomplete records, delete only package-owned test objects under the reviewed selector, and retain tombstones/receipts needed to prevent replay.

Automated validation: adapter contract tests, IDOR matrix, signed-grant expiry, partial-write/cancellation tests, retention/deletion tests, restore/replay tests, log/evidence sentinel scans, and provider-emulator tests before any live resource exists.

Human QA: no. This is a security and data-governance gate.

### Work package 4 of 8: join admission, custody, and one-shot orchestration

Result: complete as a source-only, unmounted successor contract. All six acceptance criteria passed. No Human QA applies.

Scope: add a server-owned orchestration service behind a new immutable disabled default. After session and entitlement checks, stream the bounded request once, validate IGES, reserve quota and budget, write the original object, create an idempotent job, and stop before conversion unless a separately reviewed conversion authority is present.

Likely files: `server/cadUserUploadRouter.js`, `server/cadUserUploadAdmission.js`, `server/cadUploadAdmissionRuntimeBridge.js`, `server/cadInternalProductionAdmissionSwitch.js`, execution-binding modules, Convex job/attempt functions, and a new orchestration module.

Resolved source decisions: exact authentication and deployment/cohort evidence precede one durable idempotency claim; that claim reserves concurrency, attempt, quota, and budget before exactly one body read; custody precedes one artifact/job bind; conversion authority and dispatch remain zero; ambiguous claims/writes/commits are quarantined without retry or cap transfer; rollback closes admission first. The production Convex transaction adapter and independent reconciliation owner remain activation prerequisites.

Acceptance criteria:

- The route remains closed when any deployment, cohort, session, entitlement, quota, budget, retention, custody, or evidence binding is missing.
- Body access starts only after authentication and an exact one-use reservation.
- One idempotency key can produce at most one original artifact and one job. Automatic conversion retries are zero until retry semantics are separately qualified.
- Cancellation or an unknown write/commit outcome produces a durable quarantined state and no user-visible success.
- Admission produces sanitized receipts without filename, bytes, content, credential, private digest, provider error, or object key.
- Operator `/api/cad/import` behavior stays independent and unchanged.

Rollback: close the admission authority first, confirm pre-parser `USER_UPLOADS_DISABLED`, revoke the cohort/session generation, drain known jobs, quarantine unknown jobs, and delete only proven package-owned temporary objects.

Automated validation: route precedence, concurrency races, idempotency, quota and budget exhaustion, cancellation at each boundary, uncertain commit reconciliation, rollback ordering, and zero-dispatch assertions.

Human QA: no. The mounted client remains disabled in this package.

### Work package 5 of 8: connect bounded conversion and derived artifacts

Result: complete as a source-only, unmounted successor contract. The conversion state machine, geometry validation, deterministic preview/STL derivation, custody binding, cleanup-before-ready ordering, duplicate/restart fences, zero-retry failure matrix, privacy projection, and rollback order passed through fake durable/custody/sandbox ports. No mounted authenticated path, provider, live sandbox, real object write, download route, or runtime authority was exercised; those remain activation prerequisites.

Scope: allow one admitted job to invoke the existing sandboxed worker, validate geometry, persist a viewable preview artifact and STL, preserve the original, and publish a terminal job state. Keep network denied, persistence off, resources fixed, cleanup confirmed, and retry policy explicit.

Likely files: the new orchestrator, `server/cadSandboxExecutor.js`, `server/cadSandboxRunner.js`, `server/cadWorkerContract.js`, `server/cadWorkerImport.js`, `server/cadMeshWorker.js`, geometry-quality utilities, custody adapter, and Convex job transitions.

Dependencies: package 4, current provider runtime qualification for the exact commit, artifact formats for web/native viewing, failure taxonomy, enforceable cost ceiling, and private-data processor review.

Acceptance criteria:

- A checksum-pinned public fixture completes through the source-only review assembly before any proprietary input is considered. The mounted authenticated non-production path remains a required activation gate before any proprietary input.
- The job transition is monotonic: admitted, converting, ready or terminal failure/quarantine. Duplicate dispatch cannot create a second conversion or overwrite a ready artifact.
- The derived preview passes finite-coordinate, bounds, mesh, vertex, triangle, output-size, source-binding, and render-quality checks.
- The STL is generated from the same accepted conversion output and carries units plus a non-manufacturing warning.
- Success is impossible until sandbox stop is confirmed and original, preview, and STL artifact records are durably bound.
- Timeout, out-of-memory, malformed geometry, cleanup uncertainty, and provider ambiguity stop without automatic retry or a partial ready state.

Rollback: close conversion authority while leaving upload admission closed, stop known sandbox instances, quarantine uncertain jobs, revoke derived grants, and retain the original only according to the approved retention policy.

Automated validation: fake-provider matrix, public-fixture source-only integration, crash/timeout/OOM/late-create/cleanup tests, duplicate-dispatch races, geometry and STL equivalence, source-to-derived binding, artifact access, cost-meter assertions, restart/replay, rollback, privacy scanning, and zero-runtime-dispatch assertions.

Human QA: no for backend execution. Visual behavior is reviewed in package 6.

### Work package 6 of 8: complete the authenticated Import-to-Design journey

Result: complete within the source-only scope, including client-facing Human QA approved in this thread on 2026-10-10. The exact localhost-only synthetic route preserves two visibly exclusive `.igs`/`.iges` choices, automatic single-attempt progression, truthful uploading/processing/ready states, reload continuity, closed safe-failure and unknown-outcome recovery, interactive orbit/move review, a compact original/STL menu, and deletion/revocation. The public/generated artifacts match their fixed SHA-256 values. Signed-out, wrong-owner, stale, deleted, and malformed artifact fixtures return one generic denial with no metadata. No production route, session issuer, body admission, provider, custody, conversion, or download grant was mounted or called.

Scope: extend the existing Import journey so an authenticated user can select one `.igs`/`.iges` file, see a clear privacy/retention summary, upload once, watch bounded status, recover from safe failures, open the resulting model in Design, and download the original IGS or derived STL. Preserve exclusive sample/file choices, automatic progression, compact phase cues, and the shared switchable orbit/move control.

Likely files: `components/CadImportPanel.tsx`, `components/CadWorkflow.tsx`, `components/CadDesignReview.tsx`, `components/CadFixtureViewer.tsx`, `components/CadReviewUI.tsx`, `utils/cadUserImportBridge.js` plus types, and new status/artifact client adapters. Reuse public/synthetic panels only for presentation patterns.

Dependencies: packages 2-5, reviewed user-facing retention copy, accessible progress states, exact API success/error contract, and download grant endpoints.

Acceptance criteria:

- Sample and file are visibly exclusive; selecting a file does not require redundant progression clicks.
- Status survives reload and never invents progress. Unknown state tells the user what happened, blocks resubmission, and offers the reviewed recovery action.
- The viewer loads only an owner-authorized derived artifact. Original and STL downloads return the correct file, name, media type, and bytes through fresh short-lived grants.
- Cross-account URLs, stale grants, deleted artifacts, and signed-out sessions reveal no metadata.
- Upload, cancel, retry eligibility, deletion, and download actions are accessible and explain their effect. No action silently does nothing.
- Mobile (320/390), tablet (768), mid-width (855), and desktop (1440) views have no horizontal overflow, clipped controls, phase-rail regression, or viewer/navigation collision.

Rollback: hide the private-file action behind the closed server capability, retain the qualified public sample path, invalidate client caches/grants, and verify the app returns to metadata-only preparation without losing unrelated workflow state.

Automated validation: client adapter tests, state-machine tests, accessibility preflight, offline web export, browser interaction suite, download byte/hash assertions using public fixtures, auth/IDOR UI fixtures, reload/history tests, and responsive screenshot comparison.

Human QA: yes. Before asking for approval, create and inspect a privacy-safe MP4 of the exact authenticated test route using a public or generated synthetic fixture. Show selection, upload, progress, ready viewer, orbit/move, original download, STL download, failure recovery, deletion/revocation state, and mobile plus desktop layouts. The MP4 must contain no credentials, private CAD, private names, raw URLs with grants, account identifiers, or provider consoles. Attach the playable MP4 directly in the Codex thread and offer the exact route only as optional hands-on follow-up.

### Work package 7 of 8: qualify the synthetic private-path controls

Result: complete within the source-only, deterministic qualification scope. No proprietary or customer file was permitted. The exact gate is `docs/cad-phase5-package7-synthetic-private-path-authorization-gate.md`.

Scope: generate one immutable ReversR-owned synthetic `.igs` payload, classify it `RESTRICTED_SYNTHETIC_TEST`, and exercise the private-path control lifecycle against offline durable test doubles. The fixture is checked-in test material with fixed bytes and digest; treating it as private-path input tests control semantics without claiming that it is confidential or customer-owned.

Dependencies: packages 1-6; the existing internal Package 7 durable adapters; the exact synthetic fixture manifest; one injected exact-session revoker; read-only reconciliation; deterministic tombstones; and all route/provider/runtime flags fixed false.

Fixed limits: one synthetic session, one file, one attempt, zero retries, one independent digest-only qualification-intent commitment, one durable closed-state fence, and an enforceable all-in ceiling of US$9 (`9000000` micros).

Acceptance criteria:

- An independent qualification ledger atomically consumes a sanitized run/protocol/target/owner commitment before fixture validation or application/durable-adapter activity and refuses replay across fresh controller instances.
- Exact descriptor shape, byte count, SHA-256, project ownership, nonproprietary status, no-customer-data status, and private-path classification are validated before any application/durable-adapter or session mutation.
- Authority-before-body ordering remains intact because this source-only qualification never admits or reads a request body.
- Intent-ledger replay blocks restart or a second attempt even if initial read-only reconciliation failed before a durable closed control existed; read-only reconciliation additionally detects an already-closed application control.
- The first state-changing action closes admission and conversion, revokes exact-session grants, and quarantines uncertain attempts, jobs, and artifacts.
- An injected exact-session revoker confirms only the bound synthetic upload session. Another owner, shop, session, grant, and artifact remain unchanged.
- Only the three exact synthetic artifact records enter deleting state; confirmed tombstones and a zero-byte/zero-object quota ledger are reconciled read-only.
- Any rollback, session-revocation, quarantine, grant, deletion, or reconciliation ambiguity returns one sanitized unknown result and stops without retry.
- Route mounting, session issuance, request-body admission, provider/storage/conversion dispatch, downloads, deployment, and Package 8 authority remain false.

Rollback: rollback is the qualification. Consume the independent one-use intent first; then close admission and conversion as the first application mutation, revoke the exact synthetic session and grants, quarantine uncertainty, delete only the exact synthetic artifact records, and reconcile control and tombstones read-only. The intent ledger prevents a second run even when application-state reconciliation is unavailable. No human backup operator is required for this exact offline synthetic qualification; this exception cannot be reused for proprietary data, customer data, providers, or deployment.

Automated validation: deterministic fixture bytes/digest and shared IGES admission; descriptor drift; independent intent consumption and duplicate rejection; fresh-process restart after success and after initial reconciliation failure; close-first application mutation ordering; exact-session and grant revocation; owner/shop/session isolation; attempt/job/artifact quarantine; confirmed deletion and quota release; read-only reconciliation; ambiguity/no-retry handling; static runtime isolation; existing public-fixture and durable-adapter regressions; typecheck; local deterministic Convex checks; privacy/source audit; and `git diff --check`.

Human QA: no. This package changes source-only backend/test controls and planning documents, with no visible or interactive client behavior.

Success does not prove proprietary-file ownership or consent, customer-data handling, provider custody, real conversion/downloads, deployment binding, production readiness, general availability, or commercial readiness. It does not authorize Package 8.

### Work package 8 of 8: staged release, rollback drill, and production proof

Scope: merge reviewed packages in dependency order, deploy with all authorities closed, verify fail-closed behavior on the exact deployment, then open only a separately approved internal cohort/window. The Package 7 synthetic result supplies no deployment, provider, proprietary-file, or customer-data authority. Close the window, revoke sessions/grants, and prove rollback.

Dependencies: green source-only packages 1-7, reviewed PRs, exact deployment metadata, release owner, rollback owner, monitoring, incident path, enforceable spend/usage limits, and new explicit Package 8 activation authority.

Acceptance criteria:

- The deployment is cryptographically tied to the reviewed merge commit.
- Before opening and after closing, unauthenticated and formerly valid requests fail before body read; disabled admission causes zero storage and conversion calls.
- The approved internal public-fixture smoke reaches the viewable model and both downloads once, with owner isolation intact.
- Monitoring contains no sensitive fields and alerts on auth denial spikes, quota/budget threshold, stuck jobs, cleanup ambiguity, storage lifecycle failure, and cross-owner access attempts.
- Rollback closes new admission first and is complete only after session/grant revocation, job reconciliation, compute cleanup, and the exact post-rollback smoke pass.
- Production remains unavailable outside the named cohort and window. General or commercial availability needs a later roadmap.

Rollback: execute the rehearsed close-first sequence, preserve restrictive state and evidence, revert the release only after admission is closed, and verify the prior public/local fixture journey still works.

Automated validation: full focused suite, typecheck, accessibility, build/export, exact-deployment API smoke, public fixture end-to-end, monitoring assertions, rollback drill, post-rollback fail-closed smoke, leak scan, and `git diff --check`.

Human QA: yes for any released client-facing behavior. Attach a fresh privacy-safe MP4 from the exact deployment and route after the rollout and rollback drill. Keep the implementation lane open until Vambah approves that artifact.

## Decision gates

Resolved for Packages 2-7: web-only authentication; Convex Auth exact-session authority; current user/shop entitlement; 15-minute session maximum; fresh-read revocation; Cloudflare R2 Standard in the US jurisdiction; bounded retention/deletion/log policy; a fixed US$9 quota ceiling; authority-before-body ordering; one durable idempotency fence; one artifact/job maximum; monotonic admitted/converting/ready-or-terminal state; deterministic source-bound preview and STL; cleanup before ready; quarantine on ambiguity; zero retries; rollback-first closure; a localhost-only synthetic client qualification that cannot reach the server boundary; and one source-only synthetic private-path control qualification with automated exact-session revocation, read-only reconciliation, and confirmed deletion. Source-only completion does not authorize routing, provider access, body admission, storage, conversion, grant issuance, proprietary/customer CAD, deployment, or production issuance.

1. The human backup-operator prerequisite is removed only for Package 7's offline project-owned synthetic fixture because close-first rollback, exact-session/grant revocation, quarantine, reconciliation, and deletion are automated and fail closed. Live or customer-data work still requires separately named operational owners.
2. Bind and qualify the durable Package 4 Convex transaction adapter plus independent reconciliation owner before any mounting.
3. Approve the Package 5 conversion state machine, exact runtime, resource/cost limits, and private-data processor boundary.
4. Keep the public-fixture and synthetic private-path runners separate; neither may widen the other's classification or input manifest.
5. Treat any proprietary-file or customer-data proposal as a new authorization outside Package 7, with explicit ownership, consent, restricted evidence, retention, incident, and deletion controls.
6. Separately authorize Package 8, deployment, and any timed internal activation. Passing Package 7 does not authorize Package 8, general availability, or commercial availability.

## Validation performed for this plan

- Git: exact required base commit on `codex/cad-phase5-private-igs-activation-plan`; `main` and `origin/main` remained at the same base during Package 1.
- Phase 4 provenance: the intentionally untracked restricted manifest was found at the Captain-provided local location, mode `0600`, and its fresh SHA-256 exactly matched `255e8320b9cf840ee151418a90c15e63873272aa2cc6f726586d5a503f21c8aa`. Its schema, restored commit, closed authority fields, terminal readback, zero-mutation/no-retry operation counts, and post-expiry session disposition were reviewed without copying restricted digests or identities into Git.
- Focused tests: 73 passed and 0 failed across controlled-upload qualification, integrated readiness, upload session, route, admission, sandbox, IGES parity, private synthetic pipeline, and import journey.
- Dependency custody: no network install ran. An ignored local `node_modules` symlink points to an existing ReversR cache with the identical package-lock SHA-256; `npm ls --depth=0 --omit=optional` passed.
- Convex: source audit passed across 640 files with zero leak-pattern matches; local SDK/codegen check verified five files with no deployment access.
- Convex contract manifest: regenerated with checked-in tooling and verified across 750 files.
- Typecheck: passed with no diagnostics.
- Package 1 receipt: `docs/cad-phase5-package1-source-inventory-threat-model-receipt.md`, SHA-256 `db4e619e78d4768c6de3bfbe3d6e7c90d33121b139b75ff8ddf7ed54aa9241a4`.
- Package 2 focused authentication/session suite: 65 passed and 0 failed.
- Combined Package 1-2 focused CAD suite: 128 passed and 0 failed.
- Package 2 source binding: web-only secure cookie, exact Convex Auth login, fresh user/shop entitlement, 15-minute maximum lifetime, no positive cache, and immediate denial after authority loss. Issuance is unrouted.
- Current-source acceptance packet was regenerated after the session-store cancellation change and verified with all authority flags still false; packet SHA-256 `11b91da5985a84fdf64341a83c3ac00db0dbbbd75b0d8c9f21bd06189c934106`.
- Package 2 receipt: `docs/cad-phase5-package2-auth-session-binding-receipt.md`, SHA-256 `0327536f5a93a55686312489aa61e3ab2b67096eb3bb19e349d5aae479c7456b`.
- Package 3 selected Cloudflare R2 Standard in the US jurisdiction and bound private/no-cache/no-versioning custody, 24-hour original retention, seven-day derived retention, a 15-minute application deletion SLA, 24-hour lifecycle backstop, opaque 60-second download grants, and fixed source quotas below US$9. The durable quota ledger explicitly persists stored-byte, object, Class A, Class B, and delete-operation counters.
- Package 3 custody plus current Convex schema/auth assembly: 27 passed and 0 failed.
- Combined Package 1-3 focused CAD suite: 151 passed and 0 failed.
- Convex contract manifest: regenerated and verified across 765 files after the Package 3/5 binding repair.
- Package 3 receipt: `docs/cad-phase5-package3-private-custody-receipt.md`, SHA-256 `c97ee229e2d67448a0ad8544d3bcf1c8daa409dda0cfcff7095aaa1a43b2b9a0`.
- Package 4 focused orchestration, custody, schema, and auth suite: 38 passed and 0 failed.
- Combined Package 1-4 focused CAD suite: 162 passed and 0 failed.
- Convex contract manifest: regenerated and verified across 765 files after the Package 3/5 binding repair.
- Package 4 source contract preserves authentication/evidence/claim before one body read, one idempotency key to one artifact/job, durable quarantine, zero retries, and zero conversion dispatch.
- Package 4 receipt: `docs/cad-phase5-package4-one-shot-orchestration-receipt.md`, SHA-256 `a8373caa31a71b43dc396b787a26317cd360c91ba626c2104f6f2851b434f4c9`.
- Package 5 focused fake-port/state-machine suite plus actual Package 3 custody integration: 36 passed and 0 failed.
- Combined Package 1-5 focused CAD suite: 197 passed and 0 failed.
- Convex contract manifest: regenerated and verified across 765 files after Package 5.
- Package 5 source contract preserves one conversion claim, deterministic source-bound preview/STL derivation, cleanup-before-ready, terminal quarantine on every uncertain outcome, zero retries, and zero runtime conversion dispatch.
- Package 3/5 integration uses the shared `preview-geometry` kind; both derived records require and retain the original artifact identifier, restricted source digest, geometry digest, millimeter units, and fixed ASCII inspection warning. The actual Package 3 adapter completed both fake-port commits and denied cross-owner access.
- Package 5 receipt: `docs/cad-phase5-package5-derived-artifact-orchestration-receipt.md`, SHA-256 `66a94f7edb78b257e38681323101b6dd134849b94e55b55fa955e03e8f83e8e2`.
- Package 6 focused client adapter and security-boundary suite: 10 passed and 0 failed.
- Combined Package 1-6 focused CAD suite: 207 passed and 0 failed.
- Package 6 browser QA passed the exact final-source exported localhost route at 320, 390, 768, 855, and 1440 pixels with no horizontal overflow and zero external, API, or write requests. Desktop and mobile covered exclusive source choice, automatic progress, reload continuity, shared orbit/move controls, exact-byte original/STL downloads, recovery, and deletion/revocation. Every width explicitly confirmed that implementation-readiness and roadmap controls/explainers are absent from authenticated Design.
- Package 6 privacy-safe MP4: regenerated from the final exported source; H.264/yuv420p, 1280×800, 25 fps, 16.32 seconds, playable and visually sampled; SHA-256 `b6eb9787fef8dbe91d191fdd4468a0bcd1096ec2f44535e270f4679fd7d848e9`.
- Convex contract manifest: version 80 regenerated and verified across 777 files after Package 6.
- Package 6 Human QA: approved in this thread on 2026-10-10 through Vambah's `proceed`, interpreted by the Captain as approval of the final privacy-safe MP4 only.
- Package 6 receipt: `docs/cad-phase5-package6-authenticated-import-client-receipt.md`, refreshed SHA-256 `f16d335c9d095e2a9ca393283fc41b4b6fa978d5b041d2457411c55aa96b52a7`.
- Package 7 revised gate: `docs/cad-phase5-package7-synthetic-private-path-authorization-gate.md`, SHA-256 `8e119efa39024343e3b0591d4a693e99caafd6d5a1101dc005cb82c31931b2ed`; source-only synthetic private-path controls only, with no runtime activation or Package 8 authority.
- Package 7 focused and relevant regression suite: 105 passed, 0 failed. It covered exact fixture bytes/digest and shared IGES admission, drift rejection before application/session mutation, independent intent consumption, duplicate use, process restart, restart after initial reconciliation failure, close-first application mutation ordering, exact-session/grant revocation, owner/shop/session isolation, attempt/job/artifact quarantine, confirmed deletion, quota release, durable reconciliation, ambiguity/no-retry behavior, public-fixture separation, custody, orchestration, conversion, authentication, and static runtime isolation.
- Package 7 TypeScript check passed with no diagnostics. Deterministic local Convex SDK/codegen verified five files with no deployment access.
- Convex contract manifest version 82 regenerated and verified across 784 files. The privacy/source audit passed across 648 files with zero leak-pattern matches and preserved internal-only/runtime-isolation checks.
- `git diff --check` passed. No network, provider, credential, configuration, request body, live session, storage, conversion, deployment, payment, external message, Package 8 action, commit, or push occurred.
- No live request, body admission, provider call, storage write, conversion, deployment, private CAD access, credential read, external message, commit, push, or PR occurred.

## Captain handoff

Phase 5 has completed 7 of 8 finite work packages within their source-only scopes, with one package remaining. Packages 1-5 meet their source-only acceptance criteria, Package 6 has passed its automated, browser, and Human QA gates, and Package 7 has passed its project-owned synthetic private-path control qualification. The source contains an unrouted exact-login web session binding, disabled private-artifact custody, durable admission and conversion state models, deterministic source-bound preview/STL derivation, the localhost-only synthetic authenticated Import-to-Design journey, and automated close-first/revoke/quarantine/reconcile/delete controls. Mounted production issuance, provider-backed storage or conversion, routed owner-authorized downloads, proprietary/customer-data evidence, deployment proof, and Package 8 authority are still missing.

The current gate is source-only completion of `docs/cad-phase5-package8-release-readiness.json`. It binds the exact merged source, production deployment and fail-closed smoke while listing every unresolved operational, provider, runtime, monitoring, evidence, cost and UTC-window value. The next gate is read-only binding completion; it is not activation authority. Keep `BODY_ADMISSION_AUTHORIZED = false`, keep `CAD_USER_IMPORT_ENABLED = false`, and keep session issuance, provider dispatch, downloads, orchestration, conversion, and Package 8 unrouted.
