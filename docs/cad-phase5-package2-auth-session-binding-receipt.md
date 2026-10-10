# Phase 5 Package 2 authentication-session binding receipt

Status: validated source-only; issuance is unrouted and all live capability remains disabled.

Base commit: `a30c11cb56dba945b8d59d06787fa99b7ead4a03`

## Bound decision

Package 2 uses web-only transport. The candidate binding accepts an existing HTTPS application request, snapshots only its Cookie and Origin headers, and delegates identity proof to a server-owned Convex Auth reader. The authoritative model is the exact `authSessions` login plus fresh user authority and exact shop-membership/CAD-entitlement reads. Native bearer issuance is outside this package.

The upload session lifetime is capped at 15 minutes and can never outlive the verified login or authorization evidence. Logout or login deletion, login expiry, user disablement, shop mismatch, membership removal, CAD permission removal, user-generation change, membership-generation change, and explicit revocation all deny the session on its next use. No positive authorization cache exists.

## Source result

- `server/cadConvexAuthWebSessionBinding.js` adds a closed-by-default source candidate. It has no route, environment selector, provider client, bootstrap import, or default instance. Its public state remains `configured: false` and `issuanceRouted: false` even when a test or future server-owned assembly injects every dependency.
- The candidate rejects bearer input and ambiguous Cookie or Origin headers. It accepts only exact allowlisted HTTPS origins, issues a `__Host-` cookie with `Secure`, `HttpOnly`, `Path=/`, and `SameSite=Strict`, and retains the independent session-bound CSRF requirement already enforced by `server/uploadSession.js`.
- Only a credential digest reaches the store. Raw login cookies stay inside the request-local server callback, and the issued raw upload credential appears only in the required `Set-Cookie` value. It is not returned as a separately named credential or session identifier.
- Every lookup refreshes the exact login and current CAD authorization. Revoked and expired rows are projected as denial at the web binding boundary.
- `server/uploadSessionStore.js` now propagates caller cancellation into bounded issuance. `server/convexUploadSessionStore.js` exposes the exact authority-model identifier required by the binding.
- The source-only Convex loader now understands the existing controlled-upload schema dependency and `commitTs` validator so the authentication assembly test exercises the current combined schema instead of a stale subset.
- The generated current-source acceptance packet was rebound to the changed session-store digest. It still records every production verifier, issuance, body-admission, runtime, provider, deployment, conversion, Sandbox, private-CAD, retry, and commercialization authority as false.

## Acceptance evidence

The focused suite covers authenticated issuance, the 15-minute/login-expiry cap, cross-instance refresh, logout and login deletion, login expiry, user disablement, membership and permission removal, user and membership generations, explicit revocation, user/login/shop substitution, duplicate headers, bearer rejection, Origin and CSRF denial, cancellation, timeout, sanitized failures, and route/body-gate closure.

The implementation does not import or inspect a body stream. `BODY_ADMISSION_AUTHORIZED` remains false, `CAD_USER_IMPORT_ENABLED` remains false, and no issuer route exists. No provider request, environment change, storage write, conversion, private CAD access, deployment, external message, commit, push, or pull request occurred.

Validation results:

- Package 2 focused authentication/session tests: 65 passed, 0 failed.
- Combined Package 1-2 focused CAD tests: 128 passed, 0 failed.
- TypeScript: passed with no diagnostics.
- Convex contract manifest: regenerated and verified across 755 files.
- Convex source audit: 640 files, zero leak-pattern matches; internal-only and runtime-isolation checks passed.
- Convex local SDK/codegen: five files verified with no deployment access.
- Exact-lock dependency inventory: passed.
- Changed-file privacy and whitespace scan: 13 files, zero absolute user paths, private keys, secret-like values, bearer literals, CAD-data markers, or trailing whitespace.

## Rollback and next gate

Rollback is source-local: remove the candidate binding and its tests, remove the authority-model marker, and revert caller-signal propagation. Because issuance is not routed, no deployed session or data cleanup is created by this package.

Package 3 may begin only after the Captain chooses private object custody, region, retention, deletion service level, backup/log disposition, enforceable cost ceiling, incident owner, and original-file retention policy. Package 3 must remain server-only and source-disabled until separately reviewed.
