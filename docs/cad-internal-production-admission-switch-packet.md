# CAD Internal Production Admission Switch Packet

Status: source-only switch packet ready, disabled by default  
Base commit: `a68e7d36ddb752df60238fe8b356818c56aef0ad`

This packet defines the next safe shape for production upload admission: a server-owned switch that defaults closed unless every reviewed internal-admission guard is present. It does not mount the switch, read request bodies, enable upload admission, persist files, dispatch conversion, or dispatch Sandbox work.

## Why This Exists

The local CAD preview path is useful for Mark and internal testers, but it is not the same thing as backend production upload. Before production can accept even an internal tester upload body, the route needs a reviewed switch model that answers one question:

Can this exact internal cohort, on this exact route, during this exact window, with this rollback receipt, perform admission-only validation?

If any part is missing, the only valid route decision is still `USER_UPLOADS_DISABLED`.

## Bound Source

- Activation scope: `docs/cad-production-upload-activation-scope.json`
- Activation readiness: `offline/cad-convex/userUploadActivationReadiness.json`
- Run manifest: `docs/cad-upload-activation-run-manifest.json`
- Cost workbook: `docs/cad-per-run-cost-workbook.json`
- Disabled rollback adapter: `offline/cad-convex/disabledUploadAdmissionAdapter.js`
- Durable adapter: `offline/cad-convex/uploadAdmissionDurableAdapter.js`
- Runtime bridge source: `server/cadUploadAdmissionRuntimeBridge.js`
- Mounted route gate: `server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED`

## Required Guards Before The Switch Can Open

- Reviewed runtime implementation commit.
- Exact deployment and route.
- Exact internal cohort and time window.
- Explicit upload activation approval.
- Concurrent session revocation fence.
- Browser CSRF or native bearer transport review.
- Rollback session revocation evidence.
- Retention or deletion disposition.
- Per-run cost evidence and fee readiness.

None of those guards are satisfied by this packet.

## Future Internal Dry-Run Scope

The first production-facing switch should be admission-only. If later approved, it may let a bounded internal cohort submit a public, synthetic, or explicitly authorized internal tester file for server-side body validation and sanitized receipt capture.

It must not create converted CAD output, start a Sandbox job, persist private CAD, create durable reconstruction history, enroll real users, or claim commercial readiness.

## Rollback Shape

Rollback starts by closing the switch before drain. The required terminal route code remains `USER_UPLOADS_DISABLED`. Unknown outcomes stay locked until read-only reconciliation by the original selector proves their disposition.

## What This Packet Authorizes

This packet authorizes source-only docs/tests, local validation, a draft PR, green-check merge, normal Vercel deployment from main, production fail-closed route smoke, and cleanup.

It does not authorize runtime route mounting, request body reads, production upload activation, conversion dispatch, Sandbox dispatch, provider/env/resource changes, store mutation, private CAD, real users, secrets, or external messages.

## Next Recommended Gate

Default-closed runtime switch implementation that is imported by the route but returns `USER_UPLOADS_DISABLED` until exact internal admission approval evidence is present.
