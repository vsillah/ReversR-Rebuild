# CAD production request-session verifier binding path

Status: source implementation for review; production verifier acceptance remains pending.
Base: `445963f6be93e357c4d574cac6ebfa3d0ce3f757` (PR #381).

`server/cadProductionSessionVerifierBinding.js` composes the existing exact-session
bridge with two trusted server dependencies. It captures a bounded, bearer-only
header snapshot in a request-local closure. Request bodies, stream listeners,
profile fields, caller principals and gateway service credentials never supply
login authority. Duplicate authorization headers, mixed cookies and malformed
credentials fail closed. Cookie transport needs a separately reviewed CSRF and
origin contract; this slice does not support it.

The first dependency, `readAuthenticatedSession`, must validate the login token
using the accepted Auth provider and freshly read that exact live login session
and its owner. Its result contains `userId`, `loginSessionId`, `authMethod`,
`active` and `expiresAt`. The second, `readAuthorization`, reads current shop
membership and CAD permission for the independently authenticated identity. Its
result must match that user, login session, auth method and selected shop. Shop
selection is a selector, never proof of membership. Both dependencies must honor
cancellation and return null for denied authority; private exceptions are reduced
to `AUTH_UNAVAILABLE` by the bridge. No denied grant can issue a session.

Every refresh repeats both reads and compares the authenticated identity with the
stored upload-session binding. A different login belonging to the same user
cannot refresh that session. Permission loss survives projection. Expiry is the
minimum of login and authorization expiry, checked again after the reads. No
cached principal or opaque `loginSessionRef` mapping is accepted. The existing
session service supplies its bounded-operation cancellation when composed later;
direct review callers must supply their own operation deadline.

## Source review versus activation

The returned adapter permanently reports `configured: false`, even when
`reviewEnabled: true` and local verifier doubles succeed. It can resolve and
refresh grants for offline source review, but injecting it into the gateway
service cannot enable issuance. There is no issuer route, environment switch,
provider client, network transport or global request registry in this module.
Production entrypoints remain unchanged. Missing dependencies and malformed
request headers leave review methods inert.

The production dependency implementations are **not accepted or installed** by
this change. This is a binding path and an executable acceptance contract, not
proof of production authentication. In particular:

- `convex/librarySession.ts` requires `developmentAuthReviewed` and derives the
  password method only under that isolated deployment's reviewed history. It
  must not be promoted or imported as a production verifier by assumption.
- A future production Auth query must preserve the authenticated user's Convex
  context, obtain user and session IDs from the Auth SDK, point-read the exact
  session and owner, and enforce current expiry, membership and CAD permission.
  Neither supplied IDs nor the gateway's service token replaces that context.
- `convex/cadUploadSessionGateway.ts` remains a closed service-envelope scaffold.
  Its `refreshAuthorization` operation cannot establish user login identity.
  Login credentials must stay on an accepted user-authenticated verifier path,
  never inside the gateway's stored bindings or operation payloads.
- Production acceptance must include verified-provider tests for forged tokens,
  cross-user and same-user/different-login substitution, revocation, expiry,
  permission loss, cancellation and transport handling. Local doubles below do
  not satisfy that gate.

After verifier acceptance, a separate activation review must accept runtime
values and fresh deployment/window evidence and explicitly authorize any issuer
composition change. Body admission remains independently source-closed in
`server/cadUserUploadRouter.js`. Existing opening packets remain historical and
unchanged; this document does not renew their approval or rebind their receipts.

## Validation and boundaries

The focused test uses synthetic local doubles, including throwing body/profile
getters, credential-header ambiguity, substituted identity, stale grants,
cancellation, and a complete synthetic gateway configuration that still cannot
issue. Existing gateway, upload-session, user-route, opening and current-check
tests cover the unchanged admission boundaries. Source audit and contract
manifest include this adapter, its tests and this document.

No provider/environment/resource/billing changes, secret reads, live gateway
deployment, production session issuance, body admission, uploads, conversion,
Sandbox dispatch, private CAD, real-user commercialization, external messages,
second live run or retry occurred. No commercial-readiness claim is made.
Expenses: US$0. Next action: captain source review; next decision gate: acceptance
of a concrete production Auth verifier and separately authorized runtime activation.
