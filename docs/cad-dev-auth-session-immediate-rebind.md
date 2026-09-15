# CAD development Auth/session immediate rebind

Base: `199c6c8ebe444d614728735d53c1685bc12073f0`, after PR #243.
Branch: `codex/cad-dev-auth-session-immediate-rebind`.
Status: source-only rebind for one near-term Convex development Auth/session
qualification window. This packet does not run the qualification.

## Bound Window

The bridge is rebound to `cad-dev-auth-session-qualification-1925z` from
`2026-09-15T19:25:00Z` through `2026-09-15T19:40:00Z`.

The source binding contains only these authority values:

- run-key SHA-256 `b471ba4b7632d9f454dbcd0234598e47b59147481b06e7807c356f8c8d081ef9`
- accepted projection SHA-256 `66df783b8d32d30689ae604496b83d27667fc88829298d79cf9df1713b579f8e`
- acceptance receipt SHA-256 `872aac5716d79027e1d6b8c7c772a933e67a9a9ef882a104575eb1bf17cda4fe`

The run key and synthetic passwords remain only in ignored local artifacts under
`.local/cad-convex/dev-auth-session-immediate-rebind`, with directory mode
`700` and file mode `600`. The private register digest is
`9fbce1f0c4909d62abfd207c329171349e7a2692b3a01282528bd658ac5e3538`.

## Run Shape

The later live step may execute only the already-reviewed development Auth/session
bridge against `reversr-cad-auth-dev` deployment `majestic-alligator-31`.

Allowed operations for that later step are:

1. Provision the two fixed `auth-test.invalid` Password identities.
2. Sign in both synthetic identities.
3. Read exact server-authenticated sessions.
4. Sign out one current session.
5. Revoke sessions for both run-owned users without deleting users or accounts.
6. Write sanitized local evidence and a local receipt.

CAD uploads, CAD conversion, private CAD, real users, provider/resource changes,
usage/billing changes, production mutation, Sandbox dispatch, external messages,
automatic retry and second runs remain outside this rebind.

## Validation

```sh
node --test scripts/cad-dev-auth-session-qualification-rebind.test.js
node --test scripts/cad-dev-auth-session-qualification-bridge.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Next

After merge and production fail-closed smoke, autopilot may push the reviewed
source to Convex development and execute exactly one bounded development
Auth/session qualification during the accepted UTC window. Any unknown outcome,
failed smoke, retry need, second run, private CAD, production activation, upload
activation or conversion still hard-stops.
