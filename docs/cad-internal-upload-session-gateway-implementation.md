# CAD Internal Upload Session Gateway Implementation

Status: source-only, fail-closed gateway support.

This packet adds server-side support for a future authenticated upload-session gateway between the production Node route and the existing Convex-backed CAD session store contract. It does not install environment values, create secrets, change providers, issue upload sessions, authorize request body reads, activate uploads, dispatch conversion, or claim commercial readiness.

## Runtime Wiring

The production server now builds the `/api/cad/user-import` session service through `server/cadUploadSessionGatewayService.js`.

The service remains fail-closed unless all three values are installed by a separate gate:

- `CAD_UPLOAD_SESSION_GATEWAY_URL`
- `CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN`
- `CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE`

The only accepted audience for this slice is `rrb-ref:cad-upload-internal-mark-test-cohort-v1`.

With no gateway env, partial env, or invalid env, the route behaves as before: upload session lookup is unavailable, body admission stays disabled, and request bodies are not read.

## Scope Boundary

This gate wires verification support only. The session issuer still returns no authorization grant, so production cannot mint upload sessions from this code path. A later explicit approval must define and enable the authenticated issuer before Mark or an internal tester can receive a production upload-session credential.

The follow-on source-only exact-session bridge in
`docs/cad-gateway-exact-session-bridge.md` can be injected by reviewed code or
tests, but it is not selected by environment values. Default production service
construction still has no issuer and still cannot mint upload sessions.

Body admission remains off. Even if a separately configured gateway can verify a pre-existing session, `/api/cad/user-import` remains behind the disabled body-admission gate until a separate production upload activation approval changes that behavior.

## Guardrails

- No provider, Convex deployment, Vercel environment, billing, or resource settings changed.
- No secret values were generated, stored, printed, or committed.
- No upload body admission was enabled.
- No conversion or Sandbox dispatch path was enabled.
- No private CAD, real-user commercialization, external messages, retry, or second run were authorized.

See `docs/cad-internal-upload-session-gateway-implementation.json` for the exact env-name manifest and source bindings.
