# CAD Internal Admission Evidence Binding

Status: evidence binding ready, switch still disabled  
Base commit: `f1901fd04cc1e323391d872f5d8f508e0d552f2e`

This packet binds the default-closed CAD upload admission switch to the exact evidence slots that must be filled before any future internal production upload opening. It does not fill those slots, open the route, read request bodies, persist CAD files, dispatch conversion, dispatch Sandbox work, or create reconstruction history.

## Why This Exists

The route now has a server-owned switch, but that alone is not enough to upload through production. This packet prevents the next failure mode: treating "a switch exists" as "upload is ready."

Before the switch can open, a future bundle must prove the exact commit, deployment, route, internal cohort, time window, transport, rollback, retention, and cost evidence. Until that bundle exists and is separately approved, the only valid production route outcome is still `USER_UPLOADS_DISABLED`.

## Bound Sources

- Default-closed switch packet: `docs/cad-default-closed-admission-switch.json`
- Switch source: `server/cadInternalProductionAdmissionSwitch.js`
- Route gate: `server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED`
- Activation readiness: `offline/cad-convex/userUploadActivationReadiness.json`
- Run manifest: `docs/cad-upload-activation-run-manifest.json`
- Cost workbook: `docs/cad-per-run-cost-workbook.json`

## Evidence Slots Still Missing

- Reviewed runtime implementation commit.
- Exact production deployment and route.
- Exact internal cohort and activation window.
- Explicit upload activation approval.
- Concurrent session revocation fence.
- Browser CSRF or native bearer transport review.
- Rollback session revocation evidence.
- Retention or deletion disposition.
- Durable private-file lockout evidence.
- Separate environment deployment and test approvals.
- Per-run cost and fee evidence.
- Separate conversion and Sandbox approval.

None of these slots are satisfied by this packet.

## Future Opening Boundary

The first future opening may only be an admission-only internal upload body validation for public, synthetic, or explicitly authorized internal tester CAD. It still must not convert CAD, start Sandbox jobs, persist private CAD, create durable reconstruction history, enroll real users, or claim commercial readiness.

## What This Packet Authorizes

This packet authorizes source-only docs/tests, local validation, a draft PR, green-check merge, normal Vercel deployment from main, production fail-closed route smoke, and cleanup.

It does not authorize request body reads, production upload activation, conversion dispatch, Sandbox dispatch, provider/env/resource changes, store mutation, private CAD, real users, secrets, or external messages.

## Next Recommended Gate

Build a source-only guarded switch opening bundle generator and checker that remains disabled by default and proves whether every required evidence slot is present before any separate activation request.
