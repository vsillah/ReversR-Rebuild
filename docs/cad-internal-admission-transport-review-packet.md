# CAD Internal Admission Transport Review Packet

This packet records the transport evidence that must be accepted before any later internal upload-admission opening can be considered. It is source-only and does not change runtime behavior.

## Current State

- `POST /api/cad/user-import` remains closed.
- `BODY_ADMISSION_AUTHORIZED` remains `false`.
- Browser cookie transport and native bearer transport are both documented as not accepted.
- The activation readiness file still has null evidence for browser CSRF and native bearer review.
- The route may still authenticate a session shape, but it cannot read request bodies or accept uploads.

## Browser Cookie Transport

Browser upload admission needs an exact HTTPS origin, the `__Host-reversr-upload-session` cookie, and an `X-Upload-CSRF` token bound to the stored session digest. Wildcard origins are not evidence. Mixed cookie and bearer credentials are rejected.

Still needed before activation:

- accepted exact HTTPS production origin list
- accepted session issuer route and cookie disposition
- accepted CSRF custody and revocation evidence
- accepted rollback receipt proving browser admission closes before request body read

## Native Bearer Transport

Installed-app upload admission needs a `Bearer us1.<opaque-token>` credential whose digest resolves through the server-owned session store. Duplicate authorization headers and mixed cookie/bearer credentials are rejected. Membership and CAD permission must be re-read on every lookup.

Still needed before activation:

- accepted installed-app issuer and refresh provenance
- accepted device install or update custody evidence
- accepted revocation fence for bearer sessions
- accepted rollback receipt proving native admission closes before request body read

## Boundary

This packet does not authorize request body reads, production upload activation, conversion, Sandbox dispatch, store mutation, private CAD, real users, provider/env/resource changes, secrets, external messages, or commercial readiness.

The next useful gate is accepting exact transport evidence inside a later opening bundle review while the production route remains fail-closed.
