# CAD Phase 5 Package 1 source inventory and threat-model receipt

Status: `PACKAGE_1_VALIDATED_SOURCE_ONLY`

Date: 2026-10-10

Branch: `codex/cad-phase5-private-igs-activation-plan`

Base commit: `a30c11cb56dba945b8d59d06787fa99b7ead4a03`

## Scope and authority

This receipt covers evidence repair, source inventory, threat modeling, and offline validation only. It does not authorize authentication issuance, request-body admission, storage, conversion, Sandbox or provider access, configuration changes, deployment, private CAD, commits, pushes, pull requests, payments, or external messages.

The production route remains closed at the source literal `const BODY_ADMISSION_AUTHORIZED = false;`. The client projection remains `CAD_USER_IMPORT_ENABLED = false`. The Convex contract manifest still records `productionWiring: false` and `liveQualification: false`.

## Provenance bindings

| Binding | Verified result |
| --- | --- |
| Required base | `a30c11cb56dba945b8d59d06787fa99b7ead4a03` |
| Phase 4 restricted manifest | SHA-256 `255e8320b9cf840ee151418a90c15e63873272aa2cc6f726586d5a503f21c8aa`, mode `0600` |
| Phase 4 classification | `PHASE4_DEVELOPMENT_QUALIFICATION_CLOSED` |
| Phase 4 authority | Zero body reads and storage writes; upload admission, conversion, Sandbox, and production changes closed |
| Production router | SHA-256 `505edcadacc870be65d9ef7db72bfdcc3eeb9fa72b4802c225a163b1532dee7d` |
| Package lock | SHA-256 `b7c5ea88f5feba3391ca8092356fe443b1a8b2d7656431d6a674f7d39cba3fb7` |

The restricted manifest stayed outside Git. No restricted digest other than the approved manifest binding, no identity, and no private CAD metadata was copied into this receipt.

## Package 1 changes

The stale integrated-readiness router digest was replaced with the current router digest in both the executable inspector and its evidence JSON. No runtime route or gate changed.

The checked-in Convex manifest generator refreshed four integrity entries:

- `offline/cad-convex/integratedUploadConversionReadiness.js` after the approved digest repair;
- `offline/cad-convex/integratedUploadConversionReadiness.json` after the same repair;
- `package.json`, whose current bytes predated this package;
- `convex/_generated/api.d.ts`, whose current bytes predated this package.

The last two updates reconcile the manifest with the clean base tree. They do not modify either source file.

Refreshed evidence hashes:

| Artifact | SHA-256 |
| --- | --- |
| `offline/cad-convex/integratedUploadConversionReadiness.js` | `749713eeb5c4be721ffbb3c37a34fa3bc2ece2d18eb5779338c7306e73964f84` |
| `offline/cad-convex/integratedUploadConversionReadiness.json` | `755a92b2c5bb9f3fca915553c915be3d8a6ec15000d60ee0b118883c334a48ca` |
| `offline/cad-convex/manifest.json` | `f6a967f9e354f675bc3c6e786b6bac00bc8749fea1aaf1092c92ccf6d96ccf1c` |

## Source inventory

| Boundary | Reusable source | Current Package 1 conclusion |
| --- | --- | --- |
| Session verification | `server/uploadSession.js`, `server/uploadSessionStore.js`, `server/convexUploadSessionStore.js` | Contract and closed default exist; production issuer/store binding remains Package 2 work |
| User upload route | `server/cadUserUploadRouter.js` | Mounted before body parsers; session-first; body admission remains source-closed |
| IGES admission | `server/cadUserUploadAdmission.js`, `utils/igesAdmission.js`, `server/cadWorkerContract.js` | Shared bounded validation passes offline; no production body authority |
| Admission control | `server/cadInternalProductionAdmissionSwitch.js`, `server/cadUploadAdmissionRuntimeBridge.js`, live-opening modules | Closed-by-default control surfaces; no Package 1 activation |
| Execution binding | `server/cadProductionExecutionBinding.js` and related production-binding modules | Exact-window and stop-on-unknown patterns are reusable; installable live binding remains unproven |
| Durable metadata | `convex/cad.ts`, `convex/schema.ts`, controlled-upload modules | Synthetic qualification and authority records exist; no private object custody path |
| Conversion boundary | `server/cadSandboxExecutor.js`, `server/cadSandboxRunner.js`, `server/cadWorkerImport.js`, `server/cadMeshWorker.js` | Public-fixture isolation tests pass; no authenticated private-file pipeline |
| Product journey | `components/CadImportPanel.tsx`, `components/CadWorkflow.tsx`, `components/CadDesignReview.tsx`, `components/CadFixtureViewer.tsx` | Public/synthetic review shell is reusable; authenticated upload success remains absent |
| Client adapters | `utils/cadUserImportBridge.js`, `utils/igsImportJourney.js`, `utils/igsPrivatePipelineQualification.js` | Metadata preparation and fixture paths remain disabled or synthetic |
| Evidence and QA | focused CAD tests and `docs/qa/cad-*` artifacts | Security, failure, responsive, and MP4 patterns are reusable; live readiness is not inferred |

## Threat model

| Threat | Current control verified in Package 1 | Required later gate |
| --- | --- | --- |
| Identity spoofing through profile, account, password, or operator headers | Route/session tests reject these paths before body access | Package 2 must bind the real login issuer, membership, entitlement, expiry, and revocation |
| Body read before authentication | Route-order and admission tests pass; production gate remains false | Package 4 must preserve ordering through mounted orchestration |
| Cross-user or cross-shop artifact access | No private artifact path exists, so no claim is made | Package 3 must add owner-bound records and Package 6 must test IDOR denial |
| Credential or CAD leakage in logs and evidence | Source audit reports zero leak-pattern matches; focused tests assert sanitized errors | Later packages must add sentinels across storage, provider, analytics, crash, screenshot, and MP4 paths |
| Malicious or malformed IGES | Shared extension, size, ASCII, section, directory-pair, and external-reference checks pass | Package 5 must retain the sandbox and geometry limits for mounted jobs |
| Resource exhaustion | Request, source, output, geometry, timeout, and single-instance concurrency bounds exist | Packages 3-5 need durable cross-instance quota, storage, and cost enforcement |
| Duplicate execution or unsafe retry | Qualification tests preserve one-use, spent, and no-retry behavior | Package 4 must make idempotency and unknown-outcome quarantine durable across instances |
| Unknown provider or cleanup outcome | Sandbox tests trip the cleanup circuit breaker and suppress success | Package 5 must bind job state and artifact readiness to confirmed cleanup |
| Sandbox network or persistence escape | Fake-provider contract requires denied networking, fixed assets, and no persistent snapshot | Package 5 needs exact-runtime provider evidence before any private data |
| Stale evidence authorizing newer source | Current router hash is now bound in executable and JSON evidence; manifest check passes | Every later lane must rebind exact commits and reject stale digests |
| Retention or deletion gaps | No private storage exists and no retention claim is made | Package 3 must define original, derived, temporary, log, evidence, and backup disposition |
| Unsafe download grants | Fixture downloads do not prove private authorization | Packages 3 and 6 must add short-lived owner-checked grants and byte/hash tests |
| Rollback that leaves admission or jobs open | Current production body gate is false and synthetic controls fail closed | Packages 4 and 8 must prove close-first rollback, revocation, reconciliation, and post-rollback smoke |

## Dependency custody

No network installation ran. `node_modules` is an ignored local symlink to an existing ReversR cache whose `package-lock.json` SHA-256 exactly matches this checkout. `npm ls --depth=0 --omit=optional` passed with all declared top-level packages present, including the three development packages missing from the first candidate cache.

The symlink is local execution support, not a tracked project change or production configuration.

## Validation receipt

Passed commands:

```sh
node --test scripts/cad-controlled-upload-development-qualification.test.js scripts/cad-integrated-upload-conversion-readiness.test.js scripts/igs-private-pipeline-qualification.test.js scripts/iges-admission-parity.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-upload-admission.test.js scripts/cad-upload-session.test.js scripts/cad-sandbox.test.js scripts/igs-import-journey.test.js
npm run typecheck -- --pretty false
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm ls --depth=0 --omit=optional
```

Results:

- Focused CAD tests: 73 passed, 0 failed.
- TypeScript: passed with no diagnostics.
- Convex contract manifest: 750 files verified.
- Convex source audit: 640 files, zero leak-pattern matches; internal-only and runtime-isolation checks passed.
- Convex local SDK/codegen: five files verified with no deployment access.
- Dependency inventory: passed against the exact lockfile.

Final changed-file privacy scan and whitespace/diff checks are recorded in the Phase 5 plan closeout for this package.

## Acceptance disposition

Package 1 meets its five acceptance criteria:

1. The implementation lane rechecked the Phase 4 digest before edits and copied no restricted content into Git.
2. The required base commit and every closed authority remain unchanged.
3. The integrated-readiness test and generated Convex manifest now pass with current hashes.
4. Source and changed-file privacy scans report no credential, CAD-byte, private identity, absolute private path, or linkable private-file digest exposure.
5. The branch/base are recorded and the production route, client import projection, production wiring, and live qualification remain closed.

No Human QA applies because Package 1 changes evidence and tests only.

## Package 2 gate

Package 2 may begin only as a separate reviewed lane for production identity and CAD entitlement binding. Before implementation, the Captain must decide web-only versus web-and-native transport, name the authoritative login/membership source and issuer owner, define session lifetime and revocation semantics, and preserve the closed upload body gate. Package 2 does not authorize request-body admission, private storage, conversion, deployment, or private CAD.
