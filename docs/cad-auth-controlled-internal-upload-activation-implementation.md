# CAD Auth controlled internal upload activation implementation

Status: source-only implementation ready for review. This packet does not activate production uploads.

This gate installs a disabled-by-default controlled upload activation source path for Phase 7. It keeps `POST /api/cad/user-import` closed by default while preparing a reviewed manifest and route-body-gate mount for a later exact live activation approval.

## Bound production decision

- Main commit: `66c7ad1e23bf68316dd350c79d0324ad61e67dd2`
- Decision packet: `d73f177fff7d814e644f161a5039e062ada065e92be3fe303ac041738646fd71`
- Decision source commit: `3dc4c72959a0d060eec6e71a11c9e8aa53cc54c3`
- Post-merge decision rebind refresh: `1a3d5da0a9c7e21f5d58445510018c7c8913402696f6ff50d8239e1727b2bca3`
- Current production deployment binding: `5241aa6217768e86ce76665f94f1af4b97125a903ff5eef6bdbc6031b2984f18`
- Production deployment: `6811229679`
- Production target: `https://reversr-2bbhn3jbb-vsillahs-projects.vercel.app`
- Production alias: `https://reversr.vercel.app`
- Fail-closed smoke: `401 USER_SESSION_REQUIRED` observed before `2026-10-02T15:09:45Z`

## Implemented source path

`server/cadControlledInternalUploadActivation.js` defines a manifest-driven runtime mount with:

- default `CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED = false`,
- exact current-production deployment reference binding,
- exact command-card bytes and SHA-256 binding,
- exact installation SHA-256 binding,
- one cohort and one session ref,
- one upload attempt and no retry,
- independent expiry checks before every forward effect,
- rollback armed before body admission opens,
- post-rollback empty unauthenticated fail-closed smoke requirement,
- sanitized receipts that reject CAD bytes, request bodies, credentials, and private file names,
- conversion, Sandbox dispatch, durable project history, private CAD, external messages, real-user commercialization, and commercial-readiness claim all closed.

The module is not mounted into production by this gate. It can only authorize body-read locally when a caller explicitly supplies an enabled manifest, exact current deployment reference, complete adapter receipts, a valid session principal, and an active approved window. The default export path remains closed.

## Validator envelope

The controlled activation path preserves the current IGES-only request envelope:

- container: `application/json`
- payload keys: `contentBase64`, `fileName`, `mimeType`
- mime types: `model/iges`, `application/iges`, `application/octet-stream`
- file extensions: `.igs`, `.iges`
- decoded source limit: `262144`
- JSON request limit: `393216`
- timeout: `10000`
- STEP/STP: not authorized
- external references: not authorized

## Later gate

The next gate is a post-merge deployment rebind refresh. It must prove the deployed source remains default-closed and can still derive the manifest-driven controlled activation path without runtime activation. It must not read request bodies except the fail-closed smoke, must not read private credentials, and must not activate uploads.
