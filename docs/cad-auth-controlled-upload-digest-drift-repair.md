# CAD Auth controlled upload digest drift repair

Status: source digest binding preserved; runtime blocked by the missing reviewed durable host. See [corrective repair](cad-auth-controlled-upload-durable-fence-repair.md).

The earlier packet recorded observable validation and rollback headers at `2026-10-03T04:31:50Z`. Those headers are not evidence of durable rollback or an independently executed smoke: the source adapter fabricated receipts from process-local Sets. Historical smoke and durability claims are unverified.

## Stopped result

- Attempt observed at: `2026-10-03T04:31:50Z`
- Terminal code: `USER_UPLOADS_DISABLED`
- Observed command-card SHA-256: `ff66a1b3800b1f1e720b45005ad2ed2035d3c3bf275ee8ade34c7e0d54cb0641`
- Observed installation SHA-256: `396b71444fc08db82c613983ba7b7288737c6ebbf5fa09e9b59056369302de08`
- Historical post-rollback smoke claim: unverified; adapter receipt was fabricated

## Repair

The earlier controlled activation manifest could derive its digest identity from a provider deployment id. Durable rollback was not established. The approval phrase bound the source-owned deployment reference:

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

The source gate is unconditionally closed. Review the durable host requirements in the corrective repair before proposing any runtime integration. Deployment, production smoke, credential reads, session issuance, command-card issuance and activation are outside this local repair. No later activation phrase is issued here.
