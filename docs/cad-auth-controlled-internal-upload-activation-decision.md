# CAD Auth controlled internal upload activation decision

This packet opens Phase 7 as a controlled internal upload activation decision lane. It does not activate production uploads.

Phase 6 is closed for bounded admission-path validation: the credentialed live-opening attempt reached the expected `USER_UPLOADS_DISABLED` terminal, and the post-rollback empty unauthenticated smoke returned `USER_SESSION_REQUIRED`. That proves the protected route can be reached by the reviewed session path while production remains default-closed.

Phase 7 is narrower than productization. The next useful gate is a reviewed source-owned body-admission control for one internal cohort, one exact UTC window, one session, and one upload attempt. It must still exclude conversion, Sandbox dispatch, durable project history, private CAD, real users, external messages, and commercial-readiness claims.

## Current route boundary

- Route: `POST /api/cad/user-import`.
- Current default: `BODY_ADMISSION_AUTHORIZED = false`.
- Unauthenticated default terminal: `401 USER_SESSION_REQUIRED`.
- Credentialed disabled terminal: `503 USER_UPLOADS_DISABLED`.
- Current admission validator accepts only JSON-wrapped IGES content with `contentBase64`, `fileName`, and `mimeType`.
- Current source limits remain 256 KiB for decoded source and 384 KiB for the JSON request.
- STEP/STP is not part of this activation decision.

## Controlled internal activation decision

The later activation gate may only attempt admission/body validation for public synthetic CAD or explicitly authorized internal tester CAD. It may not store body bytes, record private file names, dispatch conversion, dispatch Sandbox, mutate durable project history, or expose any real-user upload surface.

The later gate must bind:

- exact current production deployment reference,
- exact command-card bytes and SHA-256,
- exact installation SHA-256,
- bounded session and cohort refs,
- private credential digest without public credential disclosure,
- one-session and one-attempt durable fence,
- independent expiry checks before every effect,
- rollback-first controls before opening body admission,
- post-rollback empty unauthenticated fail-closed smoke,
- sanitized admission receipt only.

## Productization remains separate

Phase 7 is not the last gate before productization. Productization still needs separate decisions and evidence for conversion, Sandbox execution, retention and deletion, private-CAD handling, abuse controls, cost and fee readiness, user-facing UX, monitoring, support, and commercial readiness.
