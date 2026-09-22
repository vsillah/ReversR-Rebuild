# CAD Internal Admission Exact Opening Decision Packet

Status: exact opening decision drafted; uploads remain disabled  
Base commit: `92db313ed4c3452e98c72ac16bf1bf16e84159f7`

This packet turns the accepted source-only candidate bundle into an exact human decision prompt. It proposes a one-hour UTC window and the exact approval phrase needed before any runtime activation work.

## Proposed Opening

- Cohort: `rrb-ref:cad-upload-internal-mark-test-cohort-v1`
- Starts: `2026-09-22T17:00:00Z`
- Expires: `2026-09-22T18:00:00Z`
- Limits: one concurrent session, one upload attempt, no retry, no second run
- Materials: public, synthetic, or explicitly authorized internal tester CAD only

## Boundary

This packet does not activate production uploads or authorize request body reads. It also does not authorize conversion, Sandbox dispatch, private CAD, real-user commercialization, provider/env/resource/billing changes, secrets, external messages, or any commercial-readiness claim.

## Required Human Gate

Generic `proceed` is not enough for activation. The exact approval phrase in the JSON packet must be explicitly accepted, or a different UTC window must be chosen.

Until then, `POST /api/cad/user-import` remains closed behind `USER_UPLOADS_DISABLED`.
