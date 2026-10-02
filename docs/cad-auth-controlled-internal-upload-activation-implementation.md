# CAD Auth controlled internal upload activation deployed startup wiring repair

Status: source-only deployed startup wiring repair ready for review. This packet does not activate production uploads.

This gate wires the disabled-by-default controlled upload activation source path into the deployed startup/default route path for Phase 7. It keeps `POST /api/cad/user-import` closed by default while proving that a later exact live activation approval can reach the reviewed manifest and route-body-gate mount from server-owned source.

## Bound stop disposition

- Stopped disposition: `82bfbfce410ff148e45b1b17a3b28e5eb58ecfb072c97f036eb474a8e5803395`
- Approved controlled activation refresh: `7ce4c01d627f251606ad72cf128281391a00e836de6523c9f794bf5f3d5fbcf2`
- Stopped reason: controlled activation source existed, but it was not mounted into the deployed startup/default route path.
- Stopped credential handling: digest verified; credential value was not printed.
- Stopped production body admission: not attempted.
- Post-stop smoke: `401 USER_SESSION_REQUIRED`

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

`server/cadProductionExecutableRuntimeMountCompletion.js` now wraps the existing production live-opening runtime mount with `createCadControlledInternalUploadActivationMount()` before handing it to `server/cadUserUploadRouter.js`. The default mount remains closed because `CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED` is still `false` and no enabled manifest or adapter is supplied by startup source.

The startup path can therefore resolve the controlled activation body-gate interface from deployed source, but it still cannot authorize a request-body read unless a later explicit gate lands exact reviewed values, merges, deploys, passes fail-closed smoke, and supplies the bounded live activation approval.

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

The next gate is a post-merge deployment rebind refresh. It must prove the deployed startup path is wired to the controlled activation mount, remains default-closed, preserves the IGES-only validator envelope, and can still derive the exact later controlled activation approval phrase without runtime activation. It must not read request bodies except the fail-closed smoke, must not read private credentials, and must not activate uploads.
