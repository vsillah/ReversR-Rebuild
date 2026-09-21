# CAD Internal Admission Candidate Opening Bundle

Status: candidate ready for separate human review; uploads remain disabled  
Base commit: `0c8f676d9eeedb188db94223f6b46c52167c1295`

This packet fills the opening-bundle structure with sanitized evidence references so the bundle can be reviewed at a human gate. It is not an activation packet and it does not change the runtime route.

## What This Establishes

- The candidate names the current reviewed `main` commit and production route.
- The candidate names the internal Mark test cohort, but the exact UTC window still has to be accepted at the human gate.
- The candidate includes transport, revocation, retention, private-register lockout, deployment/test split, cost, and conversion/Sandbox split references.
- The local checker can treat the candidate as structurally ready for separate activation review.

## What It Does Not Do

- It does not accept the human approval phrase.
- It does not authorize request body reads.
- It does not activate production uploads.
- It does not authorize conversion, Sandbox dispatch, private CAD, real users, provider/env/resource/billing changes, store mutation, secrets, external messages, or commercial-readiness claims.

## Current Runtime Boundary

`POST /api/cad/user-import` remains behind the default-closed switch. The latest production smoke for `qa=0c8f676` stayed fail-closed:

- `GET /` returned `200`.
- `GET /api/cad/capabilities` returned `200`.
- Empty `POST /api/cad/user-import` returned `401 USER_SESSION_REQUIRED`.
- Empty `POST /api/cad/import` returned `401 UNAUTHORIZED`.
- `GET /api/cad/import-source-record` returned `404`.

## Next Human Gate

The next decision is whether to accept a bounded internal production upload-admission opening for this exact candidate bundle. That future approval must name the exact commit, route, cohort, UTC window, rollback, retention, lockout, transport, cost evidence, and post-rollback fail-closed smoke requirement. Until that happens, the only valid route outcome remains closed.
