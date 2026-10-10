# Phase 5 Package 6 authenticated Import-to-Design client receipt

Status: source implementation, automated/browser qualification, and client-facing Human QA passed. Vambah's `proceed`, interpreted by the Captain in this thread on 2026-10-10, approves only the reviewed Package 6 privacy-safe walkthrough. All production upload, body admission, session issuance, provider, custody, conversion, grant, private-CAD, deployment, and release capability remains disabled and unrouted.

Base commit: `a30c11cb56dba945b8d59d06787fa99b7ead4a03`

Parent bindings:

- Package 5 receipt SHA-256: `66a94f7edb78b257e38681323101b6dd134849b94e55b55fa955e03e8f83e8e2`
- Incoming Phase 5 plan SHA-256: `3c9180c7cf798cf55c15d62095b095e70b4bb72c93b856bbee7e1cc5f6d9cf8c`

## Source result

`utils/cadAuthenticatedImportQualification.js` defines a browser-only synthetic qualification adapter. It activates only on localhost with the exact `authenticated-import-v1` qualification and synthetic-auth query values. Account, artifact, grant, owner, shop, token, or user query keys close the mode. The adapter exposes every runtime authority flag as false and has no transport, route, server, provider, environment, storage, conversion, or download-grant import.

The client allows one visibly exclusive generated `.igs` or included `.iges` choice. Selection begins the one-attempt local check automatically. The durable allowlisted state machine moves through selected, uploading, processing, and ready without inventing provider progress. Reload restores a ready result; corrupt or in-flight persisted state becomes unknown with zero retry. Safe failure returns to source selection. Unknown state blocks resubmission until the local record is revoked. Deletion removes artifact availability and returns one metadata-free deleted state.

`components/CadWorkflow.tsx` integrates that adapter into the existing Input and Design phases. `components/AuthenticatedIgsQualificationPanel.tsx` supplies accessible selection, progress, recovery, revocation, and restart actions. `components/CadDesignReview.tsx` reuses the shared viewer, exposes one compact menu for the exact locally generated original and derived STL bytes, and supplies deletion/revocation. Build remains visibly locked. The shared orbit/move control is unchanged and passed direct browser interaction.

## Security and privacy boundary

The exact test route is localhost-only. Browser QA blocked all external requests, API requests, and non-read requests and observed zero attempts in every category. The mode never selects a real file, reads private CAD, authenticates an account, subscribes to an upload body, calls a provider, writes storage, dispatches conversion, or requests a download grant.

The generic artifact parser returns the same `ARTIFACT_UNAVAILABLE` result for signed-out, wrong-owner, stale-grant, deleted, and malformed fixtures. It reveals no owner, shop, identifier, filename, byte count, digest, status distinction, or provider detail on denial. The ready screen contains only generated public-safe fixture metadata. The MP4 and screenshots contain no credentials, private names, account identifiers, signed URLs, provider consoles, or private CAD.

The original and STL menu in this mode uses locally generated Blob downloads. Their fixed SHA-256 values are:

- Generated original IGS: `6a33a42c62b839e57244df6412ffdf755aabbeedae372aa9223483bb9611e0f4`
- Derived inspection STL: `d0fa57561304b96d122815cac8ff2b09e56be785dcaadce23d70b63577418150`

This does not qualify owner-authorized durable download grants. Package 3 grant routing and all server-backed artifact access remain absent.

## Browser evidence

The final exported web build was served on loopback and exercised at 320, 390, 768, 855, and 1440 pixels. Every viewport reached Input and ready Design with a WebGL canvas, no horizontal overflow, and zero external/API/write requests. Each authenticated Design check explicitly confirmed that the legacy implementation-readiness action, locked-build explainer, implementation slide, commercialization gates, and readiness details were absent. Desktop QA covered safe failure, unknown outcome, revocation, a new generated-file session, automatic progress, ready Design, reload continuity, orbit/move controls, both exact-byte downloads, and deletion. Mobile QA covered the exclusive sample path, automatic progression, orbit/move, and the compact download menu.

Evidence:

- `docs/evidence/cad-phase5-package6/browser-qa-results.json`
- `docs/evidence/cad-phase5-package6/320-input.png` through `1440-design.png`
- `docs/evidence/cad-phase5-package6/cad-package6-authenticated-import-walkthrough.mp4`

The regenerated and inspected MP4 is H.264/yuv420p, 1280×800, 25 fps, 16.32 seconds, 454,302 bytes, and has SHA-256 `b6eb9787fef8dbe91d191fdd4468a0bcd1096ec2f44535e270f4679fd7d848e9`. Sampled frames and the regenerated desktop/mobile screenshots match the final authenticated source state and contain no implementation-readiness or roadmap action.

## Validation results

- Package 6 focused adapter and boundary suite: 10 passed, 0 failed.
- Combined Package 1-6 focused CAD suite: 207 passed, 0 failed.
- Browser QA: five required responsive widths passed; desktop and mobile journeys passed; exact downloads matched both fixed digests; zero external/API/write attempts; readiness/roadmap controls and explainers were absent at every width.
- TypeScript: passed with no diagnostics.
- Offline web export and accessibility preflight: passed.
- Convex contract manifest: version 80 regenerated and verified across 777 files.
- Convex source audit: 640 files, zero leak-pattern matches; internal-only and runtime-isolation checks passed.
- Convex local SDK/codegen: five files verified with no deployment access.
- Changed-file privacy scan and `git diff --check`: passed.
- MP4 codec, pixel format, dimensions, frame rate, duration, size, checksum, and sampled frames: inspected and playable.

## Human QA disposition and remaining gate

Package 6 Human QA was approved in this thread on 2026-10-10 through Vambah's `proceed`, as interpreted and bound by the Captain to the final privacy-safe MP4 SHA-256 `b6eb9787fef8dbe91d191fdd4468a0bcd1096ec2f44535e270f4679fd7d848e9`. Package 6 is complete within its source-only scope.

This approval advances only the already-defined Phase 5 sequence. It does not authorize Package 7 private CAD, credentials, resource creation, provider/storage/conversion calls, routing, deployment, merge, release, or spending.

Package 7 remains not started and blocked until a separate exact authorization satisfies `docs/cad-phase5-package7-proprietary-igs-authorization-gate.md`.
