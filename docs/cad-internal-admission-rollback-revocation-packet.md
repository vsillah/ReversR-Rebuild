# CAD Internal Admission Rollback Revocation Packet

This packet records the source-backed rollback and session-revocation guarantees that support a future internal upload-admission opening. It is not an accepted rollback receipt and does not open `POST /api/cad/user-import`.

## Current State

- `BODY_ADMISSION_AUTHORIZED` remains `false`.
- The route remains closed with `USER_UPLOADS_DISABLED` before request body validation.
- The readiness slots for rollback session revocation and concurrent revocation fence remain unaccepted.
- No production sessions were issued, revoked or tested by this packet.

## Source Guarantees

- Known session digests can be revoked without deleting retained state.
- Revoked records verify as `SESSION_REVOKED`.
- Session lookup re-reads authoritative state on every call; there is no positive cache.
- Login, membership and CAD permission changes deny without stale grants.
- Development issuer sessions can reach the upload route, but admission still terminates as `USER_UPLOADS_DISABLED`.

## Still Needed

- accepted rollback receipt for the exact production deployment and route
- accepted revocation receipt for the exact internal cohort/window session set
- accepted concurrent-client fence proving revocation wins before request body read
- accepted post-rollback production fail-closed smoke receipt
- accepted retained-state disposition that forbids deletion without separate review

## Boundary

This packet does not authorize request body reads, production upload activation, conversion, Sandbox dispatch, store mutation, private CAD, real users, provider/env/resource changes, secrets, external messages or commercial readiness.

The next source-only gate is the retained-state disposition and private-register lockout packet.
