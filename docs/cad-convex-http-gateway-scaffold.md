# CAD Convex HTTP Gateway Scaffold

Status: source-only, fail-closed Convex HTTP endpoint scaffold.

This packet adds the Convex-side HTTP action that the existing server-owned CAD upload-session gateway client can call in a later gate. It does not install environment values, generate or store secrets, issue upload sessions, activate request body admission, dispatch conversion, call Sandbox, use private CAD, expose real users, or claim commercial readiness.

## Route

The source route is:

- `POST /cad/upload-session-gateway`

The endpoint lives in `convex/cadUploadSessionGateway.ts` and is mounted from `convex/http.ts`.

## Runtime Boundary

The endpoint is inert unless both Convex env values are present and valid:

- `CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE`
- `CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN_SHA256`

The only accepted audience is `rrb-ref:cad-upload-internal-mark-test-cohort-v1`. The token value itself is not stored or committed; the Convex endpoint expects only a lowercase SHA-256 digest.

The request body is not read until the route has:

1. confirmed the route method is `POST`,
2. confirmed all gateway env values are present and scoped, and
3. authenticated the `Authorization: Bearer ...` service token against the stored hash.

After authentication, the endpoint validates only a small JSON gateway envelope with:

- `schemaVersion: 1`
- the approved audience
- one of `insertIfAbsent`, `read`, `revoke`, or `refreshAuthorization`
- a payload with a valid `deadlineAt`

Client-supplied principals, credentials, authorization objects, secrets, and token fields are rejected.

## Deliberate Fail-Closed Behavior

Internal Convex dispatch is still disabled in this slice. A valid service request returns `AUTH_UNAVAILABLE` instead of calling the internal CAD functions.

That means this PR can ship the source route without enabling:

- upload-session issuance,
- request body admission,
- CAD upload activation,
- conversion or Sandbox dispatch,
- private CAD handling,
- real-user commercialization.

## Next Gate

A later explicit gate must approve all of the following before live use:

1. installing the exact Convex env values,
2. proving the server and Convex token custody path,
3. defining exact principal derivation for the gateway,
4. enabling bounded internal dispatch to existing `convex/cad.ts` internal functions,
5. running production fail-closed smoke before and after rollback.

Until that gate lands, this route remains a tested scaffold only.

## Validation

Focused validation for this packet:

```bash
NODE_PATH=./node_modules node --test scripts/cad-convex-http-gateway-scaffold.test.js scripts/cad-convex-auth-assembly.test.js
```
