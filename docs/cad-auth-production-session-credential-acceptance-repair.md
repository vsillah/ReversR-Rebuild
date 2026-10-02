# CAD Auth Production Session Credential Acceptance Repair

Roadmap: 5/6 complete. This source-only repair addresses the Step 6 blocker
observed at `2026-10-02T02:36:11Z`: the approved private bearer credential
digest had been verified locally, but production returned `401
USER_SESSION_REQUIRED` before the request reached the expected admitted
validation terminal.

## Repair

- Preserve the default production fail-closed route.
- Do not issue upload sessions, activate uploads, read request bodies, run
  conversion, dispatch Sandbox, or expose private credential values.
- Treat the bearer credential suffix as an opaque 43-character URL-safe lookup
  secret. Future issuer-generated credentials can still use canonical unpadded
  base64url bytes, but the verifier must not reject a reviewed private custody
  credential before its SHA-256 can be checked against the source-owned session
  service.
- Keep the authoritative session service digest-bound: only
  `sha256(fullCredential)` reaches `lookupSession`.

## Bound Stop

- Stopped live-opening attempt: `2026-10-02T02:36:11Z`
- Production response: `401 USER_SESSION_REQUIRED`
- Expected terminal after source-owned session acceptance: `503
  USER_UPLOADS_DISABLED`
- Main commit: `753763b30a87027a8d40b6498e4dc50303f70ec1`
- Generated private credential digest:
  `76c7cb47f616bc2e6a1ca99ad35d534d5c0cdaaba460f26717d79e100d90d87e`

## Next Gate

After merge, deployment, and fail-closed smoke, run the post-merge rebind refresh
to verify the deployed verifier/session-service path accepts the exact opaque
digest-bound credential shape without runtime activation. A later explicit
live-opening gate is still required before any credential read or production
request.
