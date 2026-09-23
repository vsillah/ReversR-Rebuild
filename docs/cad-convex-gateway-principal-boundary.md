# CAD Convex Gateway Principal Boundary

Status: source-only boundary packet; live dispatch remains blocked.

This packet records the next important CAD upload-session gateway boundary after
the fail-closed Convex HTTP scaffold. The gateway can authenticate a server-owned
service envelope, but it must not treat that service token, a request payload, or
a stored upload-session row as the user's exact Convex Auth session.

## What This Establishes

- `POST /cad/upload-session-gateway` still authenticates the service envelope and
  rejects client-supplied principal, authorization, credential, secret and token
  fields.
- The server gateway service still cannot issue upload sessions because its
  production issuer returns no authorization grant.
- The actual Convex CAD functions still require an internal principal and exact
  session liveness. Policy mutation remains outside the gateway allowlist.
- The offline dispatcher model has the fixed operation map we want later, but it
  is not production wiring and it depends on a trusted request-session context
  that the current service-token HTTP action does not carry.

## Why Dispatch Is Still Blocked

The current Convex Auth boundary reads the verified user and exact auth-session
identity from Convex's authenticated function context. A service-token HTTP call
from the production Node route authenticates the server, not the user. That is
necessary for the server-to-Convex hop, but it is not sufficient for upload
session issuance or refresh.

Before the gateway can dispatch to `internal.cad.*`, we need an accepted bridge
that proves the request is tied to the same authenticated user, login session,
shop membership and CAD upload permission at the time of issuance or refresh.
That bridge also has to handle logout, upload-session revocation, permission loss
and rollback without trusting caller-supplied claims.

## Preserved Authority

This packet does not:

- install environment values,
- generate or store secrets,
- enable upload-session issuance,
- read request bodies,
- activate production uploads,
- dispatch conversion or Sandbox work,
- use private CAD,
- expose real users,
- send external messages,
- or claim commercial readiness.

## Next Gate

The next implementation gate should choose one exact session bridge. Acceptable
options include a reviewed request-session handoff that preserves Convex Auth
context, or a server-owned verification design that independently proves the
same user, login session, shop membership and CAD permission without accepting
payload principal claims.

That next gate should remain separate from production upload activation. Even
after gateway dispatch is source-ready, body admission and conversion still need
their own bounded approvals, rollback receipts and fail-closed smokes.

## Validation

Focused validation for this packet:

```bash
NODE_PATH=./node_modules node --test scripts/cad-convex-gateway-principal-boundary.test.js scripts/cad-convex-http-gateway-scaffold.test.js scripts/cad-upload-session-gateway-service.test.js
```
