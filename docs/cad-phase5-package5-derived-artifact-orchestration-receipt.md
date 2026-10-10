# Phase 5 Package 5 disabled conversion and derived-artifact receipt

Status: validated source-only; upload admission, conversion runtime dispatch, provider dispatch, downloads, routing, deployment, and all live capability remain disabled.

Base commit: `a30c11cb56dba945b8d59d06787fa99b7ead4a03`

Parent bindings:

- Package 4 receipt SHA-256: `a8373caa31a71b43dc396b787a26317cd360c91ba626c2104f6f2851b434f4c9`
- Entry Phase 5 plan SHA-256: `d78c9a024f06ca495482f7bbce76926a684e5caf9e70cd89cece421acd3b8934`

## Source result

`server/cadPhase5DerivedArtifactOrchestrator.js` adds an unmounted, closed-by-default successor contract. It accepts only an opaque Package 4 job identifier and injected durable job, custody, and qualified sandbox ports. It imports no route, provider SDK, credential reader, environment selector, runtime bootstrap, or application server.

The durable transition is monotonic: `admitted` to `converting`, then `ready` or terminal `quarantined`/`failed`. One serialized conversion claim increments a generation and claim count while the production conversion authorization and dispatch count stay false and zero. Duplicate, concurrent, restarted, or replayed calls cannot dispatch a second synthetic conversion, create another derived pair, or overwrite a ready job. Automatic retries are zero.

The source-only review assembly fixes network denial, persistence off, one concurrent conversion, a five-second worker limit, bounded coordinates, the existing mesh/vertex/triangle limits, a one MiB limit for each derived output, and a US$1 conversion reservation within the existing US$9 ceiling. These are contract inputs for a future durable runtime adapter; no live compute or cost was incurred.

## Geometry and artifact binding

The adapter rejects empty or malformed meshes, non-finite coordinates, indices outside their mesh, excessive coordinates, mesh/vertex/triangle overflow, output overflow, unexpected result fields, wrong units, and any mismatch from the original restricted source digest. Accepted geometry is normalized once. A deterministic JSON preview and deterministic ASCII STL are generated from that exact normalized geometry.

Both `preview-geometry` and `derived-stl` records bind the original artifact identifier, restricted source digest, normalized geometry digest, millimeter units, exact byte count, exact derived digest, and the warning `Inspection geometry only - not validated for manufacturing.` Package 3 requires and durably retains those fields through exact reserve and record variants; original IGS records reject them. The STL solid name independently carries millimeter, inspection-only, and not-for-manufacturing markers. The original artifact is never overwritten.

Ready is committed only after the sandbox reports stopped and cleanup confirmed, both derived reservations and exact-byte custody commits succeed, and one generation-fenced durable ready bind acknowledges success. The public result contains only opaque job and artifact identifiers plus fixed status fields.

## Failure, privacy, and rollback

Sandbox crash, timeout, cancellation, out-of-memory, late creation, malformed geometry, cleanup uncertainty, source mismatch, custody reservation or commit ambiguity, lost claim acknowledgement, and lost ready acknowledgement all deny success and quarantine without retry. A lost claim acknowledgement is reconciled by job identifier with a fresh bounded signal. Partial derived objects remain unbound and inaccessible pending independent incident reconciliation; no partial state can become ready.

Owner, shop, and upload-session bindings are copied exactly to both derived reservations. Cross-owner or cross-shop access remains denied by the Package 3 custody boundary. Tests scan public results and event evidence for owner identifiers, restricted digests, geometry arrays, bytes, and provider detail.

Rollback closes conversion authority first, then stops known sandboxes, then quarantines uncertain jobs. Upload admission remains closed throughout.

The adapter exposes `configured: false`, `routeMounted: false`, `bodyAdmissionAuthorized: false`, `providerDispatchEnabled: false`, `runtimeConversionDispatchEnabled: false`, `downloadsRouted: false`, and `maxRetries: 0`, including when every dependency is injected by tests. `BODY_ADMISSION_AUTHORIZED` and `CAD_USER_IMPORT_ENABLED` remain false. No runtime source imports this adapter.

No network or browser request, credential read, provider or application configuration change, private CAD access, live sandbox, real storage write, deployment, payment, external message, commit, push, or pull request occurred.

## Validation results

- Package 5 focused fake-port/state-machine suite plus actual Package 3 custody integration: 36 passed, 0 failed.
- Combined Package 1-5 focused CAD suite: 197 passed, 0 failed.
- TypeScript: passed with no diagnostics.
- Convex local SDK/codegen: five files verified with no deployment access.
- Convex contract manifest: regenerated and verified across 765 files.
- Convex source audit: 640 files, zero leak-pattern matches; internal-only and runtime-isolation checks passed.
- Changed-file privacy scan and `git diff --check`: passed.

## Remaining activation prerequisites

This receipt qualifies only the source contract and fake-port review assembly. Before any mount or real conversion, the Captain must bind and qualify the durable Convex job-transition adapter, independent reconciliation owner, exact current sandbox runtime/commit and private-data processor terms, Package 3 private R2 resources and incident owners, enforceable cost meter, artifact read/download grants, and exact deployment/cohort evidence. A checksum-pinned public fixture must then pass through the mounted authenticated non-production path. Package 5 grants no upload, provider, sandbox, conversion, download, private-data, deployment, or production authority.

Package 6 may use this source model to build the still-disabled authenticated Import-to-Design client contract. Client Human QA remains pending until Package 6 supplies a playable privacy-safe MP4 from the exact public/synthetic route.
