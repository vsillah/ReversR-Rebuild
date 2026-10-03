# CAD Auth controlled upload digest drift repair

Status: source-only controlled upload digest repair ready for review. This packet does not activate production uploads.

The bounded controlled upload activation on `2026-10-03T04:30:00Z` reached the expected disabled terminal `503 USER_UPLOADS_DISABLED`, emitted observable validation and rollback headers, and passed post-rollback fail-closed smoke. The run still stopped because the emitted command-card and installation SHA-256 values did not match the approval-bound values.

## Stopped result

- Attempt observed at: `2026-10-03T04:31:50Z`
- Terminal code: `USER_UPLOADS_DISABLED`
- Observed command-card SHA-256: `ff66a1b3800b1f1e720b45005ad2ed2035d3c3bf275ee8ade34c7e0d54cb0641`
- Observed installation SHA-256: `396b71444fc08db82c613983ba7b7288737c6ebbf5fa09e9b59056369302de08`
- Post-rollback fail-closed smoke: passed

## Repair

The deployed route was able to perform the controlled body-admission validation and rollback, but the controlled activation manifest could derive its digest identity from a provider deployment id. The approval phrase bound the source-owned deployment reference:

`vercel-target:reversr-9hllbtpnc-vsillahs-projects.vercel.app@f42c2d8a4f489856582aa33962b795f78f610fc3`

`server/cadControlledUploadDigestDriftRepair.js` now normalizes eligible Vercel system metadata to that source-owned target-and-commit reference before creating the controlled activation manifest. Provider deployment ids remain provenance only; they do not drive the command-card or installation digest identity for the controlled activation proof.

## Safety properties

- Default production remains fail-closed.
- No upload-session issuance is authorized.
- No production upload activation is authorized.
- No request-body admission or read is authorized outside a later exact live activation gate.
- No conversion, Sandbox dispatch, private CAD use, external messages, retry, second live run, real-user commercialization, or commercial-readiness claim is authorized.
- Observable proof headers may appear only after the controlled gate opens, the IGES validator accepts the one approved body, and post-rollback fail-closed smoke passes.

## Expected rebound proof

- Opening window: `2026-10-03T04:30:00Z` through `2026-10-03T05:00:00Z`
- Command-card SHA-256: `1ea310dd9d368b24982c39b9389ec34db1ae4838d0e51926800cc1b788fead04`
- Installation SHA-256: `239286c275c253c58580a86046cdb783eb76cdfc0134f272183f5cb9e791b830`

## Next gate

After this repair is reviewed, merged, deployed, and fail-closed smoked, the next gate is a source-only/no-live post-merge rebind refresh. It must verify the deployed startup route path resolves the observable controlled body-admission proof headers from reviewed source, recompute the current deployment binding, controlled activation manifest digest, command-card SHA-256, installation SHA-256, a fresh UTC activation window, and return the exact later live activation approval phrase without runtime activation.
