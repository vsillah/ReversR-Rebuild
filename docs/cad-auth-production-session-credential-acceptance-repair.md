# CAD Auth Production Session Credential Acceptance Repair

Roadmap: 5/6 complete. This source-only repair addresses the Step 6.6 blocker
observed at `2026-10-02T11:02:05Z`: the approved private bearer credential
digest had been verified locally, but production returned `401
USER_SESSION_REQUIRED` instead of the expected default-closed admitted terminal
`503 USER_UPLOADS_DISABLED`.

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
- Resolve the source-owned live-opening session service at request lookup time
  instead of capturing the active window once during `server/index.js` startup.
  A warm production instance that first handled fail-closed smoke before the
  approved live window can otherwise retain a stale window and reject the exact
  approved digest before the body gate.
- Keep issuance, revocation, body admission, runtime activation, conversion, and
  Sandbox dispatch closed.

## Bound Stop

- Stopped live-opening attempt: `2026-10-02T11:02:05Z`
- Production response: `401 USER_SESSION_REQUIRED`
- Expected terminal after source-owned session acceptance: `503
  USER_UPLOADS_DISABLED`
- Main commit: `8b8b47b67b2a39ec3353121aa5c832262469c92e`
- Production target:
  `https://reversr-h4t9buhmx-vsillahs-projects.vercel.app`
- Generated private credential digest:
  `76c7cb47f616bc2e6a1ca99ad35d534d5c0cdaaba460f26717d79e100d90d87e`
- Reviewed command-card SHA-256:
  `763557c340d37e3739d6258344c672662e877b28519c7ea6f4d9860b14c75e47`
- Installation SHA-256:
  `701778ecaa3fed5eab9cc6b6075faa4ab06034a6e6127b127e87b0175be1cd21`
- Reviewed window: `2026-10-02T11:00:00Z` to `2026-10-02T11:30:00Z`

## Next Gate

After merge, deployment, and fail-closed smoke, run the post-merge rebind refresh
to verify the deployed verifier/session-service path accepts the exact opaque
digest-bound credential through request-time active-window resolution without
runtime activation. A later explicit live-opening gate is still required before
any credential read or production request.
