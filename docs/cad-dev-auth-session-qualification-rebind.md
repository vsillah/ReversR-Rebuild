# CAD development Auth/session qualification rebind

Base: `ab35e48cf5bdc8e5574e31eda7ff7ea433211a6e`, after PR #242.
Branch: `codex/cad-dev-auth-session-qualification-rebind`.
Status: source-only rebind for one future Convex development Auth/session
qualification window. This packet does not run the qualification.

## Bound Window

The bridge is rebound to `cad-dev-auth-session-qualification-1800z` from
`2026-09-15T18:00:00Z` through `2026-09-15T18:15:00Z`.

The source binding contains only these authority values:

- run-key SHA-256 `63420aebb6c6b6b1db74c731191deb99aa0d6f62e6594560bf7ba7f9d0e550e1`
- accepted projection SHA-256 `d6c7a2e2d888c7600a98151cc615a2b4ae81127c079eb1561b179c03e0eabf56`
- acceptance receipt SHA-256 `77b714d03fbb365eb6e28de1456f64da817762afa6a82d0d2e8715886d4727d5`

The run key and synthetic passwords remain only in ignored local artifacts under
`.local/cad-convex/dev-auth-session-qualification-rebind`, with directory mode
`700` and file mode `600`.

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
