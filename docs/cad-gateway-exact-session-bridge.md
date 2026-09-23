# CAD Gateway Exact-Session Bridge

Current source-review binding after PR #380: [current-commit rebind](cad-internal-admission-current-commit-rebind.md). Commit references, observations and proposed windows below remain historical; the rebind does not renew approval.

Status: source-only bridge implementation; production issuance remains blocked by default.

This packet implements a reviewed request-session/principal bridge for the
server-side CAD upload-session gateway. It does not install environment values,
change providers, generate credentials, enable live gateway deployment, mint a
production upload session, read CAD request bodies, activate uploads, dispatch
conversion, or claim commercial readiness.

## Design

`server/cadExactSessionBridge.js` accepts only a narrow, opaque issue context:

- `schemaVersion`
- `cohort`
- `requestRef`
- `shopId`
- optional `loginSessionRef`
- optional `transport`

It rejects request bodies, credentials, user ids, principals, authorization
headers, service tokens, CAD permission claims, arbitrary fields, and upload
credential material. The bridge verifies authority through an injected
`verifyExactSession` function and then projects the result down to the small
authorization grant already accepted by `server/uploadSessionStore.js`.

Refresh uses the exact server-owned upload-session binding:

- `userId`
- `shopId`
- `sessionId`
- `loginSessionId`
- `authMethod`

Any mismatch between the verifier response and that binding returns no usable
grant. Verifier failure is sanitized to `AUTH_UNAVAILABLE`.

## Runtime Boundary

`server/cadUploadSessionGatewayService.js` now accepts an optional
`exactSessionBridge` injection. When no bridge is injected, the existing runtime
behavior is unchanged:

- the gateway can be configured only by the three existing env names,
- no env name selects the bridge,
- upload-session issuance stays disabled,
- lookup refresh still uses the existing gateway `refreshAuthorization` call,
- request body admission remains disabled elsewhere.

This means the bridge can be reviewed and locally tested without creating a live
issuer. A future gate still has to bind the bridge to an accepted production
request-session verifier and install any required runtime values before Mark or
an internal tester can receive a production upload-session credential.

## Guardrails

- No provider, Convex deployment, Vercel environment, billing, or resource
  settings changed.
- No secrets or secret values were generated, stored, printed, or committed.
- No production upload-session issuance was enabled.
- No upload activation or request body admission was enabled.
- No conversion, Sandbox dispatch, private CAD, real-user commercialization, or
  external message was authorized.
- No second run, retry, or commercial-readiness claim is made by this packet.

## Validation

Focused validation for this packet:

```bash
NODE_PATH=./node_modules node --test scripts/cad-gateway-exact-session-bridge.test.js scripts/cad-upload-session-gateway-service.test.js scripts/cad-upload-session-store.test.js
```
